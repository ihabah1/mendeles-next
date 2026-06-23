"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROFILE_TABS } from "./profile-tabs";

export default function ProfileNavDropdown() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, insetInlineEnd: 0 });
  const isProfile = Boolean(path?.startsWith("/profile"));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 2,
        insetInlineEnd: window.innerWidth - rect.right,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const menu =
    open && mounted ? (
      <div
        ref={menuRef}
        className="nav-profile-menu nav-profile-menu-portal"
        role="menu"
        aria-label="תפריט פרופיל"
        style={{
          position: "fixed",
          top: menuPos.top,
          insetInlineEnd: menuPos.insetInlineEnd,
        }}
      >
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
    ) : null;

  return (
    <div className="nav-profile-dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
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
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
