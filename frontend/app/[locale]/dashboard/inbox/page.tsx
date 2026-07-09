"use client";

import { useTranslations } from "next-intl";
import { InboxPanel } from "@/components/users/inbox-panel";

export default function InboxPage() {
  const t = useTranslations("inbox");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <InboxPanel />
    </div>
  );
}
