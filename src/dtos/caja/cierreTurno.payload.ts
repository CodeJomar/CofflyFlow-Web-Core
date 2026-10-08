import type { Dinero } from "../core/dinero"

export type CierreTurnoPayload = {
  monto_final_real: Dinero
  notas_cierre?: string
}
