import type { UUID } from "../core/helpers"

/** Fila de `GET /roles`. */
export type RolResumenDto = {
  id_rol: UUID
  nombre: string
  descripcion: string | null
  total_permisos: number
  total_usuarios: number
}
