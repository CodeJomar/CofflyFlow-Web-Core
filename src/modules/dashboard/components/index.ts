import type { ChartConfig } from "@/shared/components/ui/chart"
import type { EstadoPedido } from "../schema"

// Configuración del gráfico de ventas: color corporativo en claro y uno legible en oscuro
export const ventasChartConfig = {
  ventas: {
    label: "Ventas",
    theme: { light: "#4C0107", dark: "#E7B7BC" },
  },
  pedidos: {
    label: "Pedidos",
    theme: { light: "#B08A8E", dark: "#78716C" },
  },
} satisfies ChartConfig

// Estilos de los estados de pedido con variantes para modo claro y oscuro
export const ESTADO_PEDIDO_CONFIG: Record<EstadoPedido, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-200",
  },
  preparacion: {
    label: "En preparación",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  listo: {
    label: "Listo",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  entregado: {
    label: "Entregado",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
}
