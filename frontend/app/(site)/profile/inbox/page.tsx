"use client";

import { useEffect, useState } from "react";
import { DEMO_MESSAGES } from "@/lib/demo";
import { extractApiError, inboxService } from "@/lib/api";
import type { InboxMessage } from "@/lib/api/types";

const CHANNEL_LABELS: Record<string, string> = {
  system: "מערכת",
  sms: "SMS",
  email: "אימייל",
  push: "התראה",
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ProfileInboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const selected = messages.find((m) => m.id === selectedId) ?? null;
  const unreadCount = messages.filter((m) => !m.is_read).length;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("inbox-unread-changed", { detail: unreadCount }));
  }, [unreadCount]);

  useEffect(() => {
    let cancelled = false;
    const demo = localStorage.getItem("demo_mode") === "1";
    setIsDemo(demo);

    (async () => {
      try {
        if (demo) {
          if (!cancelled) {
            setMessages(DEMO_MESSAGES);
            setSelectedId(DEMO_MESSAGES[0]?.id ?? null);
          }
          return;
        }
        const list = await inboxService.list();
        if (!cancelled) {
          setMessages(list);
          setSelectedId((prev) =>
            list.some((m) => m.id === prev) ? prev : (list[0]?.id ?? null),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractApiError(err, "שגיאה בטעינת תיבת הדואר"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openMessage = async (msg: InboxMessage) => {
    setSelectedId(msg.id);
    if (msg.is_read || isDemo) return;
    try {
      const updated = await inboxService.markRead(msg.id);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      /* keep message visible even if mark-read fails */
    }
  };

  const handleMarkAllRead = async () => {
    if (isDemo) {
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      return;
    }
    setMarkingAll(true);
    try {
      await inboxService.markAllRead();
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
    } catch (err) {
      setError(extractApiError(err, "שגיאה בסימון הודעות"));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="inbox-page">
      <div className="inbox-header">
        <div>
          <h2 className="profile-panel-title">📬 תיבת דואר</h2>
          <p className="profile-panel-desc">מכתבי מערכת, עדכונים והודעות מהשירות</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? "מסמן…" : "סמן הכל כנקרא"}
          </button>
        )}
      </div>

      {isDemo && (
        <div className="profile-alert warn" style={{ marginBottom: 12 }}>
          🧪 מצב דמו — הודעות לדוגמה
        </div>
      )}

      {error && <div className="profile-alert error">{error}</div>}

      {loading ? (
        <p className="inbox-empty">טוען הודעות…</p>
      ) : messages.length === 0 ? (
        <p className="inbox-empty">אין הודעות בתיבה — מכתבי מערכת יופיעו כאן.</p>
      ) : (
        <div className="inbox-layout">
          <ul className="inbox-list" aria-label="רשימת הודעות">
            {messages.map((msg) => (
              <li key={msg.id}>
                <button
                  type="button"
                  className={`inbox-item${selectedId === msg.id ? " active" : ""}${!msg.is_read ? " unread" : ""}`}
                  onClick={() => openMessage(msg)}
                >
                  <span className="inbox-item-subject">{msg.subject}</span>
                  <span className="inbox-item-meta">
                    <span className="inbox-item-channel">{CHANNEL_LABELS[msg.channel] ?? msg.channel}</span>
                    <span className="inbox-item-date">{formatDate(msg.sent_at)}</span>
                  </span>
                  {!msg.is_read && <span className="inbox-unread-dot" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>

          <article className="inbox-detail card" aria-live="polite">
            {selected ? (
              <>
                <header className="inbox-detail-head">
                  <h3 className="inbox-detail-subject">{selected.subject}</h3>
                  <div className="inbox-detail-meta">
                    <span>{CHANNEL_LABELS[selected.channel] ?? selected.channel}</span>
                    <span>{formatDate(selected.sent_at)}</span>
                  </div>
                </header>
                <div className="inbox-detail-body">{selected.body}</div>
              </>
            ) : (
              <p className="inbox-empty">בחר הודעה מהרשימה</p>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
