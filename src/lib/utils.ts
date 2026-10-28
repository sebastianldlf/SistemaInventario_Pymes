import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const qtyFmt = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const moneyFmt = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatQty = (n: number) => qtyFmt.format(n);
export const formatMoney = (n: number) => moneyFmt.format(n);
