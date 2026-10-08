import { z } from "zod"
import type { AreaMesa, AreaPos, EstadoMesa, MesaPos } from "@/modules/pos/schema"

/* -------------------------------------------------------------------------- */
/*        Catálogo de módulos y acciones (tablas modulos / acciones)          */
/* -------------------------------------------------------------------------- */

export type ModuloId = "dashboard" | "pos" | "kds" | "menu" | "personal" | "mesas" | "transacciones"

export interface AccionModulo {
  id: string
  nombre: string
}

export interface ModuloSistema {
  id: ModuloId
  nombre: string
  acciones: AccionModulo[]
}

// Cada permiso de un rol es una fila de rol_permisos: (id_rol, id_modulo, id_accion)
export const MODULOS_SISTEMA: ModuloSistema[] = [
  {
    id: "dashboard",
    nombre: "Dashboard",
    acciones: [
      { id: "ver", nombre: "Ver métricas globales" },
      { id: "exportar", nombre: "Exportar reportes" },
    ],
  },
  {
    id: "pos",
    nombre: "POS",
    acciones: [
      { id: "crear_ordenes", nombre: "Crear órdenes" },
      { id: "aplicar_descuentos", nombre: "Aplicar descuentos" },
      { id: "cortes_caja", nombre: "Cortes de caja" },
    ],
  },
  {
    id: "kds",
    nombre: "KDS",
    acciones: [
      { id: "ver", nombre: "Ver comandas activas" },
      { id: "completar", nombre: "Marcar como completado" },
    ],
  },
  {
    id: "menu",
    nombre: "Menú",
    acciones: [
      { id: "ver", nombre: "Ver inventario" },
      { id: "editar", nombre: "Editar precios/ítems" },
    ],
  },
  {
    id: "personal",
    nombre: "Personal",
    acciones: [
      { id: "ver", nombre: "Ver lista de empleados" },
      { id: "gestionar", nombre: "Gestionar roles y permisos" },
    ],
  },
  {
    id: "mesas",
    nombre: "Mesas",
    acciones: [
      { id: "ver", nombre: "Ver plano de mesas" },
      { id: "configurar", nombre: "Configurar plano y áreas" },
    ],
  },
  {
    id: "transacciones",
    nombre: "Transacciones",
    acciones: [
      { id: "ver", nombre: "Ver historial de ventas" },
      { id: "reembolsos", nombre: "Emitir reembolsos" },
    ],
  },
]

// Clave compacta de un permiso: "<id_modulo>:<id_accion>"
export const clavePermiso = (modulo: ModuloId, accion: string) => `${modulo}:${accion}`

export const TODOS_LOS_PERMISOS = MODULOS_SISTEMA.flatMap((m) => m.acciones.map((a) => clavePermiso(m.id, a.id)))

export interface ModuloConAcceso {
  id: ModuloId
  etiqueta: string
}

// Resume los permisos de un rol en los módulos a los que tiene acceso
export function modulosConAcceso(permisos: readonly string[]): ModuloConAcceso[] {
  const asignados = new Set(permisos)
  return MODULOS_SISTEMA.flatMap((modulo) => {
    const acciones = modulo.acciones.filter((a) => asignados.has(clavePermiso(modulo.id, a.id)))
    if (acciones.length === 0) return []
    // Si solo puede consultar, se indica como acceso de lectura
    const soloLectura = modulo.acciones.length > 1 && acciones.length === 1 && acciones[0].id === "ver"
    return [{ id: modulo.id, etiqueta: soloLectura ? `${modulo.nombre} (Lectura)` : modulo.nombre }]
  })
}

/* -------------------------------------------------------------------------- */
/*                 Roles operativos (tablas roles / rol_permisos)             */
/* -------------------------------------------------------------------------- */

export interface Rol {
  id: string
  nombre: string
  descripcion: string
  permisos: string[]
  // Rol base del sistema: no se puede eliminar ni cambiar sus permisos
  esSistema: boolean
}

