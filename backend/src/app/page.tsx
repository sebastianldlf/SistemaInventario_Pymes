import Link from "next/link";
import { ArrowRight, Ban, Boxes, Calculator, FileLock2, Search, TriangleAlert } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const container = "mx-auto w-full max-w-6xl px-6 lg:px-8";

const primaryCta =
  "inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85";
const secondaryCta =
  "inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground";

const FEATURES = [
  {
    icon: Boxes,
    title: "Existencias por almacén",
    text: "Cantidades separadas por cada almacén y un total consolidado por producto, en una sola tabla.",
  },
  {
    icon: FileLock2,
    title: "Kardex inmutable",
    text: "Cada movimiento agrega una fila con saldo, costo unitario y costo total. Ninguna fila se edita ni se borra.",
  },
  {
    icon: Calculator,
    title: "Costo promedio ponderado",
    text: "Se recalcula en cada entrada. Las salidas se valorizan al costo vigente, sin cálculos manuales.",
  },
  {
    icon: TriangleAlert,
    title: "Alertas de reposición",
    text: "Un producto pasa a bajo mínimo cuando su stock total alcanza el mínimo definido, y a agotado cuando no queda nada.",
  },
  {
    icon: Ban,
    title: "Sin stock negativo",
    text: "Una salida que dejaría el almacén en negativo se rechaza. Los movimientos simultáneos se procesan en orden.",
  },
  {
    icon: Search,
    title: "Búsqueda inmediata",
    text: "Encuentre productos por SKU, código de barras o nombre y filtre por categoría o estado de stock.",
  },
];

const MOVEMENTS = [
  {
    name: "Entrada por compra",
    sign: "+",
    points: ["Aumenta el stock del almacén elegido", "Exige el costo unitario de la compra", "Recalcula el costo promedio"],
  },
  {
    name: "Salida por venta",
    sign: "−",
    points: ["Disminuye el stock del almacén elegido", "Se valoriza al costo promedio vigente", "Verifica que haya existencias suficientes"],
  },
  {
    name: "Ajuste",
    sign: "±",
    points: ["Aumenta o disminuye según el sentido indicado", "Para conteos físicos, mermas o correcciones", "Las salidas también validan disponibilidad"],
  },
];

const KARDEX_EXAMPLE = [
  { type: "Entrada por compra", qty: "+100", cost: "0.50", balance: "100", avg: "0.50", total: "50.00" },
  { type: "Entrada por compra", qty: "+100", cost: "0.60", balance: "200", avg: "0.55", total: "110.00" },
  { type: "Salida por venta", qty: "−50", cost: "0.55", balance: "150", avg: "0.55", total: "82.50" },
];

const PREVIEW_ROWS = [
  { sku: "ELE-0001", name: "Cable THW 14 AWG (rollo 100 m)", a: "950", b: "0", total: "950", status: "ok" as const },
  { sku: "ELE-0002", name: "Interruptor simple 10A", a: "0", b: "12", total: "12", status: "warn" as const },
  { sku: "FER-0001", name: "Martillo carpintero 16 oz", a: "40", b: "6", total: "46", status: "ok" as const },
  { sku: "FER-0002", name: "Destornillador Phillips #2", a: "0", b: "0", total: "0", status: "danger" as const },
];

