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

  useEffect(() => {
    try {
      setBalloonDismissed(sessionStorage.getItem(BALLOON_DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

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

  return (
    <div className="site-guide-root">
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
        <div className="site-guide-balloon-wrap">
          <div className="site-guide-balloon">
            <button
              type="button"
              className="site-guide-balloon-close"
              onClick={dismissBalloon}
              aria-label="סגור בלון"
            >
              ✕
            </button>
            <button
              type="button"
              className="site-guide-balloon-body"
              onClick={() => setOpen(true)}
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
          className="site-guide-fab site-guide-fab--mini"
          onClick={() => setOpen(true)}
          aria-label="פתח צ'אט עזרה"
        >
          <SiteIcon size={28} />
        </button>
      )}
    </div>
  );
}