export const rolFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(40, "Máximo 40 caracteres."),
  descripcion: z.string().trim().max(160, "Máximo 160 caracteres."),
  permisos: z.array(z.string()).min(1, "Selecciona al menos un permiso para el rol."),
})

export type RolFormValues = z.infer<typeof rolFormSchema>
export type RolInput = RolFormValues

export const rolToFormValues = (rol?: Rol): RolFormValues => ({
  nombre: rol?.nombre ?? "",
  descripcion: rol?.descripcion ?? "",
  permisos: rol ? [...rol.permisos] : [],
})

/* -------------------------------------------------------------------------- */
/*       RF-11: Gestión de Personal y Asignación de Roles (tabla usuarios)    */
/* -------------------------------------------------------------------------- */

export const estadoEmpleadoSchema = z.enum(["pendiente_activacion", "activo", "suspendido", "inactivo", "bloqueado"])
export type EstadoEmpleado = z.infer<typeof estadoEmpleadoSchema>

export type TipoCuenta = "OWNER" | "EMPLOYEE"

export interface Empleado {
  id: string
  nombre: string
  email: string
  idRol: string | null
  estado: EstadoEmpleado
  tipoCuenta: TipoCuenta
  fechaCreacion: string // ISO
}

export type FiltroEstadoEmpleado = EstadoEmpleado | "todos"
export type FiltroRolEmpleado = string | "todos"

export const empleadoFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "Ingresa el nombre completo.")
    .max(80, "Máximo 80 caracteres.")
    .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/, "Solo se permiten letras y espacios."),
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
  idRol: z.string().min(1, "Selecciona el rol operativo."),
})

export type EmpleadoFormValues = z.infer<typeof empleadoFormSchema>
export type EmpleadoInput = EmpleadoFormValues

export const empleadoToFormValues = (empleado?: Empleado, rolPorDefecto = ""): EmpleadoFormValues => ({
  nombre: empleado?.nombre ?? "",
  email: empleado?.email ?? "",
  idRol: empleado?.idRol ?? rolPorDefecto,
})

/* -------------------------------------------------------------------------- */
/*            RF-12: Configuración del Plano de Mesas (tabla mesas)           */
/* -------------------------------------------------------------------------- */

export type { AreaMesa, EstadoMesa }
export type Mesa = MesaPos
export type Area = AreaPos

export interface PlanoMesas {
  areas: Area[]
  mesas: Mesa[]
}

export const CAPACIDAD_MAXIMA_MESA = 20

// "nombre" corresponde a mesas.numero (identificador visible de la mesa)
export const mesaFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Ingresa el identificador de la mesa.")
    .max(20, "Máximo 20 caracteres."),
  area: z.string().min(1, "Selecciona un área de atención."),
  capacidad: z
    .string()
    .trim()
    .regex(/^\d+$/, "Ingresa un número entero.")
    .refine((v) => Number(v) >= 1, "La capacidad mínima es 1 persona.")
    .refine((v) => Number(v) <= CAPACIDAD_MAXIMA_MESA, `La capacidad máxima es ${CAPACIDAD_MAXIMA_MESA} personas.`),
})

export type MesaFormValues = z.infer<typeof mesaFormSchema>

export interface MesaInput {
  nombre: string
  area: AreaMesa
  capacidad: number
}

export const mesaFormToInput = (values: MesaFormValues): MesaInput => ({
  nombre: values.nombre.trim(),
  area: values.area,
  capacidad: Number(values.capacidad),
})

export const mesaToFormValues = (mesa?: Mesa, areaPorDefecto = ""): MesaFormValues => ({
  nombre: mesa?.nombre ?? "",
  area: mesa?.area ?? areaPorDefecto,
  capacidad: mesa ? String(mesa.capacidad) : "4",
})

export const areaFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(30, "Máximo 30 caracteres."),
})

export type AreaFormValues = z.infer<typeof areaFormSchema>

// Genera un identificador legible a partir del nombre ("Segundo Piso" → "segundo-piso")
export const slugArea = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
