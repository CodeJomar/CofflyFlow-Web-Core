import {
  ChefHat,
  ConciergeBell,
  Coffee,
  FileText,
  Grid2X2,
  LayoutDashboard,
  ReceiptText,
  Refrigerator,
  ShieldCheck,
  Tag,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { normalizarTexto } from "@/shared/utils/formatters"
import type { EstadoEmpleado, ModuloId } from "../schema"

// Se reutiliza la misma identidad visual del POS (paneles, chips, estados e íconos de área)
export { ESTADO_MESA_CONFIG, getAreaIcon, opcionClass, panelClass } from "@/modules/pos/components"

// Superficie de tarjeta usada en todas las vistas de Local y Equipo
export const tarjetaClass =
  "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors dark:border-stone-800 dark:bg-stone-900"

export const botonPrimario =
  "h-10 rounded-full bg-[#4C0107] px-4 text-white hover:bg-[#4C0107]/90 sm:px-5 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"

export const botonSecundario =
  "h-10 rounded-full px-4 sm:px-5 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"

export const botonIcono =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"

// Select nativo de shared con la apariencia de los filtros de la app
export const selectClass =
  "[&_select]:h-10 [&_select]:rounded-xl [&_select]:border-slate-300 [&_select]:bg-slate-50 [&_select]:pl-3 [&_select]:text-sm [&_select]:text-slate-900 dark:[&_select]:border-stone-700 dark:[&_select]:bg-stone-950 dark:[&_select]:text-stone-100 dark:[&_select]:[color-scheme:dark]"

/* -------------------------------------------------------------------------- */
/*                         Íconos de módulos del sistema                      */
/* -------------------------------------------------------------------------- */

// Mismos íconos que la barra lateral para reconocer cada módulo
export const MODULO_ICONOS: Record<ModuloId, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ReceiptText,
  kds: Refrigerator,
  menu: UtensilsCrossed,
  personal: Users,
  mesas: Grid2X2,
  transacciones: FileText,
}

/* -------------------------------------------------------------------------- */
/*                 Identidad visual de los roles operativos                   */
/* -------------------------------------------------------------------------- */

interface RolVisual {
  icon: LucideIcon
  className: string
}

const ROL_VISUALES: { clave: string; visual: RolVisual }[] = [
  {
    clave: "admin",
    visual: { icon: ShieldCheck, className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  },
  {
    clave: "caj",
    visual: { icon: Wallet, className: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  },
  {
    clave: "barist",
    visual: { icon: Coffee, className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
  },
  {
    clave: "mozo",
    visual: { icon: ConciergeBell, className: "bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-200" },
  },
  {
    clave: "cocin",
    visual: { icon: ChefHat, className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  },
]

const ROL_GENERICO: RolVisual = {
  icon: Tag,
  className: "bg-[#EDE5E6] text-[#4C0107] dark:bg-[#E7B7BC]/15 dark:text-[#E7B7BC]",
}

// Los roles son dinámicos: se reconoce el tipo por el nombre y si no, se usa un estilo neutro
export function getRolVisual(nombre: string): RolVisual {
  const texto = normalizarTexto(nombre)
  return ROL_VISUALES.find((r) => texto.includes(r.clave))?.visual ?? ROL_GENERICO
}

/* -------------------------------------------------------------------------- */
/*                Estados de usuario (usuarios.estado en la BD)               */
/* -------------------------------------------------------------------------- */

export const ESTADO_EMPLEADO_CONFIG: Record<EstadoEmpleado, { label: string; className: string }> = {
  activo: {
    label: "Activo",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  pendiente_activacion: {
    label: "Pendiente",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  suspendido: {
    label: "Suspendido",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  bloqueado: {
    label: "Bloqueado",
    className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
  inactivo: {
    label: "De baja",
    className: "bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300",
  },
}
