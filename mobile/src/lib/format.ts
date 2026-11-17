// Equivalente manual de formatQty / formatMoney de la web (backend/src/lib/utils.ts):
//   new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 })
//   new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// es-PE agrupa miles con "," y usa "." como separador decimal.
// No se usa Intl porque su soporte de locales en Hermes depende de la plataforma.

function roundDecimal(n: number, digits: number): string {
  const s = toPlain(String(Math.abs(n)));
  // Redondeo sobre la representación decimal (como Intl): 1.0005 → 1.001
  const [int, frac = ""] = s.split(".");
  if (frac.length <= digits) return frac ? `${int}.${frac}` : int;
  let kept = `${int}${frac.slice(0, digits)}`;
  if (Number(frac[digits]) >= 5) kept = incrementDigits(kept);
  return `${kept.slice(0, -digits)}.${kept.slice(-digits)}`;
}

/** "1e+21" → "1000000000000000000000", "5e-7" → "0.0000005". Sin exponente, devuelve igual. */
function toPlain(s: string): string {
  if (!s.includes("e")) return s;
  const [mantissa, exp] = s.split("e");
  const [int, frac = ""] = mantissa.split(".");
  const digits = int + frac;
  const point = int.length + Number(exp);
  if (point <= 0) return `0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return digits + "0".repeat(point - digits.length);
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** Suma 1 a una cadena de dígitos: "0999" → "1000", "99" → "100". */
function incrementDigits(s: string): string {
  const d = s.split("");
  let i = d.length - 1;
  while (i >= 0 && d[i] === "9") d[i--] = "0";
  if (i < 0) d.unshift("1");
  else d[i] = String(Number(d[i]) + 1);
  return d.join("");
}

function format(n: number, minFrac: number, maxFrac: number): string {
  let [int, frac = ""] = roundDecimal(n, maxFrac).split(".");
  frac = frac.replace(/0+$/, "").padEnd(minFrac, "0");
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const negative = n < 0 || Object.is(n, -0);
  return `${negative ? "-" : ""}${int}${frac ? `.${frac}` : ""}`;
}

export const formatQty = (n: number) => format(n, 0, 3);
export const formatMoney = (n: number) => format(n, 2, 2);
