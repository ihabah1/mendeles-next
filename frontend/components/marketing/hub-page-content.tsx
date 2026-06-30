import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";

type HubLink = {
  href: string;
  label: string;
  description?: string;
};

type Props = {
  title: string;
  subtitle: string;
  links?: HubLink[];
  children?: ReactNode;
};

export function HubPageContent({ title, subtitle, links, children }: Props) {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted-fg)]">{subtitle}</p>
        {links && links.length > 0 && (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 transition hover:border-[var(--accent)]/40 hover:shadow-sm"
                >
                  <span className="font-semibold">{link.label}</span>
                  {link.description && (
                    <span className="mt-2 text-sm text-[var(--muted-fg)]">{link.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </section>
  );
}

type DetailProps = {
  title: string;
  subtitle: string;
  body: string;
  backHref: string;
  backLabel: string;
  ctaLabel: string;
};

export function DetailPageContent({ title, subtitle, body, backHref, backLabel, ctaLabel }: DetailProps) {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="text-sm font-medium text-[var(--accent)] hover:underline">
          ← {backLabel}
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 text-lg text-[var(--muted-fg)]">{subtitle}</p>
        <p className="mt-6 leading-relaxed text-[var(--muted-fg)]">{body}</p>
        <Link
          href="/register"
          className="mt-10 inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
