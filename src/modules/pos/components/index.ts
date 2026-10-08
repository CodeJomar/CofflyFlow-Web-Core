import {
  Armchair,
  Banknote,
  CakeSlice,
  Coffee,
  CreditCard,
  Croissant,
  CupSoda,
  GlassWater,
  Landmark,
  LayoutGrid,
  MapPin,
  Popcorn,
  Sandwich,
  Smartphone,
  Sun,
  Tag,
  type LucideIcon,
} from "lucide-react"

import type { MetodoPago } from "@/dtos/caja"
import type { EstadoMesa } from "@/dtos/mesas"
import { FILTRO_TODOS } from "../schema"

// Superficie base de los paneles del POS (claro / oscuro), alineada con el dashboard
export const panelClass =
  "rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-stone-800 dark:bg-stone-950/40 transition-colors"

/** Texto sin tildes ni mayúsculas, para reconocer nombres que escribe el propietario ("Frías", "FRIAS"). */
const normalizar = (texto: string): string =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/* -------------------------------------------------------------------------- */
/*                         Configuración visual de categorías                  */
/* -------------------------------------------------------------------------- */

interface ConfigCategoria {
  icon: LucideIcon
  className: string
}

const CATEGORIA_TODOS: ConfigCategoria = {
  icon: LayoutGrid,
  className: "bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200",
}

// Las categorías las crea el propietario (nombre libre): el ícono y el color se deducen de palabras del nombre.
const CATEGORIAS_CONOCIDAS: Array<{ palabras: string[]; config: ConfigCategoria }> = [
  { palabras: ["caliente", "cafe", "espresso"], config: { icon: Coffee, className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" } },
  { palabras: ["fria", "frio", "helad", "frappe"], config: { icon: CupSoda, className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" } },
  { palabras: ["panader", "pan ", "croissant"], config: { icon: Croissant, className: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300" } },
  { palabras: ["salad", "sandwich"], config: { icon: Sandwich, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" } },
  { palabras: ["postre", "torta", "dulce"], config: { icon: CakeSlice, className: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300" } },
  { palabras: ["piqueo", "snack"], config: { icon: Popcorn, className: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300" } },
]

// Estilo neutro para cualquier otra categoría
const CATEGORIA_GENERICA: ConfigCategoria = {
  icon: Tag,
  className: "bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-200",
}

/** Ícono y acento de una categoría. Para el filtro "todos" se pasa `FILTRO_TODOS`. */
export function getCategoriaConfig(categoria: { nombre: string } | typeof FILTRO_TODOS): ConfigCategoria {
  if (categoria === FILTRO_TODOS) return CATEGORIA_TODOS
  const nombre = normalizar(categoria.nombre)
  return CATEGORIAS_CONOCIDAS.find((c) => c.palabras.some((p) => nombre.includes(p)))?.config ?? CATEGORIA_GENERICA
}

/* -------------------------------------------------------------------------- */
/*                               Métodos de pago                               */
/* -------------------------------------------------------------------------- */

export const METODO_PAGO_ICONS: Record<MetodoPago, LucideIcon> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  yape: Smartphone,
  plin: Smartphone,
  transferencia: Landmark,
}

// Montos sugeridos para cobros en efectivo (billetes de uso común en soles)
export const BILLETES_SUGERIDOS = [10, 20, 50, 100, 200] as const

// Clases para opciones seleccionables (chips, métodos de pago, tipo de pedido)
export const opcionClass = (activa: boolean) =>
  activa
    ? "border-[#4C0107] bg-[#4C0107] text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
    : "border-slate-200 bg-white text-slate-700 hover:border-[#4C0107]/40 hover:text-[#4C0107] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-500"

/* -------------------------------------------------------------------------- */
/*                 Configuración visual de mesas y áreas                       */
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
  por_limpiar: {
    label: "Por limpiar",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
    border: "border-sky-200 hover:border-sky-400 dark:border-sky-900/40 dark:hover:border-sky-600",
    bg: "hover:bg-sky-50/50 dark:hover:bg-sky-950/20",
    dot: "bg-sky-500",
  },
}

// Ícono por área conocida; las áreas que crea el propietario usan uno genérico.
const AREA_MESA_ICONS: Record<string, LucideIcon> = {
  salon: Armchair,
  terraza: Sun,
  barra: GlassWater,
}

export const getAreaIcon = (area: string): LucideIcon => AREA_MESA_ICONS[normalizar(area)] ?? MapPin

/** Igual que `getAreaIcon`, pero como objeto: se usa en JSX como `<config.icon />` sin crear un componente al renderizar. */
export const getAreaConfig = (area: string): { icon: LucideIcon } => ({ icon: getAreaIcon(area) })
