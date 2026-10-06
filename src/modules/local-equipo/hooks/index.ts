"use client"

import * as React from "react"
import { suscribirseCambiosCatalogo } from "@/modules/pos/actions/pos.actions"
import {
  actualizarEmpleado,
  actualizarMesa,
  darDeBajaEmpleado,
  eliminarArea,
  eliminarMesa,
  getEmpleados,
  getPlanoMesas,
  reactivarEmpleado,
  registrarArea,
  registrarEmpleado,
  registrarMesa,
  renombrarArea,
} from "../actions/local-equipo.actions"
import type {
  Area,
  AreaMesa,
  Empleado,
  EmpleadoInput,
  FiltroEstadoEmpleado,
  FiltroRolEmpleado,
  Mesa,
  MesaInput,
  PlanoMesas,
  ResumenPersonal,
  RolOperativo,
} from "../schema"

type Aviso = { tipo: "ok" | "error"; mensaje: string }

// Normaliza texto para búsquedas sin tildes ni mayúsculas
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

// Aviso breve que desaparece solo después de unos segundos
function useAviso() {
  const [aviso, setAviso] = React.useState<Aviso | null>(null)

  React.useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(null), 3500)
    return () => window.clearTimeout(timer)
  }, [aviso])

  const cerrarAviso = React.useCallback(() => setAviso(null), [])
  return { aviso, setAviso, cerrarAviso }
}

/* -------------------------------------------------------------------------- */
/*            RF-11: Gestión de Personal y Asignación de Roles                */
/* -------------------------------------------------------------------------- */

