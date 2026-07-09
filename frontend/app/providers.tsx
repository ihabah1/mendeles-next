"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SiteErrorReporter } from "@/components/errors/site-error-reporter";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <SiteErrorReporter />
      {children}
    </QueryClientProvider>
  );
}
