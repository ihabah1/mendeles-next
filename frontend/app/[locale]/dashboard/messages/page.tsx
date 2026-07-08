"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";

export default function MessagesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users?tab=messages");
  }, [router]);
  return null;
}
