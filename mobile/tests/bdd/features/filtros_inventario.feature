# language: es
@P1 @BDD @ATDD
Característica: Filtrado y búsqueda de productos en inventario móvil
  Como encargado de compras o almacén
  Quiero filtrar productos por estado de stock y buscar por SKU o código de barras
  Para identificar rápidamente quiebres de stock y productos por reponer

  Antecedentes:
    Dado el siguiente inventario cargado en la aplicación:
      | id     | sku     | barcode       | name                    | categoryId | totalStock | minStock | status  |
      | prod-1 | FER-001 | 7750001000011 | Tornillo Hexagonal 1/4  | cat-1      | 50         | 20       | NORMAL  |
      | prod-2 | ELE-002 | 7750001000028 | Cable THW 12 AWG        | cat-2      | 10         | 30       | REORDER |
      | prod-3 | FER-003 |               | Cinta Aislante Negra    | cat-1      | 0          | 15       | REORDER |

  Escenario: Filtrar productos bajo stock mínimo (sin incluir agotados)
    Cuando aplico el filtro de estado "LOW"
    Entonces debo ver 1 producto en la lista
    Y la lista debe incluir el SKU "ELE-002"

  Escenario: Filtrar productos agotados
    Cuando aplico el filtro de estado "OUT"
    Entonces debo ver 1 producto en la lista
    Y la lista debe incluir el SKU "FER-003"

  Escenario: Buscar producto por código de barras
    Cuando busco el texto "7750001000011"
    Entonces debo ver 1 producto en la lista
    Y la lista debe incluir el SKU "FER-001"
