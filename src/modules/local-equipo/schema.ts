import { z } from "zod"
import type { RolUsuario } from "@/shared/constants/permisos"
import type { AreaMesa, AreaPos, EstadoMesa, MesaPos } from "@/modules/pos/schema"

/* -------------------------------------------------------------------------- */
/*            RF-11: Gestión de Personal y Asignación de Roles                */
/* -------------------------------------------------------------------------- */

// Rol operativo del empleado dentro del local
export const rolOperativoSchema = z.enum(["administrador", "cajero", "mozo", "barista", "cocina"])
export type RolOperativo = z.infer<typeof rolOperativoSchema>

export interface RolOperativoInfo {
  nombre: string
  descripcion: string
  // Nivel de acceso al sistema que hereda el empleado con este rol
  acceso: RolUsuario
}

export const ROLES_OPERATIVOS: Record<RolOperativo, RolOperativoInfo> = {
  administrador: {
    nombre: "Administrador",
    descripcion: "Supervisa la operación del local, el personal y la configuración.",
    acceso: "administrador",
  },
  cajero: {
    nombre: "Cajero",
    descripcion: "Registra cobros, abre y cierra la caja del turno.",
    acceso: "empleado",
  },
  mozo: {
    nombre: "Mozo",
    descripcion: "Atiende mesas, toma pedidos en el POS y los envía a cocina.",
    acceso: "empleado",
  },
  barista: {
    nombre: "Barista",
    descripcion: "Prepara las bebidas y gestiona las comandas de barra en el KDS.",
    acceso: "empleado",
  },
  cocina: {
    nombre: "Cocina",
    descripcion: "Prepara alimentos y marca la disponibilidad de productos.",
    acceso: "empleado",
  },
}

export const estadoEmpleadoSchema = z.enum(["activo", "baja"])
export type EstadoEmpleado = z.infer<typeof estadoEmpleadoSchema>

export interface Empleado {
  id: string
  nombres: string
  apellidos: string
  dni: string
  telefono: string
  correo: string
  rol: RolOperativo
  fechaIngreso: string // YYYY-MM-DD
  estado: EstadoEmpleado
  fechaBaja?: string // YYYY-MM-DD
  motivoBaja?: string
}

export type FiltroEstadoEmpleado = EstadoEmpleado | "todos"
export type FiltroRolEmpleado = RolOperativo | "todos"

export const FILTRO_ESTADO_LABELS: Record<FiltroEstadoEmpleado, string> = {
  todos: "Todos",
  activo: "Activos",
  baja: "De baja",
}

const hoyISO = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

export const empleadoFormSchema = z.object({
  nombres: z
    .string()
    .trim()
    .min(2, "Ingresa al menos 2 caracteres.")
    .max(60, "Máximo 60 caracteres.")
    .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/, "Solo se permiten letras y espacios."),
  apellidos: z
    .string()
    .trim()
    .min(2, "Ingresa al menos 2 caracteres.")
    .max(60, "Máximo 60 caracteres.")
    .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/, "Solo se permiten letras y espacios."),
  dni: z.string().trim().regex(/^\d{8}$/, "El DNI debe tener 8 dígitos."),
  telefono: z.string().trim().regex(/^9\d{8}$/, "Ingresa un celular de 9 dígitos que empiece con 9."),
  correo: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
  rol: rolOperativoSchema,
  fechaIngreso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha de ingreso.")
    .refine((v) => v <= hoyISO(), "La fecha de ingreso no puede ser futura."),
})

export type EmpleadoFormValues = z.infer<typeof empleadoFormSchema>
export type EmpleadoInput = EmpleadoFormValues

export const empleadoToFormValues = (empleado?: Empleado): EmpleadoFormValues => ({
  nombres: empleado?.nombres ?? "",
  apellidos: empleado?.apellidos ?? "",
  dni: empleado?.dni ?? "",
  telefono: empleado?.telefono ?? "",
  correo: empleado?.correo ?? "",
  rol: empleado?.rol ?? "mozo",
  fechaIngreso: empleado?.fechaIngreso ?? hoyISO(),
})

export const bajaEmpleadoSchema = z.object({
  motivo: z.string().trim().min(3, "Indica el motivo de la baja.").max(120, "Máximo 120 caracteres."),
})

export type BajaEmpleadoValues = z.infer<typeof bajaEmpleadoSchema>

export interface ResumenPersonal {
  total: number
  activos: number
  baja: number
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Configuración del Plano de Mesas                    */
/* -------------------------------------------------------------------------- */

export type { AreaMesa, EstadoMesa }
export type Mesa = MesaPos
export type Area = AreaPos

export interface PlanoMesas {
  areas: Area[]
  mesas: Mesa[]
}

export const CAPACIDAD_MAXIMA_MESA = 20

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
