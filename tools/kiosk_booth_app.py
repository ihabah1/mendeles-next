# -*- coding: utf-8 -*-
"""
kiosk_booth_app.py — תוכנת דוכן Mandeles (מתוקן)
==================================================
העתק לתיקיית servers/ והרץ:
    pip install requests pillow pywin32
    python kiosk_booth_app.py

קבצים באותה תיקייה:
    kiosk_config.json   — נוצר אוטומטית
    pais-form-cells.json — קואורדינטות טופס (העתק מ-tools/)
    kiosk.log
"""
from __future__ import annotations

import base64
import io
import json
import logging
import os
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path


def _ensure_deps() -> None:
    for mod, pkg in [("PIL", "Pillow"), ("requests", "requests"), ("win32print", "pywin32")]:
        try:
            __import__(mod)
        except ImportError:
            subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])


_ensure_deps()

import tkinter as tk
from tkinter import messagebox, ttk

import requests
import win32con
import win32print
import win32ui
from PIL import Image, ImageDraw, ImageFont, ImageWin

# ── הגדרות ──────────────────────────────────────────────────
SITE_URL = "https://mendeles-next-production.up.railway.app"
BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "kiosk_config.json"
COORDS_FILE = BASE_DIR / "pais-form-cells.json"
VERSION = "2.0"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(message)s",
    handlers=[
        logging.FileHandler(BASE_DIR / "kiosk.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("kiosk")

BG = "#f2ede6"
NAVY = "#1c1208"
GOLD = "#c9a030"
GREEN = "#1c8040"
RED = "#c01820"
MUTED = "#9a8878"
FB = ("Segoe UI", 11)
FBB = ("Segoe UI", 13, "bold")


# ════════════════════════════════════════════════════════════
# API
# ════════════════════════════════════════════════════════════
def django_api_base(site_url: str) -> str:
    base = (site_url or "").rstrip("/")
    return base if base.endswith("/django-api") else f"{base}/django-api"


def load_config() -> dict:
    defaults = {"site": SITE_URL, "email": "", "api_key": ""}
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return {**defaults, **data}
    except OSError:
        return dict(defaults)


def save_config(cfg: dict) -> None:
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def kiosk_login(site_url: str, email: str, password: str) -> dict:
    r = requests.post(
        f"{django_api_base(site_url)}/kiosk/login/",
        json={"email": email.strip(), "password": password},
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    if not r.ok:
        body = r.json() if "application/json" in r.headers.get("content-type", "") else {}
        raise RuntimeError(body.get("detail") or body.get("error") or f"שגיאה {r.status_code}")
    return r.json()


class KioskAPI:
    def __init__(self, site_url: str, api_key: str):
        self.base = django_api_base(site_url)
        self.key = (api_key or "").strip()

    def _headers(self) -> dict[str, str]:
        return {"x-api-key": self.key, "Content-Type": "application/json"}

    def get_jobs(self, status: str = "pending") -> list:
        r = requests.get(
            f"{self.base}/kiosk/jobs/",
            params={"status": status},
            headers=self._headers(),
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else data.get("jobs", [])

    def get_dashboard(self) -> dict:
        r = requests.get(f"{self.base}/kiosk/dashboard/", headers=self._headers(), timeout=30)
        r.raise_for_status()
        return r.json()

    def complete_job(self, job_id: int, scan_pdf_b64: str) -> dict:
        r = requests.post(
            f"{self.base}/kiosk/complete/",
            json={"jobId": job_id, "scanPdf": scan_pdf_b64},
            headers=self._headers(),
            timeout=60,
        )
        r.raise_for_status()
        return r.json()


# ════════════════════════════════════════════════════════════
# הדפסה
# ════════════════════════════════════════════════════════════
def load_coords() -> dict:
    if not COORDS_FILE.exists():
        raise FileNotFoundError(
            f"חסר {COORDS_FILE.name} — העתק מ-tools/pais-form-cells.json לאותה תיקייה"
        )
    return json.loads(COORDS_FILE.read_text(encoding="utf-8"))


def _parse_sets(job: dict) -> list[dict]:
    raw = job.get("setsJson")
    if isinstance(raw, str):
        return json.loads(raw or "[]")
    if isinstance(raw, list):
        return raw
    return []


def create_and_print(job: dict) -> None:
    cells = load_coords()
    w, h = int(cells["w"]), int(cells["h"])
    dpi = 300
    pt = dpi / 72.0
    pw, ph = int(w * pt), int(h * pt)
    r = max(3, int(2.5 * pt))

    sets = _parse_sets(job)
    name = job.get("userName", "")
    phone = job.get("userPhone", "")
    oid = job.get("orderNumber", "")

    pages: list[Image.Image] = []
    tables_per_form = 14

    for fi in range(0, len(sets), tables_per_form):
        chunk = sets[fi : fi + tables_per_form]
        img = Image.new("RGB", (pw, ph), "white")
        draw = ImageDraw.Draw(img)

        for ti, s in enumerate(chunk):
            table_idx = fi + ti
            if table_idx >= len(cells.get("main", [])):
                break
            main_row = cells["main"][table_idx]
            strong_row = cells["strong"][table_idx] if table_idx < len(cells.get("strong", [])) else {}

            nums = s.get("nums") or s.get("numbers") or []
            strong = s.get("strong")

            for num in nums:
                pt_xy = main_row.get(str(int(num)))
                if not pt_xy:
                    continue
                px, py = int(pt_xy[0] * pt), ph - int(pt_xy[1] * pt)
                draw.ellipse([px - r, py - r, px + r, py + r], fill="black")

            if strong:
                pt_xy = strong_row.get(str(int(strong)))
                if pt_xy:
                    px, py = int(pt_xy[0] * pt), ph - int(pt_xy[1] * pt)
                    draw.ellipse([px - r, py - r, px + r, py + r], fill="black")

        pages.append(img)

        back = Image.new("RGB", (pw, ph), "white")
        bd = ImageDraw.Draw(back)
        try:
            fb = ImageFont.truetype("arial.ttf", int(0.6 * dpi))
            fm = ImageFont.truetype("arial.ttf", int(0.4 * dpi))
            fs = ImageFont.truetype("arial.ttf", int(0.25 * dpi))
        except OSError:
            fb = fm = fs = ImageFont.load_default()
        cx = pw // 2
        ts = datetime.now().strftime("%d/%m/%Y %H:%M")
        bd.text((cx, ph // 2 - int(0.8 * dpi)), name, fill="black", font=fb, anchor="mm")
        bd.text((cx, ph // 2 - int(0.2 * dpi)), phone, fill="black", font=fm, anchor="mm")
        bd.text((cx, ph // 2 + int(0.4 * dpi)), f"#{oid} • טופס {fi // tables_per_form + 1}", fill="gray", font=fs, anchor="mm")
        bd.text((cx, ph // 2 + int(0.7 * dpi)), ts, fill="gray", font=fs, anchor="mm")
        pages.append(back)

    printer = win32print.GetDefaultPrinter()
    hdc = win32ui.CreateDC()
    hdc.CreatePrinterDC(printer)
    hdc.StartDoc(f"Lotto {oid}")
    pw2 = hdc.GetDeviceCaps(win32con.HORZRES)
    ph2 = hdc.GetDeviceCaps(win32con.VERTRES)
    for pg in pages:
        hdc.StartPage()
        dib = ImageWin.Dib(pg.resize((pw2, ph2), Image.LANCZOS).convert("RGB"))
        dib.draw(hdc.GetHandleOutput(), (0, 0, pw2, ph2))
        hdc.EndPage()
    hdc.EndDoc()
    hdc.DeleteDC()
    log.info("הודפסו %s עמודים להזמנה %s", len(pages), oid)


# ════════════════════════════════════════════════════════════
# סריקה WIA
# ════════════════════════════════════════════════════════════
WIA_PS = r"""
$wia = New-Object -ComObject WIA.CommonDialog
$img = $wia.ShowAcquireImage(
    [WIA.WiaDeviceType]::ScannerDeviceType,
    [WIA.WiaImageIntent]::TextIntent,
    [WIA.WiaImageBias]::MaximizeQuality,
    "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}",
    $true,$true,$false)
if($img){ $p=[System.IO.Path]::GetTempFileName()+".bmp"; $img.SaveFile($p); Write-Output $p }
"""


def scan_to_b64() -> str:
    ps = subprocess.run(["powershell", "-Command", WIA_PS], capture_output=True, text=True)
    path = ps.stdout.strip()
    if not path or not os.path.exists(path):
        raise RuntimeError(ps.stderr.strip() or "סריקה בוטלה")
    img = Image.open(path).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PDF", resolution=200)
    os.unlink(path)
    return base64.b64encode(buf.getvalue()).decode()


# ════════════════════════════════════════════════════════════
# מסך LOGIN
# ════════════════════════════════════════════════════════════
class LoginScreen(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Mandeles — כניסה לדוכן")
        self.geometry("440x360")
        self.configure(bg=BG)
        self.resizable(False, False)
        self.result: tuple[KioskAPI, dict] | None = None

        cfg = load_config()
        self.site_var = tk.StringVar(value=cfg.get("site") or SITE_URL)
        self.email_var = tk.StringVar(value=cfg.get("email") or "")
        self.pass_var = tk.StringVar()

        tk.Label(self, text="MANDELES", bg=NAVY, fg=GOLD, font=("Segoe UI", 18, "bold")).pack(fill="x", ipady=14)
        tk.Label(self, text="כניסה לתוכנת דוכן", bg=BG, fg=NAVY, font=("Segoe UI", 12)).pack(pady=(16, 8))

        frm = tk.Frame(self, bg=BG)
        frm.pack(padx=40, fill="x")
        for row, (label, var, secret) in enumerate(
            [("אימייל:", self.email_var, False), ("סיסמה:", self.pass_var, True), ("כתובת אתר:", self.site_var, False)]
        ):
            tk.Label(frm, text=label, bg=BG, fg=NAVY if row < 2 else MUTED, font=FB, anchor="e").grid(
                row=row, column=1, sticky="e", pady=6
            )
            tk.Entry(frm, textvariable=var, font=FB, width=26, show="*" if secret else "").grid(
                row=row, column=0, pady=6, padx=6
            )

        self.err_lbl = tk.Label(self, text="", bg=BG, fg=RED, font=FB, wraplength=360)
        self.err_lbl.pack(pady=6)
        self.btn = tk.Button(self, text="כניסה", command=self._login, bg=GOLD, fg=NAVY, font=FBB, relief="flat", padx=32, pady=8)
        self.btn.pack()
        self.bind("<Return>", lambda _: self._login())

    def _login(self) -> None:
        email = self.email_var.get().strip()
        pwd = self.pass_var.get().strip()
        site = self.site_var.get().strip()
        if not email or not pwd:
            self.err_lbl.config(text="מלא אימייל וסיסמה")
            return

        self.btn.config(state="disabled", text="מתחבר…")
        self.err_lbl.config(text="")

        def _run() -> None:
            try:
                data = kiosk_login(site, email, pwd)
                api_key = data["apiKey"]
                info = data.get("kiosk") or data
                save_config({"site": site, "email": email, "api_key": api_key})
                api = KioskAPI(site, api_key)
                self.after(0, lambda: self._ok(api, info))
            except Exception as exc:
                self.after(0, lambda e=str(exc): self._fail(e))

        threading.Thread(target=_run, daemon=True).start()

    def _ok(self, api: KioskAPI, info: dict) -> None:
        self.result = (api, info)
        self.destroy()

    def _fail(self, err: str) -> None:
        self.err_lbl.config(text=err)
        self.btn.config(state="normal", text="כניסה")


# ════════════════════════════════════════════════════════════
# מסך ראשי
# ════════════════════════════════════════════════════════════
class MainApp(tk.Tk):
    def __init__(self, api: KioskAPI, info: dict):
        super().__init__()
        self.api = api
        self.info = info
        self.jobs: list[dict] = []
        self.selected_job: dict | None = None

        name = info.get("name") or "דוכן"
        self.title(f"Mandeles — {name}")
        self.geometry("900x580")
        self.configure(bg=BG)
        self._build()
        self.after(400, self._refresh)

    def _build(self) -> None:
        nav = tk.Frame(self, bg=NAVY, height=50)
        nav.pack(fill="x")
        nav.pack_propagate(False)
        tk.Label(nav, text=f"MANDELES  |  {self.info.get('name', '')}", bg=NAVY, fg=GOLD, font=("Segoe UI", 12, "bold")).pack(
            side="right", padx=16, pady=12
        )
        tk.Button(nav, text="דשבורד", command=self._dashboard, bg=NAVY, fg=GOLD, font=FB, relief="flat").pack(
            side="left", padx=8
        )
        tk.Button(nav, text="רענון", command=self._refresh, bg=NAVY, fg=GOLD, font=FB, relief="flat").pack(side="left")

        body = tk.Frame(self, bg=BG)
        body.pack(fill="both", expand=True, padx=12, pady=12)

        cols = ("order", "name", "phone", "tables", "total")
        self.tree = ttk.Treeview(body, columns=cols, show="headings", height=14)
        self.tree.heading("order", text="הזמנה")
        self.tree.heading("name", text="לקוח")
        self.tree.heading("phone", text="טלפון")
        self.tree.heading("tables", text="טבלאות")
        self.tree.heading("total", text="סה״כ")
        self.tree.column("order", width=120, anchor="center")
        self.tree.column("name", width=180, anchor="e")
        self.tree.column("phone", width=120, anchor="center")
        self.tree.column("tables", width=80, anchor="center")
        self.tree.column("total", width=80, anchor="center")
        self.tree.pack(fill="both", expand=True)
        self.tree.bind("<<TreeviewSelect>>", self._on_select)

        btns = tk.Frame(body, bg=BG)
        btns.pack(fill="x", pady=(12, 0))
        tk.Button(btns, text="הדפס", command=self._print_selected, bg=GOLD, fg=NAVY, font=FBB, relief="flat", padx=20).pack(
            side="right", padx=4
        )
        tk.Button(btns, text="סרוק והשלם", command=self._scan_complete, bg=GREEN, fg="white", font=FBB, relief="flat", padx=20).pack(
            side="right", padx=4
        )

        self.status = tk.Label(self, text="", bg=BG, fg=MUTED, font=FB, anchor="e")
        self.status.pack(fill="x", padx=12, pady=8)

    def _on_select(self, _event=None) -> None:
        sel = self.tree.selection()
        if not sel:
            self.selected_job = None
            return
        job_id = int(sel[0])
        self.selected_job = next((j for j in self.jobs if j.get("id") == job_id), None)

    def _set_status(self, msg: str) -> None:
        self.status.config(text=msg)
        self.update_idletasks()

    def _refresh(self) -> None:
        self._set_status("טוען הזמנות…")

        def _run() -> None:
            try:
                jobs = self.api.get_jobs("pending")
                self.after(0, lambda: self._show_jobs(jobs))
            except Exception as exc:
                self.after(0, lambda e=str(exc): self._set_status(f"שגיאה: {e}"))

        threading.Thread(target=_run, daemon=True).start()

    def _show_jobs(self, jobs: list[dict]) -> None:
        self.jobs = jobs
        for item in self.tree.get_children():
            self.tree.delete(item)
        for j in jobs:
            jid = j.get("id")
            self.tree.insert(
                "",
                "end",
                iid=str(jid),
                values=(
                    j.get("orderNumber", ""),
                    j.get("userName", ""),
                    j.get("userPhone", ""),
                    j.get("tablesCount", ""),
                    f"₪{j.get('totalIls', 0):.0f}",
                ),
            )
        self._set_status(f"{len(jobs)} הזמנות ממתינות")

    def _dashboard(self) -> None:
        try:
            d = self.api.get_dashboard()
            messagebox.showinfo(
                "דשבורד",
                f"ממתינות: {d.get('pending', 0)}\n"
                f"ממתין לסריקה: {d.get('awaitingScan', 0)}\n"
                f"הושלמו היום: {d.get('completedToday', 0)}",
            )
        except Exception as exc:
            messagebox.showerror("שגיאה", str(exc))

    def _print_selected(self) -> None:
        if not self.selected_job:
            messagebox.showwarning("הדפסה", "בחר הזמנה מהרשימה")
            return
        job = self.selected_job
        self._set_status(f"מדפיס {job.get('orderNumber')}…")

        def _run() -> None:
            try:
                create_and_print(job)
                self.after(0, lambda: self._set_status(f"הודפס: {job.get('orderNumber')}"))
            except Exception as exc:
                self.after(0, lambda e=str(exc): messagebox.showerror("שגיאת הדפסה", e))

        threading.Thread(target=_run, daemon=True).start()

    def _scan_complete(self) -> None:
        if not self.selected_job:
            messagebox.showwarning("סריקה", "בחר הזמנה מהרשימה")
            return
        job = self.selected_job
        try:
            pdf_b64 = scan_to_b64()
        except Exception as exc:
            messagebox.showerror("סריקה", str(exc))
            return

        self._set_status("שולח סריקה לשרת…")

        def _run() -> None:
            try:
                self.api.complete_job(job["id"], pdf_b64)
                self.after(0, lambda: self._after_complete(job))
            except Exception as exc:
                self.after(0, lambda e=str(exc): messagebox.showerror("שגיאה", e))

        threading.Thread(target=_run, daemon=True).start()

    def _after_complete(self, job: dict) -> None:
        messagebox.showinfo("הושלם", f"הזמנה {job.get('orderNumber')} הושלמה")
        self._refresh()


def main() -> None:
    log.info("Mandeles Kiosk v%s", VERSION)
    login = LoginScreen()
    login.mainloop()
    if not login.result:
        return
    api, info = login.result
    app = MainApp(api, info)
    app.mainloop()


if __name__ == "__main__":
    main()
