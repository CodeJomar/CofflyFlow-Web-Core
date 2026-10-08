import type { EntidadAuditada } from "../core/entidadAuditada"
import type { FechaIso } from "../core/fechaIso"
import type { UUID } from "../core/helpers"
import type { EstadoUsuario } from "./estadoUsuario"
import type { TipoCuenta } from "./tipoCuenta"

export type UsuarioDto = EntidadAuditada & {
  id_usuario: UUID
  tipo_cuenta: TipoCuenta
  id_rol: UUID | null
  /** Nombre del cargo; null en la cuenta propietaria. */
  rol_nombre: string | null
  email: string
  nombre: string
  estado: EstadoUsuario
  email_verificado: boolean
  ultimo_login: FechaIso | null
}
