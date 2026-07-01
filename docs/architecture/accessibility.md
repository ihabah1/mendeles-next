# Accessibility

Mendeles targets **WCAG 2.2 Level AA** and **Israeli Standard 5568 (ת"י 5568)**.

## User-facing features

| Feature | Location |
|---------|----------|
| Floating accessibility widget | All pages (`AccessibilityWidget`) |
| Skip to main content | Keyboard-first link at top of every page |
| Accessibility statement | `/accessibility` (HE/EN via next-intl) |
| Preference persistence | `localStorage` key `mendeles-a11y` |

### Widget options

- Text scale (100%–140%)
- High contrast
- Link highlight / underline
- Readable font
- Reduce motion (also respects `prefers-reduced-motion` on first visit)

## Production configuration

Set these environment variables **before launch** (see `frontend/.env.example`):

```env
NEXT_PUBLIC_A11Y_COORDINATOR_NAME=
NEXT_PUBLIC_A11Y_COORDINATOR_EMAIL=
NEXT_PUBLIC_A11Y_COORDINATOR_PHONE=
NEXT_PUBLIC_A11Y_STATEMENT_UPDATED=2026-01-01
```

Until configured, the accessibility statement shows explicit placeholders — no fabricated contact details.

Implementation: `frontend/lib/a11y/site-config.ts`

## Architecture

```
frontend/lib/a11y/
  types.ts          — preference shape
  preferences.ts    — load/save/apply + early hydration script
  context.tsx       — React provider
  site-config.ts    — statement coordinator fields (env)
  focus-trap.ts     — dialog focus management
  use-focus-trap.ts — hook for widget panel

frontend/components/a11y/
  accessibility-widget.tsx
  accessibility-coordinator.tsx
  skip-to-content.tsx
```

Global styles: `frontend/app/globals.css` (`.a11y-*`, `.skip-link`, `prefers-reduced-motion`)

## Automated checks

From `frontend/`:

```bash
npm run build
npm run start          # terminal 1
npm run test:a11y      # axe + Playwright keyboard/semantics tests
npm run audit:lighthouse
```

### What is covered

| Check | Tool |
|-------|------|
| WCAG 2.2 AA rules (automated) | axe-core via Playwright (`e2e/a11y.spec.ts`) |
| Lighthouse accessibility score | `scripts/a11y-lighthouse.mjs` |
| Keyboard navigation | Playwright (`skip link`, widget, login) |
| Screen reader semantics | Playwright (landmarks, headings, video labels) |
| Responsive widget/nav | Playwright (375px viewport) |

## Audit results (latest)

| Page | Lighthouse a11y | axe (WCAG 2.2 AA) |
|------|-----------------|-------------------|
| `/` | 100 | pass |
| `/accessibility` | 100 | pass |
| `/login` | 100 | pass |
| `/company` | — | pass |

Playwright suite `e2e/a11y.spec.ts` also verifies keyboard navigation, mobile layout, and screen-reader landmarks.

Automated tools cannot fully certify WCAG compliance. Manual verification with NVDA/VoiceOver and real-user testing is still recommended before launch.

## Pre-launch checklist

See the full published checklist: **[accessibility-checklist.md](../accessibility-checklist.md)**.

Quick summary:
- [ ] Set `NEXT_PUBLIC_A11Y_COORDINATOR_*` env vars
- [ ] Set `NEXT_PUBLIC_A11Y_STATEMENT_UPDATED`
- [ ] Run `npm run test:a11y` — zero serious/critical axe violations
- [ ] Run `npm run audit:lighthouse` — score ≥ 90 on `/`, `/accessibility`, `/login`
- [ ] Manual screen reader pass on homepage, statement page, login, dashboard
- [ ] Verify promo video captions/transcripts if required for your content policy

## Known limitations

- Promo videos use native controls with text descriptions; timed captions (WebVTT) are not bundled yet.
- Coordinator contact block shows placeholders until env vars are set (by design).
