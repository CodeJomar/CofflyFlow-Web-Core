/**
 * Usuario autenticado que devuelve la API. Lista blanca: sin identificadores internos (ni usuario ni cargo).
 * Los tokens viajan solo en cookies HttpOnly.
 */
export type SesionUsuarioDto = {
  nombre: string
  email: string
  tipo_cuenta: "OWNER" | "EMPLOYEE"
  rol_nombre: string | null
  /** Permisos efectivos "MODULO:ACCION"; el propietario recibe ["*"]. Solo ayuda de UX: la API vuelve a autorizar. */
  permisos: string[]
}
