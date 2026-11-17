import { cn } from "@/lib/utils";

const dot = {
  neutral: "bg-zinc-400",
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
} as const;

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof dot }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px] text-foreground/80", className)} {...props}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot[variant])} />
      {children}
    </span>
  );
}
