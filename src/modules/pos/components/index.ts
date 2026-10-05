import {
  Armchair,
  Banknote,
  CakeSlice,
  Coffee,
  CreditCard,
  Croissant,
  CupSoda,
  GlassWater,
  LayoutGrid,
  Sandwich,
  Smartphone,
  Sun,
  type LucideIcon,
} from "lucide-react"
import type { AreaMesa, EstadoMesa, FiltroCategoria, MetodoPago } from "../schema"

// Superficie base de los paneles del POS (claro / oscuro), alineada con el dashboard
export const panelClass =
  "rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-stone-800 dark:bg-stone-950/40 transition-colors"

// Ícono y acento de color por categoría con variantes legibles en modo oscuro
export const CATEGORIA_CONFIG: Record<FiltroCategoria, { icon: LucideIcon; className: string }> = {
  todos: {
    icon: LayoutGrid,
    className: "bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200",
  },
  calientes: {
    icon: Coffee,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  frias: {
    icon: CupSoda,
    className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  panaderia: {
    icon: Croissant,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  },
  salados: {
    icon: Sandwich,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  postres: {
    icon: CakeSlice,
    className: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300",
  },
}

export const METODO_PAGO_ICONS: Record<MetodoPago, LucideIcon> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  yape: Smartphone,
}

// Montos sugeridos para cobros en efectivo (billetes de uso común en soles)
export const BILLETES_SUGERIDOS = [10, 20, 50, 100, 200] as const

// Clases para opciones seleccionables (chips, métodos de pago, tipo de pedido)
export const opcionClass = (activa: boolean) =>
  activa
    ? "border-[#4C0107] bg-[#4C0107] text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
    : "border-slate-200 bg-white text-slate-700 hover:border-[#4C0107]/40 hover:text-[#4C0107] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-stone-100"

/* -------------------------------------------------------------------------- */
/*                 RF-04: Configuración visual de mesas y áreas               */
/* -------------------------------------------------------------------------- */

export const ESTADO_MESA_CONFIG: Record<
  EstadoMesa,
  { label: string; badge: string; border: string; bg: string; dot: string }
> = {
  libre: {
    label: "Libre",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    border: "border-emerald-200 hover:border-emerald-400 dark:border-emerald-900/40 dark:hover:border-emerald-600",
    bg: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
    dot: "bg-emerald-500",
  },
  ocupada: {
    label: "Ocupada",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    border: "border-amber-200 hover:border-amber-400 dark:border-amber-900/40 dark:hover:border-amber-600",
    bg: "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
    dot: "bg-amber-500",
  },
  por_cobrar: {
    label: "Por cobrar",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    border: "border-purple-200 hover:border-purple-400 dark:border-purple-900/40 dark:hover:border-purple-600",
    bg: "hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
    dot: "bg-purple-500",
  },
}

export const AREA_MESA_CONFIG: Record<AreaMesa, { label: string; icon: LucideIcon }> = {
  salon: { label: "Salón", icon: Armchair },
  terraza: { label: "Terraza", icon: Sun },
  barra: { label: "Barra", icon: GlassWater },
}

/* -------------------------------------------------------------------------- */
/*                 RF-05: Modificadores estándar de cafetería                 */
/* -------------------------------------------------------------------------- */

export const OPCIONES_LECHE: { valor: "Entera" | "Deslactosada" | "Almendras" | "Avena" | "Sin leche"; precioExtra: number }[] = [
  { valor: "Entera", precioExtra: 0 },
  { valor: "Deslactosada", precioExtra: 0 },
  { valor: "Almendras", precioExtra: 2.0 },
  { valor: "Avena", precioExtra: 2.0 },
  { valor: "Sin leche", precioExtra: 0 },
]

export const OPCIONES_ENDULZANTE: ("Sin azúcar" | "Azúcar rubia" | "Azúcar blanca" | "Stevia")[] = [
  "Sin azúcar",
  "Azúcar rubia",
  "Azúcar blanca",
  "Stevia",
]

export const OPCIONES_TEMPERATURA: ("Caliente" | "Tibio" | "Extra caliente" | "Frío / Con hielo")[] = [
  "Caliente",
  "Tibio",
  "Extra caliente",
  "Frío / Con hielo",
]
