import { CheckStatus } from "@/dtos/core/checkStatus.dto"
import { DataQuery } from "@/dtos/core/dataQuery.dto"
import { OneQuery } from "@/dtos/core/oneQuery.dto"
import { getCatalogoPos, notificarCambioCatalogo } from "@/modules/pos/actions/pos.actions"
import {
  TODOS_LOS_PERMISOS,
  slugArea,
  type Area,
  type Empleado,
  type EmpleadoInput,
  type Mesa,
  type MesaInput,
  type PlanoMesas,
  type Rol,
  type RolInput,
} from "../schema"

// TODO: reemplazar por las llamadas reales al backend cuando estén disponibles.
// Los datos en memoria siguen la estructura de la base de datos:
//   roles + rol_permisos (modulo × accion) · usuarios (id_rol, estado, tipo_cuenta) · mesas (numero, capacidad, area)
// El plano de mesas usa el mismo catálogo del POS y notifica a los terminales abiertos (RF-12).
// Las funciones exportadas devuelven los DTOs de dtos/core para integrarse con los hooks de shared.

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const mismoTexto = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const nuevoId = (prefijo: string) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/* -------------------------------------------------------------------------- */
/*                 Roles operativos (tablas roles / rol_permisos)             */
/* -------------------------------------------------------------------------- */

let ROLES: Rol[] = [
  {
    id: "rol-administrador",
    nombre: "Administrador",
    descripcion:
      "Control total sobre la plataforma. Acceso irrestricto a configuración de negocio, finanzas, inventario y personal.",
    permisos: [...TODOS_LOS_PERMISOS],
    esSistema: true,
  },
  {
    id: "rol-cajero",
    nombre: "Cajero",
    descripcion: "Responsable del flujo de caja. Permisos para procesar pagos, emitir comprobantes, aplicar descuentos y cerrar turnos.",
    permisos: ["pos:crear_ordenes", "pos:aplicar_descuentos", "pos:cortes_caja", "transacciones:ver", "menu:ver"],
    esSistema: false,
  },
  {
    id: "rol-barista",
    nombre: "Barista",
    descripcion: "Gestión de preparación. Interacción principal con el Kitchen Display System (KDS) y marcado de órdenes listas.",
    permisos: ["kds:ver", "kds:completar", "menu:ver"],
    esSistema: false,
  },
  {
    id: "rol-mozo",
    nombre: "Mozo",
    descripcion: "Enfoque en salón. Permisos para apertura de mesas, toma de pedidos en el POS y adición de modificadores.",
    permisos: ["mesas:ver", "pos:crear_ordenes", "menu:ver"],
    esSistema: false,
  },
  {
    id: "rol-cocina",
    nombre: "Cocina",
    descripcion: "Preparación de alimentos. Visualiza las comandas en cocina y actualiza la disponibilidad de los productos.",
    permisos: ["kds:ver", "kds:completar", "menu:ver", "menu:editar"],
    esSistema: false,
  },
]

const copiarRol = (r: Rol): Rol => ({ ...r, permisos: [...r.permisos] })

function obtenerRol(id: string) {
  const rol = ROLES.find((r) => r.id === id)
  if (!rol) throw new Error("El rol no existe o fue eliminado.")
  return rol
}

function validarRolUnico(input: RolInput, id?: string) {
  if (ROLES.some((r) => r.id !== id && mismoTexto(r.nombre, input.nombre))) {
    throw new Error("Ya existe un rol con ese nombre.")
  }
}

async function getRolesInterno(): Promise<Rol[]> {
  await esperar(300)
  return ROLES.map(copiarRol)
}

async function crearRolInterno(input: RolInput): Promise<Rol> {
  await esperar(300)
  validarRolUnico(input)
  const nuevo: Rol = {
    id: nuevoId("rol-"),
    nombre: input.nombre.trim(),
    descripcion: input.descripcion.trim(),
    permisos: [...new Set(input.permisos)],
    esSistema: false,
  }
  ROLES = [...ROLES, nuevo]
  return copiarRol(nuevo)
}

async function actualizarRolInterno(id: string, input: RolInput): Promise<void> {
  await esperar(300)
  const rol = obtenerRol(id)
  if (rol.esSistema) throw new Error("Los permisos de un rol base del sistema no se pueden modificar.")
  validarRolUnico(input, id)
  ROLES = ROLES.map((r) =>
    r.id === id
      ? { ...r, nombre: input.nombre.trim(), descripcion: input.descripcion.trim(), permisos: [...new Set(input.permisos)] }
      : r
  )
}

