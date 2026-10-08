import type { PedidoDto } from "./pedido.dto"
import type { ResumenPagoDto } from "./resumenPago.dto"

/** Fila de `GET /orders` (paginada). */
export type PedidoListadoDto = PedidoDto &
  ResumenPagoDto & {
    /** Suma de unidades de todos los productos. */
    total_items: number
  }
