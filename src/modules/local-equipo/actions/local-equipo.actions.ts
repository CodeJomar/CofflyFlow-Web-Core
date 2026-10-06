import { getCatalogoPos, notificarCambioCatalogo } from "@/modules/pos/actions/pos.actions"
import {
  slugArea,
  type Area,
  type Empleado,
  type EmpleadoInput,
  type Mesa,
  type MesaInput,
  type PlanoMesas,
} from "../schema"

// TODO: reemplazar por las llamadas reales al backend cuando estén disponibles.
// Por ahora el personal vive en memoria y el plano de mesas usa el mismo catálogo del POS,
// notificando a los terminales abiertos en cada cambio (RF-12).

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const mismoTexto = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/* -------------------------------------------------------------------------- */
/*            RF-11: Gestión de Personal y Asignación de Roles                */
/* -------------------------------------------------------------------------- */

const EMPLEADOS: Empleado[] = [
  {
    id: "e01",
    nombres: "Jomar",
    apellidos: "Peralta Ríos",
    dni: "71234568",
    telefono: "987654321",
    correo: "jomar.peralta@coffyflow.pe",
    rol: "administrador",
    fechaIngreso: "2024-03-01",
    estado: "activo",
  },
  {
    id: "e02",
    nombres: "Lucía",
    apellidos: "Ramírez Soto",
    dni: "72345679",
    telefono: "912345678",
    correo: "lucia.ramirez@coffyflow.pe",
    rol: "cajero",
    fechaIngreso: "2024-06-15",
    estado: "activo",
  },
  {
    id: "e03",
    nombres: "Carlos",
    apellidos: "Mendoza Quispe",
    dni: "73456780",
    telefono: "923456789",
    correo: "carlos.mendoza@coffyflow.pe",
    rol: "mozo",
    fechaIngreso: "2024-08-01",
    estado: "activo",
  },
  {
    id: "e04",
    nombres: "Andrea",
    apellidos: "Paredes León",
    dni: "74567891",
    telefono: "934567890",
    correo: "andrea.paredes@coffyflow.pe",
    rol: "mozo",
    fechaIngreso: "2025-01-10",
    estado: "activo",
  },
  {
    id: "e05",
    nombres: "Valeria",
    apellidos: "Salas Torres",
    dni: "75678902",
    telefono: "945678901",
    correo: "valeria.salas@coffyflow.pe",
    rol: "barista",
    fechaIngreso: "2024-11-20",
    estado: "activo",
  },
  {
    id: "e06",
    nombres: "Miguel",
    apellidos: "Ángeles Huamán",
    dni: "76789013",
    telefono: "956789012",
    correo: "miguel.angeles@coffyflow.pe",
    rol: "cocina",
    fechaIngreso: "2025-02-03",
    estado: "activo",
  },
  {
    id: "e07",
    nombres: "Jorge",
    apellidos: "Tello Vargas",
    dni: "77890124",
    telefono: "967890123",
    correo: "jorge.tello@coffyflow.pe",
    rol: "mozo",
    fechaIngreso: "2024-04-05",
    estado: "baja",
    fechaBaja: "2025-07-31",
    motivoBaja: "Renuncia voluntaria",
  },
]

const copiarEmpleado = (e: Empleado): Empleado => ({ ...e })

function obtenerIndiceEmpleado(id: string) {
  const index = EMPLEADOS.findIndex((e) => e.id === id)
  if (index === -1) throw new Error("El empleado no existe.")
  return index
}

function validarEmpleadoUnico(input: EmpleadoInput, id?: string) {
  if (EMPLEADOS.some((e) => e.id !== id && e.dni === input.dni)) {
    throw new Error("Ya existe un empleado registrado con ese DNI.")
  }
  if (EMPLEADOS.some((e) => e.id !== id && mismoTexto(e.correo, input.correo))) {
    throw new Error("Ya existe un empleado registrado con ese correo.")
  }
}

export async function getEmpleados(): Promise<Empleado[]> {
  await esperar(350)
  return EMPLEADOS.map(copiarEmpleado)
}

export async function registrarEmpleado(input: EmpleadoInput): Promise<Empleado> {
  await esperar(300)
  validarEmpleadoUnico(input)
  const nuevo: Empleado = { id: `e${Date.now().toString(36)}`, ...input, estado: "activo" }
  EMPLEADOS.push(nuevo)
  return copiarEmpleado(nuevo)
}

export async function actualizarEmpleado(id: string, input: EmpleadoInput): Promise<Empleado> {
  await esperar(300)
  const index = obtenerIndiceEmpleado(id)
  validarEmpleadoUnico(input, id)
  EMPLEADOS[index] = { ...EMPLEADOS[index], ...input }
  return copiarEmpleado(EMPLEADOS[index])
}

export async function darDeBajaEmpleado(id: string, motivo: string): Promise<Empleado> {
  await esperar(300)
  const index = obtenerIndiceEmpleado(id)
  if (EMPLEADOS[index].estado === "baja") throw new Error("El empleado ya se encuentra de baja.")

  // Siempre debe quedar al menos un administrador activo en el local
  const esUltimoAdmin =
    EMPLEADOS[index].rol === "administrador" &&
    EMPLEADOS.filter((e) => e.rol === "administrador" && e.estado === "activo").length === 1
  if (esUltimoAdmin) throw new Error("No puedes dar de baja al único administrador activo.")

  EMPLEADOS[index] = { ...EMPLEADOS[index], estado: "baja", fechaBaja: hoyISO(), motivoBaja: motivo.trim() }
  return copiarEmpleado(EMPLEADOS[index])
}

export async function reactivarEmpleado(id: string): Promise<Empleado> {
  await esperar(300)
  const index = obtenerIndiceEmpleado(id)
  EMPLEADOS[index] = { ...EMPLEADOS[index], estado: "activo", fechaBaja: undefined, motivoBaja: undefined }
  return copiarEmpleado(EMPLEADOS[index])
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Configuración del Plano de Mesas                    */
/* -------------------------------------------------------------------------- */

export async function getPlanoMesas(): Promise<PlanoMesas> {
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

export async function registrarMesa(input: MesaInput): Promise<Mesa> {
  await esperar(250)
  const catalogo = await validarMesa(input)
  const nueva: Mesa = { id: `m${Date.now().toString(36)}`, ...input, estado: "libre" }
  catalogo.mesas = [...catalogo.mesas, nueva]
  notificarCambioCatalogo()
  return { ...nueva }
}

export async function actualizarMesa(id: string, input: MesaInput): Promise<Mesa> {
  await esperar(250)
  const catalogo = await validarMesa(input, id)
  const actual = catalogo.mesas.find((m) => m.id === id)
  if (!actual) throw new Error("La mesa no existe o fue eliminada.")

  const actualizada = { ...actual, ...input }
  catalogo.mesas = catalogo.mesas.map((m) => (m.id === id ? actualizada : m))
  notificarCambioCatalogo()
  return { ...actualizada }
}

export async function eliminarMesa(id: string): Promise<void> {
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

export async function registrarArea(nombre: string): Promise<Area> {
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

export async function renombrarArea(id: string, nombre: string): Promise<Area> {
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

export async function eliminarArea(id: string): Promise<void> {
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