export function usePersonal() {
  const [empleados, setEmpleados] = React.useState<Empleado[] | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  const [busqueda, setBusqueda] = React.useState("")
  const [rol, setRol] = React.useState<FiltroRolEmpleado>("todos")
  const [estado, setEstado] = React.useState<FiltroEstadoEmpleado>("activo")

  const { aviso, setAviso, cerrarAviso } = useAviso()

  React.useEffect(() => {
    let vigente = true

    getEmpleados()
      .then((data) => {
        if (!vigente) return
        setEmpleados(data)
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar la lista de personal.")
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })

    return () => {
      vigente = false
    }
  }, [reloadKey])

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  const reemplazar = React.useCallback((empleado: Empleado) => {
    setEmpleados((prev) => {
      if (!prev) return prev
      const existe = prev.some((e) => e.id === empleado.id)
      return existe ? prev.map((e) => (e.id === empleado.id ? empleado : e)) : [...prev, empleado]
    })
  }, [])

  const empleadosFiltrados = React.useMemo(() => {
    if (!empleados) return []
    const termino = normalizar(busqueda)

    return empleados
      .filter((e) => {
        const coincideRol = rol === "todos" || e.rol === rol
        const coincideEstado = estado === "todos" || e.estado === estado
        const coincideBusqueda =
          !termino ||
          normalizar(`${e.nombres} ${e.apellidos}`).includes(termino) ||
          e.dni.includes(termino) ||
          normalizar(e.correo).includes(termino)
        return coincideRol && coincideEstado && coincideBusqueda
      })
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es"))
  }, [empleados, busqueda, rol, estado])

  const resumen = React.useMemo<ResumenPersonal>(() => {
    const lista = empleados ?? []
    const activos = lista.filter((e) => e.estado === "activo").length
    return { total: lista.length, activos, baja: lista.length - activos }
  }, [empleados])

  // Empleados activos por rol operativo (para la vista de Roles y Permisos)
  const activosPorRol = React.useMemo(() => {
    const mapa = new Map<RolOperativo, number>()
    for (const e of empleados ?? []) {
      if (e.estado === "activo") mapa.set(e.rol, (mapa.get(e.rol) ?? 0) + 1)
    }
    return mapa
  }, [empleados])

  // Registro o actualización; propaga el error para mostrarlo en el formulario
  const guardarEmpleado = React.useCallback(
    async (input: EmpleadoInput, id?: string) => {
      const guardado = id ? await actualizarEmpleado(id, input) : await registrarEmpleado(input)
      reemplazar(guardado)
      setAviso({
        tipo: "ok",
        mensaje: id
          ? `Datos de ${guardado.nombres} ${guardado.apellidos} actualizados.`
          : `${guardado.nombres} ${guardado.apellidos} registrado en el equipo.`,
      })
      return guardado
    },
    [reemplazar, setAviso]
  )

  const darDeBaja = React.useCallback(
    async (empleado: Empleado, motivo: string) => {
      const actualizado = await darDeBajaEmpleado(empleado.id, motivo)
      reemplazar(actualizado)
      setAviso({ tipo: "ok", mensaje: `${empleado.nombres} ${empleado.apellidos} fue dado de baja.` })
    },
    [reemplazar, setAviso]
  )

  const reactivar = React.useCallback(
    async (empleado: Empleado) => {
      try {
        const actualizado = await reactivarEmpleado(empleado.id)
        reemplazar(actualizado)
        setAviso({ tipo: "ok", mensaje: `${empleado.nombres} ${empleado.apellidos} fue reactivado.` })
      } catch (e) {
        setAviso({ tipo: "error", mensaje: e instanceof Error ? e.message : "No se pudo reactivar al empleado." })
      }
    },
    [reemplazar, setAviso]
  )

  const limpiarFiltros = React.useCallback(() => {
    setBusqueda("")
    setRol("todos")
    setEstado("todos")
  }, [])

  return {
    empleados,
    empleadosFiltrados,
    resumen,
    activosPorRol,
    isLoading,
    error,
    recargar,
    busqueda,
    setBusqueda,
    rol,
    setRol,
    estado,
    setEstado,
    limpiarFiltros,
    guardarEmpleado,
    darDeBaja,
    reactivar,
    aviso,
    cerrarAviso,
  }
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Configuración del Plano de Mesas                    */
/* -------------------------------------------------------------------------- */

export function usePlanoMesas() {
  const [plano, setPlano] = React.useState<PlanoMesas | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [areaFiltro, setAreaFiltro] = React.useState<AreaMesa | "todas">("todas")

  const { aviso, setAviso, cerrarAviso } = useAviso()

  React.useEffect(() => {
    let vigente = true

    getPlanoMesas()
      .then((data) => {
        if (!vigente) return
        setPlano(data)
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar el plano de mesas.")
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })

    return () => {
      vigente = false
    }
  }, [reloadKey])

  // Mantiene el plano alineado si cambia desde otra pestaña o terminal (incluido el estado de las mesas)
  React.useEffect(
    () =>
      suscribirseCambiosCatalogo(({ areas, mesas }) => {
        setPlano({ areas: areas.map((a) => ({ ...a })), mesas: mesas.map((m) => ({ ...m })) })
      }),
    []
  )

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  // Si el área filtrada se elimina, se vuelve a mostrar todo el plano
  const areaActiva = areaFiltro !== "todas" && plano?.areas.some((a) => a.id === areaFiltro) ? areaFiltro : "todas"

  const mesasFiltradas = React.useMemo(() => {
    if (!plano) return []
    return plano.mesas
      .filter((m) => areaActiva === "todas" || m.area === areaActiva)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))
  }, [plano, areaActiva])

  const mesasPorArea = React.useMemo(() => {
    const mapa = new Map<AreaMesa, number>()
    for (const m of plano?.mesas ?? []) mapa.set(m.area, (mapa.get(m.area) ?? 0) + 1)
    return mapa
  }, [plano])

  const resumen = React.useMemo(() => {
    const mesas = plano?.mesas ?? []
    return {
      areas: plano?.areas.length ?? 0,
      mesas: mesas.length,
      capacidad: mesas.reduce((acc, m) => acc + m.capacidad, 0),
    }
  }, [plano])

  const guardarMesa = React.useCallback(
    async (input: MesaInput, id?: string) => {
      const guardada = id ? await actualizarMesa(id, input) : await registrarMesa(input)
      setPlano((prev) => {
        if (!prev) return prev
        const existe = prev.mesas.some((m) => m.id === guardada.id)
        return {
          ...prev,
          mesas: existe ? prev.mesas.map((m) => (m.id === guardada.id ? guardada : m)) : [...prev.mesas, guardada],
        }
      })
      setAviso({ tipo: "ok", mensaje: id ? `"${guardada.nombre}" actualizada.` : `"${guardada.nombre}" registrada en el plano.` })
      return guardada
    },
    [setAviso]
  )

  const borrarMesa = React.useCallback(
    async (mesa: Mesa) => {
      try {
        await eliminarMesa(mesa.id)
        setPlano((prev) => (prev ? { ...prev, mesas: prev.mesas.filter((m) => m.id !== mesa.id) } : prev))
        setAviso({ tipo: "ok", mensaje: `"${mesa.nombre}" eliminada del plano.` })
      } catch (e) {
        setAviso({ tipo: "error", mensaje: e instanceof Error ? e.message : "No se pudo eliminar la mesa." })
      }
    },
    [setAviso]
  )

  const guardarArea = React.useCallback(
    async (nombre: string, id?: string) => {
      const guardada = id ? await renombrarArea(id, nombre) : await registrarArea(nombre)
      setPlano((prev) => {
        if (!prev) return prev
        const existe = prev.areas.some((a) => a.id === guardada.id)
        return {
          ...prev,
          areas: existe ? prev.areas.map((a) => (a.id === guardada.id ? guardada : a)) : [...prev.areas, guardada],
        }
      })
      setAviso({ tipo: "ok", mensaje: id ? `Área renombrada a "${guardada.nombre}".` : `Área "${guardada.nombre}" creada.` })
      return guardada
    },
    [setAviso]
  )

  const borrarArea = React.useCallback(
    async (area: Area) => {
      await eliminarArea(area.id)
      setPlano((prev) => (prev ? { ...prev, areas: prev.areas.filter((a) => a.id !== area.id) } : prev))
      setAviso({ tipo: "ok", mensaje: `Área "${area.nombre}" eliminada.` })
    },
    [setAviso]
  )

  return {
    plano,
    mesasFiltradas,
    mesasPorArea,
    resumen,
    isLoading,
    error,
    recargar,
    areaFiltro: areaActiva,
    setAreaFiltro,
    guardarMesa,
    borrarMesa,
    guardarArea,
    borrarArea,
    aviso,
    cerrarAviso,
  }
}
