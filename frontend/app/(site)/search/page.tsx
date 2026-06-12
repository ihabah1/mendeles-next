"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { SEARCH_TARGETS, type SearchTarget } from "@/lib/search-targets";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_TARGETS;
    // Autocomplete ranking: label prefix matches first, then any match.
    const starts: SearchTarget[] = [];
    const contains: SearchTarget[] = [];
    for (const target of SEARCH_TARGETS) {
      const label = target.label.toLowerCase();
      const normalized = `${target.label} ${target.subtitle} ${target.code} ${target.href}`.toLowerCase();
      if (label.startsWith(q)) starts.push(target);
      else if (normalized.includes(q)) contains.push(target);
    }
    return [...starts, ...contains];
  }, [query]);

  /** Inline autocomplete hint — rest of the first label that starts with the query. */
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

  const select = (href: string) => router.push(href);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = results[activeIndex] ?? results[0];
    if (target) select(target.href);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if ((event.key === "Tab" || event.key === "ArrowLeft") && completionHint) {
      event.preventDefault();
      setQuery(query + completionHint);
    }
  };

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
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
              placeholder="הקלד מילת חיפוש"
              aria-label="חפש דף"
              autoComplete="off"
            />
          </div>
        </form>

        <div className="search-list">
          {results.length ? (
            results.map((target, idx) => (
              <button
                key={target.href}
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
            ))
          ) : (
            <div className="search-empty">לא נמצאו תוצאות</div>
          )}
        </div>
      </main>
    </>
  );
}