async function eliminarRolInterno(id: string): Promise<void> {
  await esperar(250)
  const rol = obtenerRol(id)
  if (rol.esSistema) throw new Error("Un rol base del sistema no se puede eliminar.")
  const asignados = EMPLEADOS.filter((e) => e.idRol === id).length
  if (asignados > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${asignados} ${asignados === 1 ? "empleado asignado" : "empleados asignados"}. Reasígnalos primero.`
    )
  }
  ROLES = ROLES.filter((r) => r.id !== id)
}

/* -------------------------------------------------------------------------- */
/*       RF-11: Gestión de Personal y Asignación de Roles (tabla usuarios)    */
/* -------------------------------------------------------------------------- */

let EMPLEADOS: Empleado[] = [
  {
    id: "usr-01",
    nombre: "Jomar Peralta Ríos",
    email: "jomar.peralta@coffyflow.pe",
    idRol: "rol-administrador",
    estado: "activo",
    tipoCuenta: "OWNER",
    fechaCreacion: "2024-03-01T09:00:00-05:00",
  },
  {
    id: "usr-02",
    nombre: "Lucía Ramírez Soto",
    email: "lucia.ramirez@coffyflow.pe",
    idRol: "rol-cajero",
    estado: "activo",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: "2024-06-15T09:00:00-05:00",
  },
  {
    id: "usr-03",
    nombre: "Carlos Mendoza Quispe",
    email: "carlos.mendoza@coffyflow.pe",
    idRol: "rol-mozo",
    estado: "activo",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: "2024-08-01T09:00:00-05:00",
  },
  {
    id: "usr-04",
    nombre: "Andrea Paredes León",
    email: "andrea.paredes@coffyflow.pe",
    idRol: "rol-mozo",
    estado: "activo",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: "2025-01-10T09:00:00-05:00",
  },
  {
    id: "usr-05",
    nombre: "Valeria Salas Torres",
    email: "valeria.salas@coffyflow.pe",
    idRol: "rol-barista",
    estado: "activo",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: "2024-11-20T09:00:00-05:00",
  },
  {
    id: "usr-06",
    nombre: "Miguel Ángeles Huamán",
    email: "miguel.angeles@coffyflow.pe",
    idRol: "rol-cocina",
    estado: "pendiente_activacion",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: "2026-09-28T09:00:00-05:00",
  },
  {
    id: "usr-07",
    nombre: "Jorge Tello Vargas",
    email: "jorge.tello@coffyflow.pe",
    idRol: "rol-mozo",
    estado: "inactivo",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: "2024-04-05T09:00:00-05:00",
  },
  {
    id: "usr-08",
    nombre: "Rosa Huertas Campos",
    email: "rosa.huertas@coffyflow.pe",
    idRol: "rol-barista",
    estado: "suspendido",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: "2025-05-12T09:00:00-05:00",
  },
]

const copiarEmpleado = (e: Empleado): Empleado => ({ ...e })

function obtenerEmpleado(id: string) {
  const empleado = EMPLEADOS.find((e) => e.id === id)
  if (!empleado) throw new Error("El empleado no existe.")
  return empleado
}

function validarEmpleado(input: EmpleadoInput, id?: string) {
  obtenerRol(input.idRol)
  if (EMPLEADOS.some((e) => e.id !== id && mismoTexto(e.email, input.email))) {
    throw new Error("Ya existe un usuario registrado con ese correo.")
  }
}

async function getEmpleadosInterno(): Promise<Empleado[]> {
  await esperar(350)
  return EMPLEADOS.map(copiarEmpleado)
}

// Las cuentas nuevas inician como "pendiente_activacion" hasta verificar el correo
async function registrarEmpleadoInterno(input: EmpleadoInput): Promise<Empleado> {
  await esperar(300)
  validarEmpleado(input)
  const nuevo: Empleado = {
    id: nuevoId("usr-"),
    nombre: input.nombre.trim(),
    email: input.email.trim().toLowerCase(),
    idRol: input.idRol,
    estado: "pendiente_activacion",
    tipoCuenta: "EMPLOYEE",
    fechaCreacion: new Date().toISOString(),
  }
  EMPLEADOS = [...EMPLEADOS, nuevo]
  return copiarEmpleado(nuevo)
}

async function actualizarEmpleadoInterno(id: string, input: EmpleadoInput): Promise<void> {
  await esperar(300)
  const empleado = obtenerEmpleado(id)
  validarEmpleado(input, id)
  if (empleado.tipoCuenta === "OWNER" && input.idRol !== empleado.idRol) {
    throw new Error("No se puede cambiar el rol de la cuenta del Dueño.")
  }
  EMPLEADOS = EMPLEADOS.map((e) =>
    e.id === id ? { ...e, nombre: input.nombre.trim(), email: input.email.trim().toLowerCase(), idRol: input.idRol } : e
  )
}

// Baja lógica: el usuario pasa a "inactivo" y pierde el acceso, pero se conserva su historial
async function darDeBajaEmpleadoInterno(id: string): Promise<void> {
  await esperar(300)
  const empleado = obtenerEmpleado(id)
  if (empleado.tipoCuenta === "OWNER") throw new Error("La cuenta del Dueño no se puede dar de baja.")
  if (empleado.estado === "inactivo") throw new Error("El empleado ya se encuentra de baja.")
  EMPLEADOS = EMPLEADOS.map((e) => (e.id === id ? { ...e, estado: "inactivo" } : e))
}

async function reactivarEmpleadoInterno(id: string): Promise<void> {
  await esperar(300)
  obtenerEmpleado(id)
  EMPLEADOS = EMPLEADOS.map((e) => (e.id === id ? { ...e, estado: "activo" } : e))
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Configuración del Plano de Mesas                    */
/* -------------------------------------------------------------------------- */

async function getPlanoMesasInterno(): Promise<PlanoMesas> {
  const catalogo = await getCatalogoPos()
  return {
    areas: catalogo.areas.map((a) => ({ ...a })),
    mesas: catalogo.mesas.map((m) => ({ ...m })),
  }
}

async function validarMesa(input: MesaInput, id?: string) {
  const catalogo = await getCatalogoPos()
  if (!catalogo.areas.some((a) => a.id === input.area)) {
    throw new Error("El área seleccionada ya no existe.")
  }
  if (catalogo.mesas.some((m) => m.id !== id && mismoTexto(m.nombre, input.nombre))) {
    throw new Error("Ya existe una mesa con ese identificador.")
  }
  return catalogo
}

async function registrarMesaInterno(input: MesaInput): Promise<Mesa> {
  await esperar(250)
  const catalogo = await validarMesa(input)
  const nueva: Mesa = { id: `m${Date.now().toString(36)}`, ...input, estado: "libre" }
  catalogo.mesas = [...catalogo.mesas, nueva]
  notificarCambioCatalogo()
  return { ...nueva }
}

async function actualizarMesaInterno(id: string, input: MesaInput): Promise<Mesa> {
  await esperar(250)
  const catalogo = await validarMesa(input, id)
  const actual = catalogo.mesas.find((m) => m.id === id)
  if (!actual) throw new Error("La mesa no existe o fue eliminada.")

  const actualizada = { ...actual, ...input }
  catalogo.mesas = catalogo.mesas.map((m) => (m.id === id ? actualizada : m))
  notificarCambioCatalogo()
  return { ...actualizada }
}

async function eliminarMesaInterno(id: string): Promise<void> {
  await esperar(250)
  const catalogo = await getCatalogoPos()
  const mesa = catalogo.mesas.find((m) => m.id === id)
  if (!mesa) throw new Error("La mesa no existe o fue eliminada.")
  if (mesa.estado !== "libre") {
    throw new Error(`No se puede eliminar "${mesa.nombre}" porque tiene un pedido en curso.`)
  }
  catalogo.mesas = catalogo.mesas.filter((m) => m.id !== id)
  notificarCambioCatalogo()
}

async function registrarAreaInterno(nombre: string): Promise<Area> {
  await esperar(250)
  const catalogo = await getCatalogoPos()
  const limpio = nombre.trim()
  if (catalogo.areas.some((a) => mismoTexto(a.nombre, limpio))) {
    throw new Error("Ya existe un área con ese nombre.")
  }

  // Evita colisiones de identificador (p. ej. dos nombres que generan el mismo slug)
  const base = slugArea(limpio) || "area"
  let id = base
  for (let i = 2; catalogo.areas.some((a) => a.id === id); i++) id = `${base}-${i}`

  const nueva: Area = { id, nombre: limpio }
  catalogo.areas = [...catalogo.areas, nueva]
  notificarCambioCatalogo()
  return { ...nueva }
}

async function renombrarAreaInterno(id: string, nombre: string): Promise<Area> {
  await esperar(250)
  const catalogo = await getCatalogoPos()
  const limpio = nombre.trim()
  if (!catalogo.areas.some((a) => a.id === id)) throw new Error("El área no existe o fue eliminada.")
  if (catalogo.areas.some((a) => a.id !== id && mismoTexto(a.nombre, limpio))) {
    throw new Error("Ya existe otra área con ese nombre.")
  }

  const actualizada: Area = { id, nombre: limpio }
  catalogo.areas = catalogo.areas.map((a) => (a.id === id ? actualizada : a))
  notificarCambioCatalogo()
  return { ...actualizada }
}

async function eliminarAreaInterno(id: string): Promise<void> {
  await esperar(250)
  const catalogo = await getCatalogoPos()
  if (!catalogo.areas.some((a) => a.id === id)) throw new Error("El área no existe o fue eliminada.")

  const enUso = catalogo.mesas.filter((m) => m.area === id).length
  if (enUso > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${enUso} ${enUso === 1 ? "mesa asignada" : "mesas asignadas"}. Muévelas o elimínalas primero.`
    )
  }

  catalogo.areas = catalogo.areas.filter((a) => a.id !== id)
  notificarCambioCatalogo()
}

