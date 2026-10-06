import { ChefHat, Coffee, HandPlatter, ShieldCheck, Wallet, type LucideIcon } from "lucide-react"
import { PERMISO, type Permiso } from "@/shared/constants/permisos"
import type { EstadoEmpleado, RolOperativo } from "../schema"

// Se reutiliza la misma identidad visual del POS (paneles, chips, estados e íconos de área)
export { ESTADO_MESA_CONFIG, getAreaIcon, opcionClass, panelClass } from "@/modules/pos/components"

// Ícono y color por rol operativo, con variantes legibles en modo oscuro
export const ROL_OPERATIVO_CONFIG: Record<RolOperativo, { icon: LucideIcon; className: string }> = {
  administrador: {
    icon: ShieldCheck,
    className: "bg-[#EDE5E6] text-[#4C0107] dark:bg-[#E7B7BC]/15 dark:text-[#E7B7BC]",
  },
  cajero: {
    icon: Wallet,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  mozo: {
    icon: HandPlatter,
    className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  barista: {
    icon: Coffee,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  cocina: {
    icon: ChefHat,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  },
}

export const ESTADO_EMPLEADO_CONFIG: Record<EstadoEmpleado, { label: string; className: string }> = {
  activo: {
    label: "Activo",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  baja: {
    label: "De baja",
    className: "bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300",
  },
}

// Matriz de permisos por módulo que se muestra en "Roles y Permisos"
export const MODULOS_PERMISOS: { modulo: string; permisos: { label: string; permiso: Permiso }[] }[] = [
  {
    modulo: "Punto de venta",
    permisos: [
      { label: "Ver POS", permiso: PERMISO.READ_POS },
      { label: "Tomar pedidos", permiso: PERMISO.CREATE_ORDER },
      { label: "Editar pedidos", permiso: PERMISO.UPDATE_ORDER },
      { label: "Anular pedidos", permiso: PERMISO.CANCEL_ORDER },
    ],
  },
  {
    modulo: "Menú y catálogo",
    permisos: [
      { label: "Ver menú", permiso: PERMISO.READ_MENU },
      { label: "Crear y editar productos", permiso: PERMISO.UPDATE_PRODUCT },
      { label: "Marcar agotados", permiso: PERMISO.TOGGLE_STOCK },
    ],
  },
  {
    modulo: "Mesas",
    permisos: [
      { label: "Ver mesas", permiso: PERMISO.READ_TABLES },
      { label: "Configurar plano", permiso: PERMISO.UPDATE_TABLE },
    ],
  },
  {
    modulo: "Personal",
    permisos: [
      { label: "Ver personal", permiso: PERMISO.READ_STAFF },
      { label: "Registrar y dar de baja", permiso: PERMISO.CREATE_STAFF },
    ],
  },
  {
    modulo: "Caja y reportes",
    permisos: [
      { label: "Gestionar caja", permiso: PERMISO.READ_CASH_SHIFT },
      { label: "Ver dashboard", permiso: PERMISO.READ_DASHBOARD },
      { label: "Ver KDS", permiso: PERMISO.READ_KDS },
    ],
  },
]
