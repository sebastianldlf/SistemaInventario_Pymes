import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={cn("h-5 w-5", className)}>
      <rect x="2" y="3.5" width="16" height="3.5" rx="1" />
      <rect x="2" y="8.5" width="16" height="3.5" rx="1" opacity="0.5" />
      <rect x="2" y="13.5" width="4" height="3" rx="0.75" />
      <rect x="8" y="13.5" width="4" height="3" rx="0.75" />
      <rect x="14" y="13.5" width="4" height="3" rx="0.75" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight", className)}>
      <LogoMark />
      Tarima
    </Link>
  );
}
