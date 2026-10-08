import { z } from "zod"

import type { ModuloCatalogoDto, RolDetalleDto, RolResumenDto } from "@/dtos/roles"
import type { CargoDto, EstadoUsuario, UsuarioDto } from "@/dtos/usuarios"
import type { MesaConPedidoDto } from "@/dtos/mesas"

/* -------------------------------------------------------------------------- */
/*                         Roles (cargos) y permisos                          */
/* -------------------------------------------------------------------------- */

export type Rol = RolResumenDto
export type RolDetalle = RolDetalleDto
export type ModuloCatalogo = ModuloCatalogoDto

/** "MODULO:ACCION" de un permiso, igual al que entrega la sesión. */
export const clavePermiso = (modulo: string, accion: string) => `${modulo}:${accion}`

export const permisoDesdeClave = (clave: string) => {
  const [modulo, accion] = clave.split(":")
  return { modulo, accion }
}

export const permisosDelRol = (rol: Pick<RolDetalleDto, "permisos">): string[] =>
  rol.permisos.map((p) => clavePermiso(p.modulo, p.accion))

/** Todas las claves "MODULO:ACCION" que existen en el catálogo de permisos de la API. */
export const todasLasClaves = (catalogo: ModuloCatalogo[]): string[] =>
  catalogo.flatMap((m) => m.acciones.map((a) => clavePermiso(m.modulo, a.accion)))

export const rolFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(50, "Máximo 50 caracteres."),
  descripcion: z.string().trim().max(255, "Máximo 255 caracteres."),
  permisos: z.array(z.string()).min(1, "Selecciona al menos un permiso para el rol."),
})

export type RolFormValues = z.infer<typeof rolFormSchema>

export const rolToFormValues = (rol?: RolDetalle): RolFormValues => ({
  nombre: rol?.nombre ?? "",
  descripcion: rol?.descripcion ?? "",
  permisos: rol ? permisosDelRol(rol) : [],
})

/* -------------------------------------------------------------------------- */
/*                 Gestión de personal y asignación de cargos                 */
/* -------------------------------------------------------------------------- */

export type Empleado = UsuarioDto
export type Cargo = CargoDto
export type EstadoEmpleado = EstadoUsuario

export const estadoEmpleadoSchema = z.enum(["pendiente_activacion", "activo", "suspendido", "inactivo", "bloqueado"])

export type FiltroEstadoEmpleado = EstadoEmpleado | "todos"
export type FiltroRolEmpleado = string | "todos"

export const empleadoFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "Ingresa el nombre completo.")
    .max(100, "Máximo 100 caracteres.")
    .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/, "Solo se permiten letras y espacios."),
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido.").max(150, "Máximo 150 caracteres."),
  idRol: z.string().min(1, "Selecciona el cargo."),
})

export type EmpleadoFormValues = z.infer<typeof empleadoFormSchema>

export const empleadoToFormValues = (empleado?: Empleado, rolPorDefecto = ""): EmpleadoFormValues => ({
  nombre: empleado?.nombre ?? "",
  email: empleado?.email ?? "",
  idRol: empleado?.id_rol ?? rolPorDefecto,
})

/* -------------------------------------------------------------------------- */
/*                    Configuración del plano de mesas                        */
/* -------------------------------------------------------------------------- */

export type Mesa = MesaConPedidoDto

export const FILTRO_TODAS_LAS_AREAS = "todas" as const
export const AREA_SIN_ASIGNAR = "Sin área"

export const CAPACIDAD_MAXIMA_MESA = 50

/** Área de una mesa (texto libre que administra el propietario); sin área se agrupan en «Sin área». */
export const areaDeMesa = (mesa: Pick<Mesa, "area">): string => mesa.area?.trim() || AREA_SIN_ASIGNAR

export const areasDeMesas = (mesas: Pick<Mesa, "area">[]): string[] =>
  [...new Set(mesas.map(areaDeMesa))].sort((a, b) => a.localeCompare(b, "es"))

// `numero` es el identificador visible de la mesa
export const mesaFormSchema = z.object({
  numero: z.string().trim().min(1, "Ingresa el identificador de la mesa.").max(10, "Máximo 10 caracteres."),
  area: z.string().trim().max(30, "Máximo 30 caracteres."),
  capacidad: z
    .string()
    .trim()
    .regex(/^\d+$/, "Ingresa un número entero.")
    .refine((v) => Number(v) >= 1, "La capacidad mínima es 1 persona.")
    .refine((v) => Number(v) <= CAPACIDAD_MAXIMA_MESA, `La capacidad máxima es ${CAPACIDAD_MAXIMA_MESA} personas.`),
})

export type MesaFormValues = z.infer<typeof mesaFormSchema>

export const mesaToFormValues = (mesa?: Mesa, areaPorDefecto = ""): MesaFormValues => ({
  numero: mesa?.numero ?? "",
  area: mesa?.area ?? areaPorDefecto,
  capacidad: mesa ? String(mesa.capacidad) : "4",
})

