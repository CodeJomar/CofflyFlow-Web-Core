import type { UUID } from "../core/helpers"

/** Crea el empleado en `pendiente_activacion` y le envía el correo de activación. */
export type CrearUsuarioPayload = {
  id_rol: UUID
  email: string
  nombre: string
}