const STATUS_LABEL = { ok: "Disponible", warn: "Bajo mínimo", danger: "Agotado" };

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className={cn(container, "flex h-16 items-center justify-between")}>
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#funciones" className="transition-colors hover:text-foreground">
              Funciones
            </a>
            <a href="#costeo" className="transition-colors hover:text-foreground">
              Costeo
            </a>
            <a href="#movimientos" className="transition-colors hover:text-foreground">
              Movimientos
            </a>
          </nav>
          <Link href="/inventario" className="inline-flex h-9 items-center rounded-md border px-3.5 text-sm font-medium transition-colors hover:bg-muted">
            Abrir inventario
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] opacity-60"
          />
          <div className={cn(container, "relative pb-20 pt-20 lg:pt-28")}>
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-muted-foreground">Inventario y Kardex para pequeñas y medianas empresas</p>
              <h1 className="mt-5 text-balance text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
                Sepa cuánto tiene, dónde está y cuánto vale.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Tarima registra cada entrada y salida en un Kardex que no se puede alterar, recalcula el costo promedio en
                cada compra y le indica qué productos reponer, en todos sus almacenes.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-2">
                <Link href="/inventario" className={primaryCta}>
                  Abrir inventario
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#costeo" className={secondaryCta}>
                  Cómo se calcula el costo
                </a>
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        {/* Funciones */}
        <section id="funciones" className="scroll-mt-16 border-t">
          <div className={cn(container, "py-24")}>
            <SectionHeading
              eyebrow="Funciones"
              title="Lo necesario para controlar el stock, nada más."
              text="Una tabla de existencias, un registro de movimientos y un costo que se calcula solo."
            />
            <div className="mt-14 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-background p-7">
                  <Icon className="h-5 w-5 text-foreground/70" />
                  <h3 className="mt-5 font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Costeo */}
        <section id="costeo" className="scroll-mt-16 border-t bg-zinc-50/70">
          <div className={cn(container, "grid gap-14 py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center")}>
            <div>
              <SectionHeading
                eyebrow="Costeo"
                title="Costo promedio ponderado, calculado en cada entrada."
                text="Cuando ingresa mercadería, el costo del producto se actualiza combinando lo que ya tenía con lo que acaba de comprar. Las salidas usan ese costo y no lo modifican."
              />
              <div className="mt-8 rounded-lg border bg-background px-5 py-4 font-mono text-[13px] leading-relaxed">
                <span className="text-muted-foreground">CPP =</span> (stock × CPP + cantidad × costo)
                <br />
                <span className="invisible">CPP =</span> <span className="text-muted-foreground">/</span> (stock + cantidad)
              </div>
            </div>

            <figure className="overflow-hidden rounded-xl border bg-background">
              <figcaption className="flex items-center justify-between border-b px-5 py-3.5 text-[13px]">
                <span className="font-medium">Kardex · Ejemplo</span>
                <span className="text-muted-foreground">Un producto, un almacén</span>
              </figcaption>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-5 py-2.5 text-left font-medium">Movimiento</th>
                      <th className="px-3 py-2.5 text-right font-medium">Cant.</th>
                      <th className="px-3 py-2.5 text-right font-medium">Costo unit.</th>
                      <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
                      <th className="px-3 py-2.5 text-right font-medium">CPP</th>
                      <th className="px-5 py-2.5 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {KARDEX_EXAMPLE.map((k, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-5 py-3.5">{k.type}</td>
                        <td className={cn("px-3 py-3.5 text-right", k.qty.startsWith("−") ? "text-red-600" : "text-emerald-700")}>{k.qty}</td>
                        <td className="px-3 py-3.5 text-right text-muted-foreground">{k.cost}</td>
                        <td className="px-3 py-3.5 text-right">{k.balance}</td>
                        <td className={cn("px-3 py-3.5 text-right", i === 1 && "font-semibold")}>{k.avg}</td>
                        <td className="px-5 py-3.5 text-right">{k.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t px-5 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
                La segunda compra sube el costo a 0.55: (100 × 0.50 + 100 × 0.60) / 200. La venta posterior sale a ese mismo
                costo y deja 150 unidades valorizadas en 82.50.
              </p>
            </figure>
          </div>
        </section>

        {/* Movimientos */}
        <section id="movimientos" className="scroll-mt-16 border-t">
          <div className={cn(container, "py-24")}>
            <SectionHeading
              eyebrow="Movimientos"
              title="Tres tipos de movimiento cubren la operación diaria."
              text="Cada uno se registra en una sola operación: actualiza el stock, el costo y el Kardex a la vez, y admite una referencia como factura, guía o motivo."
            />
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {MOVEMENTS.map((m) => (
                <div key={m.name} className="rounded-xl border p-7">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold tracking-tight">{m.name}</h3>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border font-mono text-sm text-muted-foreground">
                      {m.sign}
                    </span>
                  </div>
                  <ul className="mt-6 space-y-3 text-[15px] text-muted-foreground">
                    {m.points.map((p) => (
                      <li key={p} className="flex gap-3">
                        <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-foreground/30" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className={cn(container, "py-24")}>
            <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-zinc-950 px-8 py-12 text-zinc-50 sm:px-12 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Empiece con su primera entrada.</h2>
                <p className="mt-3 max-w-xl text-zinc-400">
                  Registre una compra y vea cómo se actualizan el stock, el costo promedio y el Kardex.
                </p>
              </div>
              <Link
                href="/inventario"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                Abrir inventario
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className={cn(container, "flex flex-col gap-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between")}>
          <div className="flex items-center gap-2 text-foreground">
            <LogoMark className="h-4 w-4" />
            <span className="font-medium">Tarima</span>
            <span className="text-muted-foreground">· Inventario y Kardex para PyMEs</span>
          </div>
          <p>© {new Date().getFullYear()} Tarima</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">{title}</h2>
      <p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="mt-16 lg:mt-20">
      <div className="rounded-2xl border bg-zinc-50/80 p-2 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.18)]">
        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="flex h-11 items-center justify-between border-b px-5">
            <div className="flex items-center gap-2 text-[13px]">
              <LogoMark className="h-4 w-4" />
              <span className="font-medium">Tarima</span>
              <span className="text-border">/</span>
              <span className="text-muted-foreground">Inventario</span>
            </div>
            <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">+ Movimiento</span>
          </div>

          <div className="grid grid-cols-2 border-b sm:grid-cols-4">
            {[
              ["Productos", "5"],
              ["Bajo mínimo", "1"],
              ["Agotados", "1"],
              ["Valor del inventario", "3,815.45"],
            ].map(([label, value], i) => (
              <div key={label} className={cn("px-5 py-4", i > 0 && "sm:border-l", i % 2 === 1 && "border-l", i >= 2 && "border-t sm:border-t-0")}>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums">{value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b bg-zinc-50 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">SKU</th>
                  <th className="px-3 py-2.5 text-left font-medium">Producto</th>
                  <th className="px-3 py-2.5 text-right font-medium">ALM-01</th>
                  <th className="px-3 py-2.5 text-right font-medium">ALM-02</th>
                  <th className="px-3 py-2.5 text-right font-medium">Stock total</th>
                  <th className="px-5 py-2.5 pl-8 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {PREVIEW_ROWS.map((r) => (
                  <tr key={r.sku} className="border-b last:border-0">
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{r.sku}</td>
                    <td className="px-3 py-3.5 font-medium">{r.name}</td>
                    <td className={cn("px-3 py-3.5 text-right", r.a === "0" ? "text-muted-foreground/40" : "text-foreground/80")}>{r.a}</td>
                    <td className={cn("px-3 py-3.5 text-right", r.b === "0" ? "text-muted-foreground/40" : "text-foreground/80")}>{r.b}</td>
                    <td className="px-3 py-3.5 text-right font-semibold">
                      {r.total} <span className="text-[11px] font-normal text-muted-foreground">UND</span>
                    </td>
                    <td className="px-5 py-3.5 pl-8">
                      <Badge variant={r.status}>{STATUS_LABEL[r.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
