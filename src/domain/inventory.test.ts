import { describe, it, expect } from "vitest";
import {
  registrarEntradaStock,
  CantidadInvalidaError,
  StockActualInvalidoError,
} from "./inventory";

describe("Dominio de Inventario - registrarEntradaStock", () => {
  describe("Caso 1: Comportamiento exitoso de aumento de stock", () => {
    it("debe incrementar correctamente el stock cuando la cantidad entrante es válida", () => {
      // Arrange (Preparar)
      const stockInicial = 10;
      const cantidadEntrante = 5;

      // Act (Actuar)
      const resultado = registrarEntradaStock(stockInicial, cantidadEntrante);

      // Assert (Verificar)
      expect(resultado).toBe(15);
    });

    it("debe permitir registrar una entrada sobre un stock inicial en cero", () => {
      const stockInicial = 0;
      const cantidadEntrante = 25;

      const resultado = registrarEntradaStock(stockInicial, cantidadEntrante);

      expect(resultado).toBe(25);
    });

    it("debe calcular con precisión entradas con cantidades decimales", () => {
      const stockInicial = 12.5;
      const cantidadEntrante = 7.5;

      const resultado = registrarEntradaStock(stockInicial, cantidadEntrante);

      expect(resultado).toBe(20.0);
    });
  });

  describe("Caso 2: Regla de negocio e invariante de cantidad mayor a cero", () => {
    it("debe lanzar CantidadInvalidaError si la cantidad entrante es igual a cero", () => {
      const stockInicial = 10;
      const cantidadCero = 0;

      expect(() => registrarEntradaStock(stockInicial, cantidadCero)).toThrow(
        CantidadInvalidaError
      );
    });

    it("debe lanzar CantidadInvalidaError si la cantidad entrante es negativa", () => {
      const stockInicial = 10;
      const cantidadNegativa = -5;

      expect(() => registrarEntradaStock(stockInicial, cantidadNegativa)).toThrow(
        CantidadInvalidaError
      );
      expect(() => registrarEntradaStock(stockInicial, cantidadNegativa)).toThrow(
        "La cantidad entrante debe ser un valor numérico mayor a cero."
      );
    });
  });

  describe("Reglas de negocio complementarias de consistencia de stock", () => {
    it("debe lanzar StockActualInvalidoError si el stock actual inicial es negativo", () => {
      const stockNegativo = -1;
      const cantidadValida = 10;

      expect(() => registrarEntradaStock(stockNegativo, cantidadValida)).toThrow(
        StockActualInvalidoError
      );
    });
  });
});
