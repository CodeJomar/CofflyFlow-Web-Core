import type { FiltroDisponibilidad } from "../schema"

// Se reutiliza la misma identidad visual del POS (paneles, íconos y colores por categoría)
export { getCategoriaConfig, opcionClass, panelClass } from "@/modules/pos/components"

// Etiqueta de estado del producto, legible en modo claro y oscuro
export const ESTADO_PRODUCTO_CLASS = {
  disponible: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  agotado: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
} as const

// Acento de cada filtro de disponibilidad en los contadores del resumen
export const RESUMEN_CONFIG: Record<FiltroDisponibilidad, { label: string; valueClass: string }> = {
  todos: { label: "Productos", valueClass: "text-slate-900 dark:text-stone-100" },
  disponibles: { label: "Disponibles", valueClass: "text-emerald-700 dark:text-emerald-400" },
  agotados: { label: "Agotados", valueClass: "text-red-600 dark:text-red-400" },
}
