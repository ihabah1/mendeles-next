"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import SiteIcon from "@/components/SiteIcon";
import { guideService } from "@/lib/api/guide";
import { useAuth } from "@/lib/auth/AuthContext";
import { GUIDE_QUICK_PROMPTS, GUIDE_WELCOME, type GuideLink } from "@/lib/site-guide";

type ChatMsg = {
  id: number;
  role: "user" | "assistant";
  text: string;
  links?: GuideLink[];
};

const HIDE_ON = ["/admin", "/auth"];
const BALLOON_DISMISS_KEY = "mandeles-guide-balloon-dismissed";
const BALLOON_POS_KEY = "mandeles-guide-balloon-pos";
const DRAG_THRESHOLD = 6;

type Pos = { x: number; y: number };

export default function SiteGuideChat() {
  const path = usePathname() ?? "";
  const { user } = useAuth();
  const hidden = HIDE_ON.some((p) => path === p || path.startsWith(`${p}/`));
  const [open, setOpen] = useState(false);
  const [balloonDismissed, setBalloonDismissed] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 0, role: "assistant", text: GUIDE_WELCOME },
  ]);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragging: boolean;
  } | null>(null);
  const wasDragged = useRef(false);

  useEffect(() => {
    try {
      setBalloonDismissed(sessionStorage.getItem(BALLOON_DISMISS_KEY) === "1");
      const saved = localStorage.getItem(BALLOON_POS_KEY);
      if (saved) {
        const p = JSON.parse(saved) as Pos;
        if (typeof p.x === "number" && typeof p.y === "number") setPos(p);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const clampPos = useCallback((p: Pos): Pos => {
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 200;
    const h = el?.offsetHeight ?? 60;
    return {
      x: Math.min(Math.max(p.x, 8), window.innerWidth - w - 8),
      y: Math.min(Math.max(p.y, 8), window.innerHeight - h - 8),
    };
  }, []);

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      dragging: false,
    };
    wasDragged.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragPointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    st.dragging = true;
    wasDragged.current = true;
    setPos(clampPos({ x: st.originX + dx, y: st.originY + dy }));
  };

  const onDragPointerUp = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st || st.pointerId !== e.pointerId) return;
    dragState.current = null;
    if (st.dragging) {
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(BALLOON_POS_KEY, JSON.stringify(p));
          } catch {
            /* ignore */
          }
        }
        return p;
      });
    }
  };

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampPos(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPos]);

  const dismissBalloon = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBalloonDismissed(true);
    try {
      sessionStorage.setItem(BALLOON_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const userId = nextId.current++;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { id: userId, role: "user", text: q }]);
    setInput("");
    setLoading(true);
    scrollDown();
    try {
      const res = await guideService.chat(q, {
        history,
        pagePath: path,
        guestName: user?.display_name || user?.full_name || "",
        alreadyEscalated: escalated,
      });
      if (res.escalated) setEscalated(true);
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "assistant",
          text: res.text,
          links: res.links,
        },
      ]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  if (hidden) return null;

  /** When dragged, panel opens above or below depending on free space. */
  const panelBelow = pos !== null && pos.y < 300;

  return (
    <div
      ref={rootRef}
      className={`site-guide-root${panelBelow ? " site-guide-root--panel-below" : ""}`}
      style={
        pos
          ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto", insetInlineStart: "auto", insetInlineEnd: "auto" }
          : undefined
      }
    >
      {open && (
        <div className="site-guide-panel site-guide-panel--open" role="dialog" aria-label="צ'אט עזרה">
          <div className="site-guide-header">
            <span className="site-guide-header-brand">
              <SiteIcon size={26} />
              <span>עזרה וניווט</span>
            </span>
            <button type="button" className="site-guide-close" onClick={() => setOpen(false)} aria-label="סגור צ'אט">
              ✕
            </button>
          </div>
          <div className="site-guide-messages" ref={listRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`site-guide-bubble site-guide-bubble--${msg.role}`}>
                <p>{msg.text}</p>
                {msg.links && msg.links.length > 0 && (
                  <div className="site-guide-links">
                    {msg.links.map((l) => (
                      <Link key={l.href} href={l.href} className="site-guide-link" onClick={() => setOpen(false)}>
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="site-guide-bubble site-guide-bubble--assistant">
                <p className="site-guide-typing">מחפש את הדרך…</p>
              </div>
            )}
          </div>
          <div className="site-guide-quick">
            {GUIDE_QUICK_PROMPTS.map((p) => (
              <button key={p} type="button" className="site-guide-chip" onClick={() => send(p)} disabled={loading}>
                {p}
              </button>
            ))}
          </div>
          <form
            className="site-guide-form"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="site-guide-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="כתבו שאלה או בקשה לנציג…"
              disabled={loading}
              maxLength={500}
            />
            <button type="submit" className="site-guide-send" disabled={loading || !input.trim()}>
              שלח
            </button>
          </form>
        </div>
      )}

      {!open && !balloonDismissed && (
        <div
          className="site-guide-balloon-wrap site-guide-draggable"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
        >
          <div className="site-guide-balloon">
            <button
              type="button"
              className="site-guide-balloon-close"
              onClick={(e) => {
                if (wasDragged.current) return;
                dismissBalloon(e);
              }}
              aria-label="סגור בלון"
            >
              ✕
            </button>
            <button
              type="button"
              className="site-guide-balloon-body"
              onClick={() => {
                if (wasDragged.current) return;
                setOpen(true);
              }}
              aria-label="פתח צ'אט עזרה"
            >
              <SiteIcon size={34} />
              <span className="site-guide-balloon-text">איך ניתן לעזור?</span>
            </button>
          </div>
          <span className="site-guide-balloon-tail" aria-hidden />
        </div>
      )}

      {balloonDismissed && !open && (
        <button
          type="button"
          className="site-guide-fab site-guide-fab--mini site-guide-draggable"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
          onClick={() => {
            if (wasDragged.current) return;
            setOpen(true);
          }}
          aria-label="פתח צ'אט עזרה"
        >
          <SiteIcon size={28} />
        </button>
      )}
    </div>
  );
}
