import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        ok: "border-emerald-600/25 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        warn: "border-amber-600/30 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        danger: "border-red-600/30 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
