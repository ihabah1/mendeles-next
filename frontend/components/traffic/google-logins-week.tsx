"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { usersHubApi } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

type Props = {
  enabled?: boolean;
};

export function GoogleLoginsWeek({ enabled = true }: Props) {
  const hub = useQuery({
    queryKey: ["users-hub-traffic-google", 7],
    queryFn: () => usersHubApi.get(7),
    enabled,
    refetchInterval: 60_000,
  });

  if (!enabled) {
    return (
      <Card>
        <h2 className="font-semibold">כניסות עם Google</h2>
        <p className="mt-2 text-sm text-[var(--muted-fg)]">
          אין הרשאה לצפות בנתוני כניסות משתמשים.
        </p>
      </Card>
    );
  }

  if (hub.isLoading) {
    return (
      <Card>
        <h2 className="font-semibold">כניסות עם Google</h2>
        <p className="mt-2 text-sm text-[var(--muted-fg)]">טוען כניסות...</p>
      </Card>
    );
  }

  if (hub.isError || !hub.data) {
    return (
      <Card>
        <h2 className="font-semibold">כניסות עם Google</h2>
        <p className="mt-2 text-sm text-red-600">לא ניתן לטעון את נתוני הכניסות.</p>
      </Card>
    );
  }

  const daily = hub.data.daily_google_logins ?? [];
  const max = Math.max(1, ...daily.map((d) => d.count));
  const total = hub.data.stats.google_logins_period ?? 0;
  const last24 = hub.data.stats.google_logins_24h ?? 0;
  const unique = hub.data.stats.google_unique_emails_period ?? 0;
  const recent = hub.data.recent_google_logins ?? [];

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">כניסות עם Google</h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">
            כניסות יומיות דרך חשבון Google — 7 הימים האחרונים
            {hub.data.scope === "platform" ? " · כל הפלטפורמה" : " · הארגון שלך"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#6F42F5]/10 px-3 py-1 font-medium text-[#6F42F5]">
            {last24} ב־24 שע׳
          </span>
          <span className="rounded-full bg-[var(--muted)] px-3 py-1 font-medium">
            {total} בשבוע
          </span>
          <span className="rounded-full bg-[var(--muted)] px-3 py-1 font-medium">
            {unique} אימיילים ייחודיים
          </span>
        </div>
      </div>

      {daily.length === 0 ? (
        <p className="text-sm text-[var(--muted-fg)]">אין עדיין כניסות Google בתקופה זו.</p>
      ) : (
        <div className="space-y-3">
          <div
            className="flex h-40 items-end gap-2 sm:gap-3"
            role="img"
            aria-label="גרף כניסות Google לפי יום"
          >
            {daily.map((row) => {
              const heightPct = Math.max(row.count > 0 ? 12 : 4, Math.round((row.count / max) * 100));
              const label = new Date(row.date).toLocaleDateString("he-IL", {
                weekday: "short",
                day: "numeric",
              });
              return (
                <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums">{row.count}</span>
                  <div className="flex h-28 w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-t-md transition-all",
                        row.count > 0 ? "bg-[#6F42F5]" : "bg-[var(--muted)]",
                      )}
                      style={{ height: `${heightPct}%` }}
                      title={`${label}: ${row.count}`}
                    />
                  </div>
                  <span className="truncate text-[10px] text-[var(--muted-fg)] sm:text-xs">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recent.length > 0 ? (
        <div className="border-t border-[var(--border)] pt-4">
          <h3 className="text-sm font-semibold">כניסות Google אחרונות</h3>
          <ul className="mt-2 divide-y divide-[var(--border)] text-sm">
            {recent.slice(0, 8).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.user_email || "—"}</p>
                  <p className="text-xs text-[var(--muted-fg)]">{row.ip_address || "—"}</p>
                </div>
                <time className="shrink-0 text-xs text-[var(--muted-fg)]">
                  {row.created_at ? new Date(row.created_at).toLocaleString("he-IL") : "—"}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
