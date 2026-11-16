/// <reference types="cypress" />

describe("Módulo de Control de Inventario y Kardex - E2E Tests", () => {
  beforeEach(() => {
    // Navegar a la vista principal del inventario
    cy.visit("/inventario");
  });

  it("Caso 1 (Flujo Positivo): Registro exitoso de entrada de mercancía por compra", () => {
    // 1. Abrir el modal de movimiento haciendo clic en el botón de la cabecera
    cy.contains("button", "Movimiento").should("be.visible").click();

    // 2. Verificar que el modal se haya desplegado
    cy.get("form").should("be.visible");
    cy.contains("Registrar movimiento").should("be.visible");

    // 3. Seleccionar la pestaña de tipo de movimiento "Entrada por compra"
    cy.contains('button[role="tab"]', "Entrada por compra")
      .should("be.visible")
      .click()
      .should("have.attr", "aria-selected", "true");

    // 4. Ingresar la cantidad de 100 unidades
    cy.get('input#mv-qty[name="quantity"]')
      .should("be.visible")
      .clear()
      .type("100");

    // 5. Ingresar el costo unitario de adquisición ($0.60)
    cy.get('input#mv-cost[name="unitCost"]')
      .should("be.enabled")
      .clear()
      .type("0.60");

    // 6. Asignar nota de referencia contable
    cy.get('input#mv-note[name="referenceNote"]')
      .clear()
      .type("FAC-PROV-2026-001");

    // 7. Enviar el formulario para disparar la Server Action de Next.js
    cy.get('form button[type="submit"]')
      .contains("Registrar")
      .click();

    // 8. Validaciones posteriores:
    // a) El modal debe cerrarse tras la transacción exitosa
    cy.get("form").should("not.exist");

    // b) La tabla de inventario debe actualizarse y reflejar la existencia disponible
    cy.get("table tbody tr").first().within(() => {
      // La columna 3 corresponde a ALM-01 (almacén principal donde se ingresó la compra)
      cy.get("td").eq(3).invoke("text").then((stockText) => {
        const stockActual = parseFloat(stockText.replace(/[^\d.-]/g, ""));
        expect(stockActual).to.be.greaterThan(0);
      });
    });

    // c) El resumen de valor total en cabecera debe reflejar saldo positivo
    cy.contains("Valor:").should("be.visible");
  });

  it("Caso 2 (Regla de Negocio / Preventivo): Bloqueo de salida que supera el stock disponible", () => {
    // 1. Abrir modal de movimientos
    cy.contains("button", "Movimiento").click();

    // 2. Seleccionar la pestaña "Salida por venta"
    cy.contains('button[role="tab"]', "Salida por venta")
      .click()
      .should("have.attr", "aria-selected", "true");

    // 3. Ingresar una cantidad exagerada que excede intencionalmente las existencias físicas
    cy.get('input#mv-qty[name="quantity"]')
      .clear()
      .type("999999");

    // 4. Ingresar nota de referencia
    cy.get('input#mv-note[name="referenceNote"]')
      .clear()
      .type("Intento de venta no autorizada por falta de stock");

    // 5. Presionar el botón Registrar
    cy.get('form button[type="submit"]')
      .contains("Registrar")
      .click();

    // 6. Validaciones críticas de la invariante:
    // a) El mensaje de alerta del negocio debe aparecer en pantalla
    cy.get('p[role="alert"]')
      .should("be.visible")
      .and("contain.text", "Stock insuficiente");

    // b) El formulario no debe cerrarse, permitiendo al usuario corregir la cantidad
    cy.get("form").should("be.visible");

    // c) Cancelar la operación para limpiar la interfaz
    cy.contains("button", "Cancelar").click();
    cy.get("form").should("not.exist");
  });
});

