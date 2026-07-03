import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "outline" | "ghost";
type Size = "default" | "sm";

const variants: Record<Variant, string> = {
  default: "bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90",
  outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--muted)]",
  ghost: "hover:bg-[var(--muted)]",
};

const sizes: Record<Size, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition disabled:opacity-50",
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";
