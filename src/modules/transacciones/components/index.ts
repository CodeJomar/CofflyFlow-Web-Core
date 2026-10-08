import {
  Ban,
  Banknote,
  CircleCheck,
  CreditCard,
  Landmark,
  Smartphone,
  Undo2,
  type LucideIcon,
} from "lucide-react"

import type { MetodoPago } from "@/dtos/caja"
import type { EstadoPedido } from "@/dtos/pedidos"
import type { GrupoPedido, ResultadoArqueo } from "../schema"

/* -------------------------------------------------------------------------- */
/*                Superficies y textos legibles en claro / oscuro             */
/* -------------------------------------------------------------------------- */

// Superficie base de los paneles (alineada con POS y Dashboard)
export const panelClass =
  "rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-stone-800 dark:bg-stone-950/40 transition-colors"

// Tarjeta interna sobre un panel
export const tarjetaClass =
  "rounded-2xl border border-slate-200/80 bg-white dark:border-stone-800 dark:bg-stone-900 transition-colors"

// Tipografías con contraste garantizado en ambos temas
export const textoTitulo = "text-slate-900 dark:text-stone-100"
export const textoCuerpo = "text-slate-700 dark:text-stone-200"
export const textoSecundario = "text-slate-500 dark:text-stone-400"
export const textoEtiqueta = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
export const textoAcento = "text-[#4C0107] dark:text-[#E7B7BC]"

export const mensajeErrorClass =
  "rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300"

export const selectClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-colors cursor-pointer focus:border-slate-600 focus:ring-2 focus:ring-slate-400/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-stone-300 dark:focus:ring-white/10 dark:[color-scheme:dark]"

// Botón secundario con contraste en modo oscuro (el variant outline base usa el vino corporativo)
export const botonSecundarioClass =
  "dark:border-stone-600 dark:bg-transparent dark:text-stone-100 dark:hover:bg-stone-800 dark:hover:text-white"

// Botón destructivo legible en ambos temas
export const botonPeligroClass =
  "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-600"

// Clases para opciones seleccionables (chips, métodos de pago, filtros)
export const opcionClass = (activa: boolean) =>
  activa
    ? "border-[#4C0107] bg-[#4C0107] text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
    : "border-slate-200 bg-white text-slate-700 hover:border-[#4C0107]/40 hover:text-[#4C0107] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-stone-100"

// Pestañas tipo píldora del encabezado
export const pestanaClass = (activa: boolean) =>
  activa
    ? "bg-[#4C0107] text-white shadow-sm dark:bg-stone-100 dark:text-stone-900"
    : "text-slate-600 hover:text-slate-900 dark:text-stone-300 dark:hover:text-white"

/* -------------------------------------------------------------------------- */
/*                         Configuración visual por dominio                   */
/* -------------------------------------------------------------------------- */

export const METODO_PAGO_ICONS: Record<MetodoPago, LucideIcon> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  yape: Smartphone,
  plin: Smartphone,
  transferencia: Landmark,
}

// Estilo del estado de un pedido en el historial
export const ESTADO_PEDIDO_CONFIG: Record<EstadoPedido, { badge: string; dot: string }> = {
  pendiente: {
    badge: "bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-200",
    dot: "bg-slate-400",
  },
  en_preparacion: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  listo: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  pagado: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  anulado: {
    badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    dot: "bg-red-500",
  },
}

export const GRUPO_PEDIDO_CHIPS: Array<GrupoPedido | "todos"> = ["todos", "activo", "pagado", "anulado"]

export const RESULTADO_ARQUEO_CONFIG: Record<ResultadoArqueo, { badge: string; texto: string }> = {
  cuadrado: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    texto: "text-emerald-700 dark:text-emerald-400",
  },
  sobrante: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
    texto: "text-sky-700 dark:text-sky-400",
  },
  faltante: {
    badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    texto: "text-red-700 dark:text-red-400",
  },
}

// Línea de tiempo del comprobante: cobros y devoluciones
export const EVENTO_PAGO_CONFIG: Record<"pago" | "devolucion", { icon: LucideIcon; className: string }> = {
  pago: {
    icon: CircleCheck,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  devolucion: {
    icon: Undo2,
    className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
}

export const ICONO_ANULADO = Ban

/* -------------------------------------------------------------------------- */
/*                               Formato de fechas                            */
/* -------------------------------------------------------------------------- */

export const formatHora = (fecha: string) =>
  new Date(fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })

export const formatFechaHora = (fecha: string) =>
  new Date(fecha).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

// Tiempo transcurrido legible (ej. "45 min", "2 h 10 min")
export const formatTranscurrido = (desde: string, hasta: string | number = Date.now()) => {
  const fin = typeof hasta === "number" ? hasta : new Date(hasta).getTime()
  const minutos = Math.max(0, Math.round((fin - new Date(desde).getTime()) / 60_000))
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto ? `${horas} h ${resto} min` : `${horas} h`
}
