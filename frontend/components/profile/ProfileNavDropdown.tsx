"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROFILE_TABS } from "./profile-tabs";

export default function ProfileNavDropdown() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isProfile = Boolean(path?.startsWith("/profile"));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <div className="nav-profile-dropdown" ref={ref}>
      <button
        type="button"
        className={`nav-link nav-profile-trigger${isProfile ? " active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        פרופיל
        <span className="nav-profile-chevron" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="nav-profile-menu" role="menu" aria-label="תפריט פרופיל">
          {PROFILE_TABS.map((tab) => {
            const active =
              path === tab.href || (path?.startsWith(tab.href + "/") ?? false);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                role="menuitem"
                className={`nav-profile-menu-item${active ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="nav-profile-menu-icon" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
