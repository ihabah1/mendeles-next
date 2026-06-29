import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function HomePage() {
  const t = await getTranslations("common");
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 p-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{t("appName")}</h1>
        <p className="mt-2 text-lg text-[var(--muted-fg)]">{t("tagline")}</p>
      </div>
      <Card className="flex flex-wrap gap-3">
        <Link href="/login">
          <Button>התחברות</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline">הרשמה</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost">דשבורד</Button>
        </Link>
      </Card>
    </div>
  );
}
