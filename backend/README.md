# Inventario y Kardex para PyMEs

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Zod.

## Arranque

```bash
cp .env.example .env        # ajuste DATABASE_URL
npm install
npx prisma db push          # o: npm run db:migrate
npm run db:seed             # categorías, almacenes y productos demo
npm run dev
```

## Reglas de Kardex

- Saldo de cantidad por almacén (`WarehouseStock`); costo promedio ponderado (CPP) global por producto.
- Entrada: `CPP = (stockTotal·CPP + qty·costo) / (stockTotal + qty)`.
- Salida: valorizada al CPP vigente; se rechaza si deja el almacén en negativo.
- Cada movimiento es una única transacción con `SELECT … FOR UPDATE` sobre el producto; `KardexEntry` solo se inserta, nunca se modifica.
- Estado **Reorden**: stock total ≤ `minStock`.
