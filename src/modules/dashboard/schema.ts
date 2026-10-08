import { z } from "zod"

// Periodos disponibles para el filtro del dashboard
export const periodoDashboardSchema = z.enum(["hoy", "semana", "mes"])
export type PeriodoDashboard = z.infer<typeof periodoDashboardSchema>

export const PERIODO_LABELS: Record<PeriodoDashboard, string> = {
  hoy: "Hoy",
  semana: "Semana",
  mes: "Mes",
}

export type EstadoPedido = "pendiente" | "preparacion" | "listo" | "entregado" | "cancelado"

export type TipoKpi = "ventas" | "pedidos" | "mesas" | "ticket"

export interface DashboardKpi {
  id: TipoKpi
  titulo: string
  valor: string
  detalle: string
  // Variación porcentual frente al periodo anterior (null si no aplica)
  variacion: number | null
}

export interface VentaPorTramo {
  tramo: string
  ventas: number
  pedidos: number
}

export interface PedidoReciente {
  id: string
  codigo: string
  mesa: string
  cliente: string
  total: number
  estado: EstadoPedido
  hora: string
}

export interface ProductoTop {
  id: string
  nombre: string
  categoria: string
  unidades: number
  ingresos: number
}

export interface EstadoCaja {
  abierta: boolean
  responsable: string
  apertura: string
  montoInicial: number
  efectivo: number
  digital: number
}

// Intervalo de refresco automático de las métricas en vivo
export const DASHBOARD_REFRESH_MS = 10_000

export interface DashboardResumen {
  periodo: PeriodoDashboard
  // Fecha ISO del momento en que se generaron las métricas
  actualizadoEn: string
  kpis: DashboardKpi[]
  ventas: VentaPorTramo[]
  pedidosRecientes: PedidoReciente[]
  productosTop: ProductoTop[]
  caja: EstadoCaja
}