/* -------------------------------------------------------------------------- */
/*            API del módulo: respuestas con los DTOs de dtos/core            */
/* -------------------------------------------------------------------------- */

const mensajeDe = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto)

async function listado<T>(operacion: () => Promise<T[]>, porDefecto: string): Promise<DataQuery<T>> {
  try {
    return DataQuery.ok(await operacion())
  } catch (e) {
    return DataQuery.error(mensajeDe(e, porDefecto))
  }
}

async function consulta<T>(operacion: () => Promise<T>, porDefecto: string): Promise<OneQuery<T>> {
  try {
    return OneQuery.ok(await operacion())
  } catch (e) {
    return OneQuery.error(mensajeDe(e, porDefecto))
  }
}

async function comando(operacion: () => Promise<unknown>, porDefecto: string): Promise<CheckStatus> {
  try {
    await operacion()
    return CheckStatus.ok()
  } catch (e) {
    return CheckStatus.error(mensajeDe(e, porDefecto))
  }
}

// Roles y permisos
export const getRoles = () => listado(getRolesInterno, "No se pudieron cargar los roles.")

export const crearRol = (input: RolInput) => consulta(() => crearRolInterno(input), "No se pudo crear el rol.")

export const actualizarRol = (id: string, input: RolInput) =>
  comando(() => actualizarRolInterno(id, input), "No se pudo actualizar el rol.")

