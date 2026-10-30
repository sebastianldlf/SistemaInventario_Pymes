import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const field =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:border-foreground/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/[0.06] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(field, className)} {...props} />,
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full">
      <select ref={ref} className={cn(field, "cursor-pointer appearance-none pr-8", className)} {...props} />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[13px] font-medium text-foreground/80", className)} {...props} />;
}
