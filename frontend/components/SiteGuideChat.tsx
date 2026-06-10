"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { guideService } from "@/lib/api/guide";
import { GUIDE_QUICK_PROMPTS, GUIDE_WELCOME, type GuideLink } from "@/lib/site-guide";

type ChatMsg = {
  id: number;
  role: "user" | "assistant";
  text: string;
  links?: GuideLink[];
};

const HIDE_ON = ["/admin", "/auth"];

export default function SiteGuideChat() {
  const path = usePathname() ?? "";
  const hidden = HIDE_ON.some((p) => path === p || path.startsWith(`${p}/`));
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 0, role: "assistant", text: GUIDE_WELCOME },
  ]);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);

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
    setMessages((m) => [...m, { id: userId, role: "user", text: q }]);
    setInput("");
    setLoading(true);
    scrollDown();
    try {
      const res = await guideService.chat(q);
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
        <div className="site-guide-panel" role="dialog" aria-label="מדריך האתר">
          <div className="site-guide-header">
            <span>🤖 מדריך האתר</span>
            <button type="button" className="site-guide-close" onClick={() => setOpen(false)} aria-label="סגור">
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
              placeholder="לאן ללכת? למשל: איך טוענים ארנק?"
              disabled={loading}
              maxLength={500}
            />
            <button type="submit" className="site-guide-send" disabled={loading || !input.trim()}>
              שלח
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="site-guide-fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="פתח מדריך AI"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