export const eliminarRol = (id: string) => comando(() => eliminarRolInterno(id), "No se pudo eliminar el rol.")

// RF-11: Personal
export const getEmpleados = () => listado(getEmpleadosInterno, "No se pudo cargar la lista de personal.")

export const registrarEmpleado = (input: EmpleadoInput) =>
  consulta(() => registrarEmpleadoInterno(input), "No se pudo registrar al empleado.")

export const actualizarEmpleado = (id: string, input: EmpleadoInput) =>
  comando(() => actualizarEmpleadoInterno(id, input), "No se pudo actualizar al empleado.")

// La baja es lógica (estado "inactivo"), por eso se usa con useEntityDelete
export const darDeBajaEmpleado = (id: string) =>
  comando(() => darDeBajaEmpleadoInterno(id), "No se pudo dar de baja al empleado.")

export const reactivarEmpleado = (id: string) =>
  comando(() => reactivarEmpleadoInterno(id), "No se pudo reactivar al empleado.")

// RF-12: Plano de mesas
export const getPlanoMesas = () => consulta(() => getPlanoMesasInterno(), "No se pudo cargar el plano de mesas.")

export const registrarMesa = (input: MesaInput) =>
  consulta(() => registrarMesaInterno(input), "No se pudo registrar la mesa.")

export const actualizarMesa = (id: string, input: MesaInput) =>
  comando(() => actualizarMesaInterno(id, input), "No se pudo actualizar la mesa.")

export const eliminarMesa = (id: string) => comando(() => eliminarMesaInterno(id), "No se pudo eliminar la mesa.")

export const registrarArea = (nombre: string) =>
  consulta(() => registrarAreaInterno(nombre), "No se pudo crear el área.")

export const renombrarArea = (id: string, nombre: string) =>
  consulta(() => renombrarAreaInterno(id, nombre), "No se pudo renombrar el área.")

export const eliminarArea = (id: string) => comando(() => eliminarAreaInterno(id), "No se pudo eliminar el área.")
