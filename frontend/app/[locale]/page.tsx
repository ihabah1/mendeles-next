import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage() {
  const tCommon = await getTranslations("common");
  const tAuth = await getTranslations("auth");
  const tNav = await getTranslations("nav");

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{tCommon("appName")}</h1>
          <p className="mt-2 text-lg text-[var(--muted-fg)]">{tCommon("tagline")}</p>
        </div>
        <LocaleSwitcher />
      </div>
      <Card className="flex flex-wrap gap-3">
        <Link href="/login">
          <Button>{tAuth("login")}</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline">{tAuth("register")}</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost">{tNav("dashboard")}</Button>
        </Link>
      </Card>
    </div>
  );
}
