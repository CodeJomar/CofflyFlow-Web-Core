import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*                          Estados de una comanda KDS                         */
/* -------------------------------------------------------------------------- */

export const estadoComandaSchema = z.enum(["pendiente", "en_preparacion", "lista", "entregada"])
export type EstadoComanda = z.infer<typeof estadoComandaSchema>

export const ESTADO_COMANDA_LABELS: Record<EstadoComanda, string> = {
  pendiente: "Pendiente",
  en_preparacion: "En Preparación",
  lista: "Lista",
  entregada: "Entregada",
}

/* -------------------------------------------------------------------------- */
/*                            Filtros de visualización                         */
/* -------------------------------------------------------------------------- */

export type FiltroEstadoKds = EstadoComanda | "todas"

export const FILTRO_ESTADO_LABELS: Record<FiltroEstadoKds, string> = {
  todas: "Todas",
  pendiente: "Pendientes",
  en_preparacion: "En Preparación",
  lista: "Listas",
  entregada: "Entregadas",
}

/* -------------------------------------------------------------------------- */
/*                         Modelos de datos del KDS                           */
/* -------------------------------------------------------------------------- */

export interface ItemComandaKds {
  id: string
  nombre: string
  cantidad: number
  notas?: string
  modificadores?: string
}

export interface ComandaKds {
  id: string
  codigo: string
  mesa: string
  mozo: string
  tipoPedido: "mesa" | "llevar"
  estado: EstadoComanda
  items: ItemComandaKds[]
  creadaEn: string // ISO timestamp
  tiempoTranscurrido: string // ej: "5 min", "12 min"
  minutosTranscurridos: number
}
