import type { Dinero } from "../core/dinero"
import type { UUID } from "../core/helpers"

export type CrearProductoPayload = {
  id_categoria: UUID
  nombre: string
  descripcion?: string
  precio: Dinero
  disponible?: boolean
}
