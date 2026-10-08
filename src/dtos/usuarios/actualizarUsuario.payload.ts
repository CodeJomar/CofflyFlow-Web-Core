import type { UUID } from "../core/helpers"
import type { EstadoUsuarioEditable } from "./estadoUsuario"

export type ActualizarUsuarioPayload = Partial<{
  id_rol: UUID
  email: string
  nombre: string
  estado: EstadoUsuarioEditable
}>
