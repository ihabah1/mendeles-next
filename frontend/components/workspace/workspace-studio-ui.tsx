"use client";

import { cn } from "@/lib/utils";

export const WORKSPACE_BRAND = "#6F42F5";
export const WORKSPACE_BRAND_HOVER = "#5a32d4";

export function StudioPanel({
  title,
  subtitle,
  step,
  accent,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  step?: number;
  accent?: "purple" | "emerald" | "amber" | "sky";
  children: React.ReactNode;
  className?: string;
}) {
  const accentBorder = {
    purple: "border-[#6F42F5]/25",
    emerald: "border-emerald-500/25",
    amber: "border-amber-500/25",
    sky: "border-sky-500/25",
  }[accent ?? "purple"];

  const accentGlow = {
    purple: "from-[#6F42F5]/8",
    emerald: "from-emerald-500/8",
    amber: "from-amber-500/8",
    sky: "from-sky-500/8",
  }[accent ?? "purple"];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-[#12182a]/90 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md",
        accentBorder,
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent", accentGlow)} />
      <div className="relative flex items-start gap-3">
        {step != null && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6F42F5]/20 text-sm font-bold text-[#c4b5fd] ring-1 ring-[#6F42F5]/40">
            {step}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="relative mt-4 flex flex-col">{children}</div>
    </section>
  );
}

export function ModeSegment({
  active,
  onClick,
  icon,
  title,
  description,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "now" | "automation";
}) {
  const activeStyles =
    tone === "now"
      ? "border-[#6F42F5] bg-[#6F42F5]/15 shadow-[0_0_24px_rgba(111,66,245,0.25)] ring-1 ring-[#6F42F5]/50"
      : "border-emerald-500 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-2xl border p-4 text-start transition-all duration-200",
        active ? activeStyles : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl text-lg transition",
          active
            ? tone === "now"
              ? "bg-[#6F42F5] text-white"
              : "bg-emerald-600 text-white"
            : "bg-white/10 text-slate-300 group-hover:bg-white/15",
        )}
      >
        {icon}
      </span>
      <span className="mt-3 block font-semibold text-white">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-400">{description}</span>
    </button>
  );
}

export function OutputPill({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-[#6F42F5] bg-[#6F42F5] text-white shadow-md shadow-[#6F42F5]/30"
          : "border-white/15 bg-white/5 text-slate-300 hover:border-[#6F42F5]/40 hover:text-white",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}

export function OptionCard({
  checked,
  onChange,
  title,
  description,
  tone = "neutral",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  tone?: "neutral" | "amber" | "purple" | "sky";
}) {
  const toneStyles = {
    neutral: checked ? "border-white/30 bg-white/10" : "border-white/10 bg-white/[0.03]",
    amber: checked ? "border-amber-400/50 bg-amber-500/15" : "border-amber-500/20 bg-amber-500/5",
    purple: checked ? "border-[#6F42F5]/50 bg-[#6F42F5]/10" : "border-[#6F42F5]/20 bg-[#6F42F5]/5",
    sky: checked ? "border-sky-400/50 bg-sky-500/15" : "border-sky-500/20 bg-sky-500/5",
  }[tone];

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
        toneStyles,
      )}
    >
      <input
        type="checkbox"
        className="mt-1 accent-[#6F42F5]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-400">{description}</span>
      </span>
    </label>
  );
}

export function DomainTile({
  selected,
  onClick,
  icon,
  label,
  variant = "business",
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  variant?: "business" | "news";
}) {
  const selectedStyle =
    variant === "news"
      ? "border-amber-400 bg-amber-500/20 text-white shadow-[0_0_16px_rgba(245,158,11,0.15)]"
      : "border-[#6F42F5] bg-[#6F42F5]/20 text-white shadow-[0_0_16px_rgba(111,66,245,0.2)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-start text-sm transition-all duration-150",
        selected ? selectedStyle : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]",
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="mt-1.5 block font-medium leading-tight">{label}</span>
    </button>
  );
}
