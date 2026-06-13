"use client";

import type { ReactNode } from "react";

/* ── Page shell ── */

export function AdminShell({
  children,
  maxWidth = 1100,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="admin-page-wrap" style={{ maxWidth }}>
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header-text">
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-desc">{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

/* ── Feedback ── */

export function AdminAlert({
  type,
  children,
  live = true,
}: {
  type: "error" | "success" | "info";
  children: ReactNode;
  live?: boolean;
}) {
  const cls =
    type === "error" ? "result-fail" : type === "success" ? "result-pass" : "admin-alert-info";
  return (
    <div
      className={`admin-alert ${cls}`}
      role={live ? "status" : undefined}
      aria-live={live ? "polite" : undefined}
    >
      {children}
    </div>
  );
}

export function AdminLoading({ label = "טוען נתונים…" }: { label?: string }) {
  return (
    <p className="admin-loading" role="status" aria-live="polite">
      <span className="admin-spinner" aria-hidden />
      {label}
    </p>
  );
}

export function AdminEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="admin-empty" role="status">
      <p className="admin-empty-title">{title}</p>
      {hint && <p className="admin-empty-hint">{hint}</p>}
    </div>
  );
}

/* ── Stats & panels ── */

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className="admin-stat-grid">{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <article
      className="admin-stat-card card"
      aria-label={`${label}: ${value}${sub ? `, ${sub}` : ""}`}
    >
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </article>
  );
}

export function AdminPanel({
  title,
  children,
  id,
  className,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: ReactNode;
  id?: string;
  className?: string;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  return (
    <section className={`admin-panel card ${className ?? ""}`} id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <details className="admin-panel-details" open={defaultOpen}>
        <summary className="admin-panel-summary">
          <h2 className="admin-panel-title" id={id ? `${id}-title` : undefined}>
            {title}
          </h2>
          {badge !== undefined && (
            <span className="admin-panel-badge" aria-label={`${badge} רשומות`}>
              {badge}
            </span>
          )}
          <span className="admin-panel-chevron" aria-hidden />
        </summary>
        <div className="admin-panel-body">{children}</div>
      </details>
    </section>
  );
}

export function AdminTwoCol({ children }: { children: ReactNode }) {
  return <div className="admin-two-col">{children}</div>;
}

/* ── Tabs ── */

export type AdminTabItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function AdminTabBar<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: AdminTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="admin-tabbar" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`admin-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`admin-tabpanel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`admin-tabbar-btn${selected ? " admin-tabbar-btn--active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="admin-tabbar-count" aria-hidden>
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AdminTabPanel<T extends string>({
  tabId,
  activeTab,
  children,
  labelledBy,
}: {
  tabId: T;
  activeTab: T;
  children: ReactNode;
  labelledBy?: string;
}) {
  if (activeTab !== tabId) return null;
  return (
    <div
      role="tabpanel"
      id={`admin-tabpanel-${tabId}`}
      aria-labelledby={labelledBy ?? `admin-tab-${tabId}`}
      className="admin-tabpanel"
    >
      {children}
    </div>
  );
}

/* ── Table ── */

export function AdminDataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Toolbar ── */

export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className="admin-toolbar">{children}</div>;
}

export function AdminRefreshButton({
  onClick,
  loading,
  label = "רענן נתונים",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      <span aria-hidden>🔄</span> {loading ? "טוען…" : label}
    </button>
  );
}
