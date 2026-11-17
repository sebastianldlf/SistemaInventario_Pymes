import type { Metadata } from "next";
import Link from "next/link";
import { getInventoryOverview } from "@/app/actions/inventory";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Inventario · Tarima" };

export default async function InventoryPage() {
  const overview = await getInventoryOverview();

  return (
    <main className="flex h-screen flex-col bg-zinc-50/60">
      <nav className="shrink-0 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-border">/</span>
            <span className="text-sm text-muted-foreground">Inventario</span>
          </div>
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Inicio
          </Link>
        </div>
      </nav>
      <InventoryTable overview={overview} />
    </main>
  );
}
