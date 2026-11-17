# language: es
@P0 @BDD @ATDD
Característica: Resiliencia offline de movimientos de inventario
  Como operario de almacén en una PyME
  Quiero que los movimientos registrados sin conexión se guarden en una cola local segura
  Para evitar pérdida de datos y sincronizar el Kardex al recuperar la red

  Escenario: Encolar movimientos sin conexión y sincronizarlos exitosamente
    Dado que la cola offline está vacía
    Cuando registro sin conexión una "PURCHASE_RECEIPT" de 10 unidades para el producto "FER-001"
    Y registro sin conexión una "SALE_DISPATCH" de 3 unidades para el producto "FER-001"
    Entonces la cola offline debe tener 2 movimientos pendientes
    Cuando se recupera la conexión y el servidor acepta todos los movimientos
    Entonces se deben haber enviado 2 movimientos
    Y la cola offline debe quedar vacía

  Escenario: Detener sincronización ante caída de red sin perder movimientos pendientes
    Dado que la cola offline está vacía
    Cuando registro sin conexión una "PURCHASE_RECEIPT" de 5 unidades para el producto "FER-001"
    Y registro sin conexión una "SALE_DISPATCH" de 2 unidades para el producto "ELE-002"
    Y el servidor falla por red en el segundo movimiento
    Entonces se debe haber enviado 1 movimiento
    Y la sincronización debe haberse detenido por error de red
    Y la cola offline debe conservar 1 movimiento pendiente
