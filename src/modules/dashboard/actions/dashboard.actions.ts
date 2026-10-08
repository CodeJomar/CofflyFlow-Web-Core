import { apiRequest } from "@/lib/api/client"
import { OneQuery } from "@/dtos/core/oneQuery.dto"
import type { DashboardQuery, DashboardResumenDto } from "@/dtos/dashboard"

import { DIAS_PERIODO, type PeriodoDashboard } from "../schema"

/** Fecha calendario (YYYY-MM-DD) en hora de Lima, que es la que usa la API para "hoy". */
const fechaLima = (fecha: Date): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha)

/** Sin fechas la API devuelve hoy; para semana y mes se pide el rango de los últimos N días. */
export function consultaDePeriodo(periodo: PeriodoDashboard): DashboardQuery {
  const dias = DIAS_PERIODO[periodo]
  if (dias === 1) return {}
  const hoy = new Date()
  const inicio = new Date(hoy.getTime() - (dias - 1) * 24 * 60 * 60 * 1000)
  return { fecha_inicio: fechaLima(inicio), fecha_fin: fechaLima(hoy) }
}

export const getDashboardResumen = (periodo: PeriodoDashboard) =>
  apiRequest<OneQuery<DashboardResumenDto>>(OneQuery, {
    method: "GET",
    url: "/dashboard/resumen",
    params: consultaDePeriodo(periodo),
  })
