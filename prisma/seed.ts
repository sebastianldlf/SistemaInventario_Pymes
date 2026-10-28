import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cats = await Promise.all(
    ["Ferretería", "Eléctricos", "Limpieza"].map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const [wh1, wh2] = await Promise.all([
    prisma.warehouse.upsert({ where: { code: "ALM-01" }, update: {}, create: { code: "ALM-01", name: "Principal" } }),
    prisma.warehouse.upsert({ where: { code: "ALM-02" }, update: {}, create: { code: "ALM-02", name: "Tienda Centro" } }),
  ]);

  const products = [
    { sku: "FER-0001", barcode: "7750000000011", name: "Martillo carpintero 16 oz", min: 10, price: 28.5, cat: 0 },
    { sku: "FER-0002", barcode: "7750000000028", name: "Destornillador Phillips #2", min: 20, price: 9.9, cat: 0 },
    { sku: "ELE-0001", barcode: "7750000000035", name: "Cable THW 14 AWG (rollo 100 m)", min: 5, price: 135, cat: 1 },
    { sku: "ELE-0002", barcode: null, name: "Interruptor simple 10A", min: 30, price: 6.5, cat: 1 },
    { sku: "LIM-0001", barcode: "7750000000042", name: "Detergente industrial 5 L", min: 8, price: 42, cat: 2 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        minStock: p.min,
        salePrice: p.price,
        categoryId: cats[p.cat].id,
      },
    });
  }
  console.log(`Seed OK: ${products.length} productos, almacenes ${wh1.code}/${wh2.code}`);
  console.log("Registre existencias iniciales desde la UI con '+ Movimiento' (Entrada por compra).");
}

main().finally(() => prisma.$disconnect());
