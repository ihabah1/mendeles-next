"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";

export default function InboxRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users?tab=inbox");
  }, [router]);
  return null;
}
