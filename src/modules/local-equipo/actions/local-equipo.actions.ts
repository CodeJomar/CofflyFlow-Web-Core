import { apiRequest } from "@/lib/api/client"
import { CheckStatus } from "@/dtos/core/checkStatus.dto"
import { DataQuery } from "@/dtos/core/dataQuery.dto"
import { OneQuery } from "@/dtos/core/oneQuery.dto"
import type { ActualizarMesaPayload, CrearMesaPayload, MesaConPedidoDto, MesaDto } from "@/dtos/mesas"
import type {
  ActualizarRolPayload,
  CrearRolPayload,
  ModuloCatalogoDto,
  ReemplazarPermisosPayload,
  RolDetalleDto,
  RolResumenDto,
} from "@/dtos/roles"
import type { ActualizarUsuarioPayload, CargoDto, CrearUsuarioPayload, UsuarioDto } from "@/dtos/usuarios"

// Llamadas finas a la API NestJS. Unicidad, permisos delegables y bajas lógicas los valida el backend.

/* -------------------------------- Empleados -------------------------------- */

/** Una página de empleados (la API entrega como máximo 100 por página). */
export const getEmpleados = (pagina = 1) =>
  apiRequest<DataQuery<UsuarioDto>>(DataQuery, {
    method: "GET",
    url: "/users",
    params: { pagina, limite: 100 },
  })

/** Cargos que se pueden asignar a un empleado. */
export const getCargos = () =>
  apiRequest<CheckStatus<CargoDto[]>>(CheckStatus, { method: "GET", url: "/users/cargos" })

export const crearEmpleado = (payload: CrearUsuarioPayload) =>
  apiRequest<OneQuery<UsuarioDto>>(OneQuery, { method: "POST", url: "/users", data: payload })

export const actualizarEmpleado = (id: string, payload: ActualizarUsuarioPayload) =>
  apiRequest<OneQuery<UsuarioDto>>(OneQuery, { method: "PATCH", url: `/users/${id}`, data: payload })

/** Baja lógica: el empleado pierde el acceso y su historial se conserva. */
export const darDeBajaEmpleado = (id: string) =>
  apiRequest<CheckStatus>(CheckStatus, { method: "DELETE", url: `/users/${id}` })

/** Vuelve a enviar el correo con el enlace para activar la cuenta. */
export const reenviarActivacion = (id: string) =>
  apiRequest<CheckStatus>(CheckStatus, { method: "POST", url: `/users/${id}/reenviar-activacion` })

/* ------------------------------ Roles y permisos --------------------------- */

export const getRoles = () => apiRequest<CheckStatus<RolResumenDto[]>>(CheckStatus, { method: "GET", url: "/roles" })

export const getRol = (id: string) => apiRequest<OneQuery<RolDetalleDto>>(OneQuery, { method: "GET", url: `/roles/${id}` })

/** Todo lo que se puede conceder, agrupado por módulo. */
export const getCatalogoPermisos = () =>
  apiRequest<CheckStatus<ModuloCatalogoDto[]>>(CheckStatus, { method: "GET", url: "/roles/catalogo-permisos" })

export const crearRol = (payload: CrearRolPayload) =>
  apiRequest<OneQuery<RolDetalleDto>>(OneQuery, { method: "POST", url: "/roles", data: payload })

export const actualizarRol = (id: string, payload: ActualizarRolPayload) =>
  apiRequest<OneQuery<RolDetalleDto>>(OneQuery, { method: "PATCH", url: `/roles/${id}`, data: payload })

/** Reemplaza TODOS los permisos del rol; surte efecto de inmediato. */
export const reemplazarPermisosRol = (id: string, payload: ReemplazarPermisosPayload) =>
  apiRequest<OneQuery<RolDetalleDto>>(OneQuery, { method: "PUT", url: `/roles/${id}/permisos`, data: payload })

export const eliminarRol = (id: string) => apiRequest<CheckStatus>(CheckStatus, { method: "DELETE", url: `/roles/${id}` })

/* ----------------------------------- Mesas --------------------------------- */

export const getMesas = () => apiRequest<CheckStatus<MesaConPedidoDto[]>>(CheckStatus, { method: "GET", url: "/tables" })

export const crearMesa = (payload: CrearMesaPayload) =>
  apiRequest<OneQuery<MesaDto>>(OneQuery, { method: "POST", url: "/tables", data: payload })

export const actualizarMesa = (id: string, payload: ActualizarMesaPayload) =>
  apiRequest<OneQuery<MesaDto>>(OneQuery, { method: "PATCH", url: `/tables/${id}`, data: payload })

/** Retira la mesa del plano; la API no lo permite si tiene comensales o pedidos en curso. */
export const eliminarMesa = (id: string) => apiRequest<CheckStatus>(CheckStatus, { method: "DELETE", url: `/tables/${id}` })
