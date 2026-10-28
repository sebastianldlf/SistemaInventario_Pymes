/**
 * Capa de Dominio: Inventario
 * Contiene la lógica pura del negocio, entidades y reglas invariantes (DDD).
 */

export class CantidadInvalidaError extends Error {
  constructor(message = "La cantidad entrante debe ser un valor numérico mayor a cero.") {
    super(message);
    this.name = "CantidadInvalidaError";
  }
}

export class StockActualInvalidoError extends Error {
  constructor(message = "El stock actual no puede ser un valor negativo.") {
    super(message);
    this.name = "StockActualInvalidoError";
  }
}

/**
 * Entidad de Dominio que modela las existencias de un producto en un almacén.
 */
export interface ExistenciaAlmacen {
  productoId: string;
  almacenId: string;
  cantidad: number;
}

/**
 * Operación de Dominio: Registrar Entrada de Stock
 *
 * Reglas de negocio e invariantes:
 * - La cantidad entrante debe ser estrictamente positiva (> 0).
 * - El stock actual debe ser un valor no negativo (>= 0).
 * - La operación es puramente matemática y determinista, libre de efectos secundarios de I/O.
 *
 * @param stockActual Cantidad de existencias antes de la operación.
 * @param cantidadEntrante Unidades que ingresan al inventario.
 * @returns El nuevo balance de existencias calculado.
 * @throws {CantidadInvalidaError} Si la cantidad entrante es <= 0 o inválida.
 * @throws {StockActualInvalidoError} Si el stock inicial es negativo.
 */
export function registrarEntradaStock(
  stockActual: number,
  cantidadEntrante: number
): number {
  if (typeof stockActual !== "number" || Number.isNaN(stockActual) || stockActual < 0) {
    throw new StockActualInvalidoError();
  }

  if (
    typeof cantidadEntrante !== "number" ||
    Number.isNaN(cantidadEntrante) ||
    cantidadEntrante <= 0
  ) {
    throw new CantidadInvalidaError();
  }

  return stockActual + cantidadEntrante;
}
