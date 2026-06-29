"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { settingsApi } from "@/lib/api/dashboard";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  const [companyName, setCompanyName] = useState("");
  const mutation = useMutation({
    mutationFn: () => settingsApi.update({ "company.name": companyName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const name = (data?.["company.name"] as string) || "";

  return (
    <Card>
      <h1 className="text-xl font-bold">הגדרות</h1>
      {isLoading ? (
        <p className="mt-4 text-sm">טוען…</p>
      ) : (
        <form
          className="mt-4 space-y-3 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <label className="block text-sm">שם החברה</label>
          <Input
            defaultValue={name}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={name}
          />
          <Button type="submit" disabled={mutation.isPending}>
            שמור
          </Button>
        </form>
      )}
    </Card>
  );
}
