"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";

export default function EmailReleaseRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users?tab=release");
  }, [router]);
  return null;
}
