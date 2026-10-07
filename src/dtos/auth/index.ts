import type { UUID } from "../core/helpers"

/** Usuario autenticado que devuelve la API (los tokens viajan solo en cookies HttpOnly). */
export type SesionUsuarioDto = {
  id_usuario: UUID
  nombre: string
  email: string
  tipo_cuenta: "OWNER" | "EMPLOYEE"
  id_rol: UUID | null
  rol_nombre: string | null
}

export type LoginResponseDto = {
  usuario: SesionUsuarioDto
  expira_en_segundos: number
}

export type TokenRestablecimientoDto = {
  token_restablecimiento: string
  expira_en_segundos: number
}

export type ValidarActivacionDto = {
  nombre: string
}
