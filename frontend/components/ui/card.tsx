import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm", className)}
      {...props}
    />
  );
}
