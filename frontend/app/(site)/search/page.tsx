"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { SEARCH_TARGETS, type SearchTarget } from "@/lib/search-targets";

const MAX_SUGGESTIONS = 8;

function filterTargets(query: string): SearchTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const starts: SearchTarget[] = [];
  const contains: SearchTarget[] = [];
  for (const target of SEARCH_TARGETS) {
    const label = target.label.toLowerCase();
    const normalized = `${target.label} ${target.subtitle} ${target.code} ${target.href}`.toLowerCase();
    if (label.startsWith(q)) starts.push(target);
    else if (normalized.includes(q)) contains.push(target);
  }
  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => filterTargets(query), [query]);

  const completionHint = useMemo(() => {
    const q = query.trim();
    if (!q) return "";
    const first = results[0];
    if (first && first.label.toLowerCase().startsWith(q.toLowerCase()) && first.label.length > q.length) {
      return first.label.slice(q.length);
    }
    return "";
  }, [query, results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const select = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const navigateToMatch = () => {
    const q = query.trim();
    if (!q) return;
    const target = results[activeIndex] ?? results[0];
    if (target) select(target.href);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToMatch();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && results.length) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if ((event.key === "Tab" || event.key === "ArrowLeft") && completionHint) {
      event.preventDefault();
      setQuery(query + completionHint);
      setOpen(true);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showSuggestions = open && query.trim().length > 0;

  return (
    <>
      <Nav />
      <main className="search-page">
        <h1 className="search-page-title">חיפוש באתר</h1>
        <p className="search-page-subtitle">חפש דף לפי שם, תיאור או קוד דף</p>

        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="page-search-input" className="sr-only">
            חיפוש דפים
          </label>
          <div className="search-combobox" ref={wrapRef}>
          <div className="search-form-row">
            <div className="search-input-wrap">
              {completionHint && (
                <span className="search-completion" aria-hidden>
                  <span className="search-completion-typed">{query}</span>
                  <span className="search-completion-rest">{completionHint}</span>
                </span>
              )}
              <input
                id="page-search-input"
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                onFocus={() => {
                  if (query.trim()) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                className="search-input"
                placeholder="הקלד מילת חיפוש"
                aria-label="חפש דף"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="search-suggestions"
                autoComplete="off"
                role="combobox"
              />
            </div>
            <button type="submit" className="btn btn-gold search-submit-btn">
              חיפוש
            </button>
          </div>

          {showSuggestions && (
            <ul id="search-suggestions" className="search-suggestions" role="listbox">
              {results.length ? (
                results.map((target, idx) => (
                  <li key={target.href} role="option" aria-selected={idx === activeIndex}>
                    <button
                      type="button"
                      className={`search-item${idx === activeIndex ? " active" : ""}`}
                      onClick={() => select(target.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <span>
                        <span>{target.label}</span>
                        <div className="search-item-subtitle">{target.subtitle}</div>
                      </span>
                      <span className="search-item-code">{target.code}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="search-empty" role="option">
                  לא נמצאו תוצאות
                </li>
              )}
            </ul>
          )}
          </div>
        </form>
      </main>
    </>
  );
}
