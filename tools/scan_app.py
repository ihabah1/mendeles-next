"""
scan_app.py — אפליקציית סריקה לוקאלית (Mandeles)
=================================================
מושך הזמנות בסטטוס «הודפס», מעלה סריקת PDF → הלקוח רואה באתר, סטטוס «הושלם».

התקנה:
    pip install requests pillow

הרצה:
    python tools/scan_app.py

הגדרות (scan_config.json ליד הקובץ):
    api_url — כתובת האתר (למשל https://mendeles-next-production.up.railway.app)
    api_key — אותו PRINT_API_KEY כמו ב-Railway Backend
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import requests
import subprocess
import tempfile
import os
import json
from pathlib import Path
from datetime import datetime

# ── הגדרות ──────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "scan_config.json"

def load_config():
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except:
        return {
            "api_url": "https://mendeles-next-production.up.railway.app",
            "api_key": "",
        }

def save_config(cfg):
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")

# ══════════════════════════════════════════════════════
# ── WIA SCANNER (Windows) ─────────────────────────────
# ══════════════════════════════════════════════════════
WIA_SCRIPT = r"""
$wia = New-Object -ComObject WIA.CommonDialog
$img = $wia.ShowAcquireImage(
    [WIA.WiaDeviceType]::ScannerDeviceType,
    [WIA.WiaImageIntent]::TextIntent,
    [WIA.WiaImageBias]::MaximizeQuality,
    "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}",
    $true, $true, $false
)
if ($img) {
    $path = [System.IO.Path]::GetTempFileName() + ".bmp"
    $img.SaveFile($path)
    Write-Output $path
}
"""

def scan_with_wia():
    """סריקה דרך WIA של Windows — מחזיר נתיב לקובץ זמני"""
    ps = subprocess.run(
        ["powershell", "-Command", WIA_SCRIPT],
        capture_output=True, text=True
    )
    path = ps.stdout.strip()
    if path and os.path.exists(path):
        return path
    raise Exception(f"סריקה נכשלה: {ps.stderr.strip() or 'לא נבחר קובץ'}")

def image_to_pdf(image_path: str) -> bytes:
    """המר תמונה ל-PDF"""
    from PIL import Image
    import io
    img = Image.open(image_path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PDF", resolution=200)
    return buf.getvalue()

# ══════════════════════════════════════════════════════
# ── API CLIENT ────────────────────────────────────────
# ══════════════════════════════════════════════════════
class ApiClient:
    def __init__(self, base_url: str, api_key: str):
        self.base = base_url.rstrip("/")
        self.headers = {"x-api-key": api_key}

    def get_printed_orders(self):
        r = requests.get(
            f"{self.base}/api/print/orders",
            params={"status": "printed"},
            headers=self.headers, timeout=10
        )
        r.raise_for_status()
        return r.json()

    def confirm_print(self, order_id: int):
        r = requests.post(
            f"{self.base}/api/print/confirm",
            json={"orderId": order_id, "printedAt": datetime.now().isoformat()},
            headers=self.headers, timeout=10
        )
        r.raise_for_status()
        return r.json()

    def upload_scan(self, order_id: int, pdf_bytes: bytes, order_number: str):
        r = requests.post(
            f"{self.base}/api/print/scan",
            headers=self.headers,
            files={"file": (f"scan_{order_number}.pdf", pdf_bytes, "application/pdf")},
            data={"orderId": str(order_id)},
            timeout=30
        )
        r.raise_for_status()
        return r.json()

# ══════════════════════════════════════════════════════
# ── GUI ───────────────────────────────────────────────
# ══════════════════════════════════════════════════════
class ScanApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Mandeles — מערכת סריקה")
        self.geometry("700x600")
        self.resizable(True, True)
        self.configure(bg="#f2ede6")

        self.cfg    = load_config()
        self.client = ApiClient(self.cfg["api_url"], self.cfg["api_key"])
        self.orders = []
        self.selected_order = None

        self._build_ui()
        self.after(100, self.load_orders)

    # ── UI ─────────────────────────────────────────────
    def _build_ui(self):
        # כותרת
        hdr = tk.Frame(self, bg="#1c1208", height=52)
        hdr.pack(fill="x")
        hdr.pack_propagate(False)
        tk.Label(hdr, text="MANDELES — מערכת סריקה",
                 bg="#1c1208", fg="#c9a030",
                 font=("Heebo", 13, "bold")).pack(side="right", padx=16, pady=14)

        # הגדרות
        cfg_frame = tk.Frame(self, bg="#f2ede6", pady=8)
        cfg_frame.pack(fill="x", padx=16)
        tk.Label(cfg_frame, text="כתובת אתר:", bg="#f2ede6",
                 font=("Heebo", 9)).grid(row=0, column=1, sticky="e", padx=4)
        self.url_var = tk.StringVar(value=self.cfg["api_url"])
        tk.Entry(cfg_frame, textvariable=self.url_var, width=32,
                 font=("Heebo", 9)).grid(row=0, column=0, padx=4)
        tk.Label(cfg_frame, text="API Key:", bg="#f2ede6",
                 font=("Heebo", 9)).grid(row=1, column=1, sticky="e", padx=4)
        self.key_var = tk.StringVar(value=self.cfg["api_key"])
        tk.Entry(cfg_frame, textvariable=self.key_var, width=32,
                 show="*", font=("Heebo", 9)).grid(row=1, column=0, padx=4)
        tk.Button(cfg_frame, text="שמור", command=self.save_cfg,
                  bg="#c9a030", fg="#1c1208", font=("Heebo", 9, "bold"),
                  relief="flat", padx=8).grid(row=0, column=2, rowspan=2, padx=8)

        # כפתור רענון
        btn_frame = tk.Frame(self, bg="#f2ede6")
        btn_frame.pack(fill="x", padx=16, pady=(0,6))
        tk.Button(btn_frame, text="🔄 רענן הזמנות",
                  command=self.load_orders,
                  bg="#1c1208", fg="#c9a030",
                  font=("Heebo", 10, "bold"),
                  relief="flat", padx=14, pady=6).pack(side="right")
        self.status_lbl = tk.Label(btn_frame, text="",
                                    bg="#f2ede6", fg="#5a4830",
                                    font=("Heebo", 9))
        self.status_lbl.pack(side="right", padx=10)

        # טבלת הזמנות
        tbl_frame = tk.Frame(self, bg="#f2ede6")
        tbl_frame.pack(fill="both", expand=True, padx=16, pady=(0,8))

        cols = ("order_number", "user", "tables", "printed_at", "status")
        self.tree = ttk.Treeview(tbl_frame, columns=cols, show="headings",
                                  selectmode="browse", height=12)
        self.tree.heading("order_number", text="מספר הזמנה")
        self.tree.heading("user",         text="לקוח")
        self.tree.heading("tables",       text="טבלאות")
        self.tree.heading("printed_at",   text="הודפס")
        self.tree.heading("status",       text="סטטוס")
        self.tree.column("order_number", width=130, anchor="center")
        self.tree.column("user",         width=150, anchor="center")
        self.tree.column("tables",       width=70,  anchor="center")
        self.tree.column("printed_at",   width=150, anchor="center")
        self.tree.column("status",       width=100, anchor="center")

        sb = ttk.Scrollbar(tbl_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb.set)
        self.tree.pack(side="right", fill="both", expand=True)
        sb.pack(side="left", fill="y")
        self.tree.bind("<<TreeviewSelect>>", self.on_select)

        # כפתורי פעולה
        act_frame = tk.Frame(self, bg="#f2ede6")
        act_frame.pack(fill="x", padx=16, pady=(0,12))

        self.btn_scan = tk.Button(
            act_frame, text="📷 סרוק טופס",
            command=self.do_scan,
            bg="#1c8040", fg="#fff",
            font=("Heebo", 11, "bold"),
            relief="flat", padx=20, pady=8,
            state="disabled"
        )
        self.btn_scan.pack(side="right", padx=6)

        self.btn_upload = tk.Button(
            act_frame, text="📁 בחר PDF קיים",
            command=self.upload_existing,
            bg="#5a4830", fg="#fff",
            font=("Heebo", 10, "bold"),
            relief="flat", padx=14, pady=8,
            state="disabled"
        )
        self.btn_upload.pack(side="right", padx=6)

        self.btn_confirm = tk.Button(
            act_frame, text="✅ אשר הדפסה",
            command=self.confirm_print,
            bg="#c9a030", fg="#1c1208",
            font=("Heebo", 10, "bold"),
            relief="flat", padx=14, pady=8,
            state="disabled"
        )
        self.btn_confirm.pack(side="right", padx=6)

        # progress bar
        self.progress = ttk.Progressbar(self, mode="indeterminate")

    # ── פעולות ─────────────────────────────────────────
    def save_cfg(self):
        self.cfg["api_url"] = self.url_var.get().strip()
        self.cfg["api_key"] = self.key_var.get().strip()
        save_config(self.cfg)
        self.client = ApiClient(self.cfg["api_url"], self.cfg["api_key"])
        self.set_status("✅ הגדרות נשמרו")

    def set_status(self, msg, color="#5a4830"):
        self.status_lbl.config(text=msg, fg=color)

    def load_orders(self):
        self.set_status("⏳ טוען הזמנות...")
        self.progress.pack(fill="x", padx=16, pady=(0,4))
        self.progress.start(10)

        def _fetch():
            try:
                orders = self.client.get_printed_orders()
                self.orders = orders
                self.after(0, lambda: self._populate_table(orders))
                self.after(0, lambda: self.set_status(f"✅ {len(orders)} הזמנות נטענו", "#1c8040"))
            except Exception as e:
                self.after(0, lambda: self.set_status(f"❌ {e}", "#c01820"))
            finally:
                self.after(0, self.progress.stop)
                self.after(0, lambda: self.progress.pack_forget())

        threading.Thread(target=_fetch, daemon=True).start()

    def _populate_table(self, orders):
        for row in self.tree.get_children():
            self.tree.delete(row)
        for o in orders:
            st = o.get("status", "")
            status_text = "🖨️ הודפס" if st == "printed" else "✅ הושלם" if st == "completed" else st
            self.tree.insert("", "end", iid=str(o["id"]), values=(
                o.get("orderNumber", ""),
                o.get("userName", ""),
                o.get("tablesCount", ""),
                o.get("printedAt", "")[:16] if o.get("printedAt") else "",
                status_text,
            ))

    def on_select(self, _event):
        sel = self.tree.selection()
        if not sel: return
        order_id = int(sel[0])
        self.selected_order = next((o for o in self.orders if o["id"] == order_id), None)
        state = "normal" if self.selected_order else "disabled"
        self.btn_scan.config(state=state)
        self.btn_upload.config(state=state)
        self.btn_confirm.config(state=state)

    def confirm_print(self):
        if not self.selected_order: return
        o = self.selected_order
        if not messagebox.askyesno("אישור הדפסה",
                f"לאשר הדפסת הזמנה {o['orderNumber']} ללקוח {o['userName']}?"):
            return
        try:
            self.client.confirm_print(o["id"])
            self.set_status(f"✅ הדפסה אושרה — {o['orderNumber']}", "#1c8040")
            self.load_orders()
        except Exception as e:
            messagebox.showerror("שגיאה", str(e))

    def do_scan(self):
        if not self.selected_order: return
        o = self.selected_order
        self.set_status("📷 סורק...")
        self.progress.pack(fill="x", padx=16, pady=(0,4))
        self.progress.start(10)

        def _scan():
            try:
                img_path = scan_with_wia()
                pdf_bytes = image_to_pdf(img_path)
                os.unlink(img_path)
                result = self.client.upload_scan(o["id"], pdf_bytes, o["orderNumber"])
                self.after(0, lambda: self.set_status(
                    f"✅ סריקה הועלתה — {o['orderNumber']}", "#1c8040"))
                self.after(0, self.load_orders)
                self.after(0, lambda: messagebox.showinfo(
                    "הצלחה", f"סריקה הועלתה בהצלחה!\nהלקוח יכול לראות אותה בחשבונו."))
            except Exception as e:
                self.after(0, lambda: messagebox.showerror("שגיאת סריקה", str(e)))
                self.after(0, lambda: self.set_status(f"❌ {e}", "#c01820"))
            finally:
                self.after(0, self.progress.stop)
                self.after(0, lambda: self.progress.pack_forget())

        threading.Thread(target=_scan, daemon=True).start()

    def upload_existing(self):
        """העלה PDF קיים מהדיסק"""
        if not self.selected_order: return
        o = self.selected_order
        path = filedialog.askopenfilename(
            title="בחר PDF לסריקה",
            filetypes=[("PDF files", "*.pdf"), ("Images", "*.png *.jpg *.bmp")]
        )
        if not path: return

        self.set_status("📤 מעלה...")
        self.progress.pack(fill="x", padx=16, pady=(0,4))
        self.progress.start(10)

        def _upload():
            try:
                p = Path(path)
                if p.suffix.lower() == ".pdf":
                    pdf_bytes = p.read_bytes()
                else:
                    pdf_bytes = image_to_pdf(path)
                result = self.client.upload_scan(o["id"], pdf_bytes, o["orderNumber"])
                self.after(0, lambda: self.set_status(
                    f"✅ הועלה — {o['orderNumber']}", "#1c8040"))
                self.after(0, self.load_orders)
            except Exception as e:
                self.after(0, lambda: messagebox.showerror("שגיאה", str(e)))
            finally:
                self.after(0, self.progress.stop)
                self.after(0, lambda: self.progress.pack_forget())

        threading.Thread(target=_upload, daemon=True).start()


if __name__ == "__main__":
    app = ScanApp()
    app.mainloop()
