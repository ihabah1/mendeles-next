"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { contentApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";

export default function ContentPage() {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("content.view");
  const canCreate = hasPermission("content.create");
  const canPublish = hasPermission("content.publish");
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  const pages = useQuery({
    queryKey: ["content-pages"],
    queryFn: () => contentApi.listPages(),
    enabled: canView,
  });

  const createMutation = useMutation({
    mutationFn: () => contentApi.createPage({ title, slug: slug || undefined, page_type: "landing_page" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-pages"] });
      setTitle("");
      setSlug("");
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => contentApi.publishPage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-pages"] }),
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
      </div>

      {canCreate && (
        <Card>
          <h2 className="font-semibold">{t("createPage")}</h2>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <Input
              placeholder={t("pageTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              placeholder={t("pageSlug")}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <Button type="submit" disabled={createMutation.isPending || !title}>
              {t("create")}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">{t("pages")}</h2>
        {pages.isLoading ? (
          <p className="mt-3 text-sm">{tc("loading")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-start">
                  <th className="p-2">{t("pageTitle")}</th>
                  <th className="p-2">{t("path")}</th>
                  <th className="p-2">{t("status")}</th>
                  <th className="p-2">{t("version")}</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {pages.data?.results.map((page) => (
                  <tr key={page.id} className="border-b border-[var(--border)]">
                    <td className="p-2">{page.title}</td>
                    <td className="p-2 font-mono text-xs">{page.full_path}</td>
                    <td className="p-2">{page.status}</td>
                    <td className="p-2">{page.published_version || "—"}</td>
                    <td className="p-2">
                      {canPublish && page.status !== "published" && (
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          disabled={publishMutation.isPending}
                          onClick={() => publishMutation.mutate(page.id)}
                        >
                          {t("publish")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!pages.data?.results.length && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[var(--muted-fg)]">
                      {t("empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
