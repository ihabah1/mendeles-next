"use client";

import { useMemo } from "react";

const DRAG_MIME = "application/x-research-keyword";

export function parseKeywordLines(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}

type KeywordChipFieldProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
};

export function KeywordChipField({ value, onChange, placeholder, className = "" }: KeywordChipFieldProps) {
  const chips = useMemo(() => parseKeywordLines(value), [value]);

  function setChips(next: string[]) {
    onChange(next.join("\n"));
  }

  function removeChip(keyword: string) {
    setChips(chips.filter((chip) => chip !== keyword));
  }

  function addChip(keyword: string) {
    const normalized = keyword.trim();
    if (!normalized || chips.includes(normalized)) return;
    setChips([...chips, normalized]);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const fromCustom = event.dataTransfer.getData(DRAG_MIME);
    const fromText = event.dataTransfer.getData("text/plain");
    addChip(fromCustom || fromText);
  }

  return (
    <div className={className}>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="min-h-28 rounded-xl border border-dashed border-[#6F42F5]/40 bg-[#0b1020] p-3 transition focus-within:border-[#6F42F5]/70"
      >
        {chips.length === 0 ? (
          <p className="text-xs text-slate-500">
            גררו ביטויים מטבלת המחקר לכאן, או הקלידו למטה.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#6F42F5]/50 bg-[#6F42F5]/20 px-3 py-1 text-sm text-[#ede9fe]"
              >
                {chip}
                <button
                  type="button"
                  className="rounded-full px-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={() => removeChip(chip)}
                  aria-label={`הסר ${chip}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          className="mt-2 w-full border-0 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
          placeholder={placeholder ?? "הקלידו מילה ולחצו Enter…"}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const input = event.currentTarget;
            addChip(input.value);
            input.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function researchKeywordDragProps(keyword: string) {
  return {
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.setData(DRAG_MIME, keyword);
      event.dataTransfer.setData("text/plain", keyword);
      event.dataTransfer.effectAllowed = "copy";
    },
    className: "cursor-grab active:cursor-grabbing",
    title: "גרור לשדה מילות המפתח",
  };
}
