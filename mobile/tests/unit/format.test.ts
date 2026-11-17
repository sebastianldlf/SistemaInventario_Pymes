import { describe, expect, it } from "vitest";
import { formatMoney, formatQty } from "../../src/lib/format";

describe("[P1][TDD] Formateo numérico y monetario es-PE (format.ts)", () => {
  it("formatea cantidades enteras y con hasta 3 decimales sin ceros finales", () => {
    expect(formatQty(0)).toBe("0");
    expect(formatQty(1500)).toBe("1,500");
    expect(formatQty(12.5)).toBe("12.5");
    expect(formatQty(12.345)).toBe("12.345");
  });

  it("redondea correctamente el tercer decimal (1.0005 -> 1.001)", () => {
    expect(formatQty(1.0005)).toBe("1.001");
    expect(formatQty(9.9995)).toBe("10");
  });

  it("formatea montos monetarios siempre con 2 decimales y separador de miles", () => {
    expect(formatMoney(0)).toBe("0.00");
    expect(formatMoney(1234.5)).toBe("1,234.50");
    expect(formatMoney(99.995)).toBe("100.00");
  });

  it("maneja números negativos, -0 y notación científica", () => {
    expect(formatQty(-1200.25)).toBe("-1,200.25");
    expect(formatMoney(-0)).toBe("-0.00");
    expect(formatQty(5e-3)).toBe("0.005");
    expect(formatQty(1e-7)).toBe("0");
  });
});
