import { Boxes } from "lucide-react";
import { getInventoryOverview } from "@/app/actions/inventory";
import { InventoryTable } from "@/components/inventory/InventoryTable";

export const dynamic = "force-dynamic";

export default async function Page() {
  const overview = await getInventoryOverview();

  return (
    <main className="flex h-screen flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
        <Boxes className="h-4 w-4" />
        <h1 className="text-sm font-semibold">Inventario</h1>
        <span className="text-muted-foreground">/ Existencias por almacén</span>
      </header>
      <InventoryTable overview={overview} />
    </main>
  );
}
