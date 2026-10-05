import {
  ChefHat,
  Clock,
  CheckCircle2,
  PackageCheck,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react"
import type { EstadoComanda, FiltroEstadoKds } from "../schema"

// Superficie base de los paneles del KDS, alineada con el POS y dashboard
export const panelClass =
  "rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-stone-800 dark:bg-stone-950/40 transition-colors"

/* -------------------------------------------------------------------------- */
/*               Configuración visual por estado de comanda                   */
/* -------------------------------------------------------------------------- */

export const ESTADO_COMANDA_CONFIG: Record<
  EstadoComanda,
  {
    label: string
    icon: LucideIcon
    badge: string
    border: string
    accent: string
    actionLabel: string
    actionClass: string
  }
> = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900/40",
    accent: "text-amber-700 dark:text-amber-300",
    actionLabel: "Iniciar",
    actionClass:
      "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-stone-950",
  },
  en_preparacion: {
    label: "En Preparación",
    icon: ChefHat,
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-900/40",
    accent: "text-sky-700 dark:text-sky-300",
    actionLabel: "Marcar lista",
    actionClass:
      "bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-stone-950",
  },
  lista: {
    label: "Lista",
    icon: CheckCircle2,
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900/40",
    accent: "text-emerald-700 dark:text-emerald-300",
    actionLabel: "Entregar",
    actionClass:
      "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-stone-950",
  },
  entregada: {
    label: "Entregada",
    icon: PackageCheck,
    badge: "bg-slate-100 text-slate-500 dark:bg-stone-800 dark:text-stone-400",
    border: "border-slate-200 dark:border-stone-700",
    accent: "text-slate-500 dark:text-stone-400",
    actionLabel: "",
    actionClass: "",
  },
}

/* -------------------------------------------------------------------------- */
/*               Configuración del filtro (tabs)                              */
/* -------------------------------------------------------------------------- */

export const FILTRO_CONFIG: Record<FiltroEstadoKds, { icon: LucideIcon; label: string }> = {
  todas: { icon: LayoutGrid, label: "Todas" },
  pendiente: { icon: Clock, label: "Pendientes" },
  en_preparacion: { icon: ChefHat, label: "Preparando" },
  lista: { icon: CheckCircle2, label: "Listas" },
  entregada: { icon: PackageCheck, label: "Entregadas" },
}

/* -------------------------------------------------------------------------- */
/*             Utilidad de urgencia según minutos transcurridos                */
/* -------------------------------------------------------------------------- */

/** Devuelve una clase CSS de acento según la urgencia del tiempo */
export function urgenciaClass(minutos: number): string {
  if (minutos >= 20) return "text-red-600 dark:text-red-400"
  if (minutos >= 10) return "text-amber-600 dark:text-amber-400"
  return "text-slate-500 dark:text-stone-400"
}
