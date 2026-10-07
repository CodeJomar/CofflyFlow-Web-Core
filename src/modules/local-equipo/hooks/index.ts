"use client"

import * as React from "react"
import { useEntityList } from "@/shared/hooks"
import { toast } from "@/shared/components/ui/toast"
import { normalizarTexto } from "@/shared/utils/formatters"
import { suscribirseCambiosCatalogo } from "@/modules/pos/actions/pos.actions"
import {
  getEmpleados,
  getPlanoMesas,
  reactivarEmpleado,
  registrarArea,
  renombrarArea,
} from "../actions/local-equipo.actions"
import type {
  Area,
  AreaMesa,
  Empleado,
  FiltroEstadoEmpleado,
  FiltroRolEmpleado,
  Mesa,
  PlanoMesas,
  ResumenPersonal,
  RolOperativo,
} from "../schema"

const nombreCompleto = (e: Pick<Empleado, "nombres" | "apellidos">) => `${e.nombres} ${e.apellidos}`

/* -------------------------------------------------------------------------- */
/*            RF-11: Gestión de Personal y Asignación de Roles                */
/* -------------------------------------------------------------------------- */

export function usePersonal() {
  // Listado con el hook genérico de shared (DataQuery)
  const { entities: empleados, isLoading, hasError, errorMessage, fetchEntities } = useEntityList<Empleado>(getEmpleados)
  // Indica si ya terminó la primera carga (las recargas posteriores no muestran el esqueleto)
  const [cargado, setCargado] = React.useState(false)

  const [busqueda, setBusqueda] = React.useState("")
  const [rol, setRol] = React.useState<FiltroRolEmpleado>("todos")
  const [estado, setEstado] = React.useState<FiltroEstadoEmpleado>("activo")

  React.useEffect(() => {
    fetchEntities().finally(() => setCargado(true))
  }, [fetchEntities])

  const recargar = React.useCallback(() => {
    void fetchEntities()
  }, [fetchEntities])

  const empleadosFiltrados = React.useMemo(() => {
    const termino = normalizarTexto(busqueda)

    return empleados
      .filter((e) => {
        const coincideRol = rol === "todos" || e.rol === rol
        const coincideEstado = estado === "todos" || e.estado === estado
        const coincideBusqueda =
          !termino ||
          normalizarTexto(nombreCompleto(e)).includes(termino) ||
          e.dni.includes(termino) ||
          normalizarTexto(e.correo).includes(termino)
        return coincideRol && coincideEstado && coincideBusqueda
      })
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es"))
  }, [empleados, busqueda, rol, estado])

  const resumen = React.useMemo<ResumenPersonal>(() => {
    const activos = empleados.filter((e) => e.estado === "activo").length
    return { total: empleados.length, activos, baja: empleados.length - activos }
  }, [empleados])

  // Empleados activos por rol operativo (para la vista de Roles y Permisos)
  const activosPorRol = React.useMemo(() => {
    const mapa = new Map<RolOperativo, number>()
    for (const e of empleados) {
      if (e.estado === "activo") mapa.set(e.rol, (mapa.get(e.rol) ?? 0) + 1)
    }
    return mapa
  }, [empleados])

  // Se invoca desde EmpleadoForm (useEntityForm de shared) tras guardar con éxito
  const empleadoGuardado = React.useCallback(
    (empleado: Pick<Empleado, "nombres" | "apellidos">, esNuevo: boolean) => {
      toast.add({
        type: "success",
        title: esNuevo
          ? `${nombreCompleto(empleado)} registrado en el equipo.`
          : `Datos de ${nombreCompleto(empleado)} actualizados.`,
      })
      void fetchEntities()
    },
    [fetchEntities]
  )

  // Se invoca desde BajaEmpleadoForm (useEntityDelete de shared) tras la baja
  const empleadoDadoDeBaja = React.useCallback(
    (empleado: Empleado) => {
      toast.add({ type: "success", title: `${nombreCompleto(empleado)} fue dado de baja.` })
      void fetchEntities()
    },
    [fetchEntities]
  )

  const reactivar = React.useCallback(
    async (empleado: Empleado) => {
      const respuesta = await reactivarEmpleado(empleado.id)
      if (respuesta.isOk()) {
        toast.add({ type: "success", title: `${nombreCompleto(empleado)} fue reactivado.` })
        await fetchEntities()
      } else {
        toast.add({ type: "error", title: "No se pudo reactivar al empleado.", description: respuesta.getMessage() })
      }
    },
    [fetchEntities]
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
    cargado,
    isLoading,
    error: hasError ? (errorMessage ?? "No se pudo cargar la lista de personal.") : null,
    recargar,
    busqueda,
    setBusqueda,
    rol,
    setRol,
    estado,
    setEstado,
    limpiarFiltros,
    empleadoGuardado,
    empleadoDadoDeBaja,
    reactivar,
  }
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Configuración del Plano de Mesas                    */
/* -------------------------------------------------------------------------- */

// El plano mantiene estado propio porque se sincroniza en vivo con los terminales POS
export function usePlanoMesas() {
  const [plano, setPlano] = React.useState<PlanoMesas | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [areaFiltro, setAreaFiltro] = React.useState<AreaMesa | "todas">("todas")

  React.useEffect(() => {
    let vigente = true

    getPlanoMesas()
      .then((respuesta) => {
        if (!vigente) return
        if (respuesta.isOk()) {
          setPlano(respuesta.data)
          setError(null)
        } else {
          setError(respuesta.getMessage())
        }
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

  // Se invoca desde MesaForm (useEntityForm de shared) tras guardar con éxito
  const mesaGuardada = React.useCallback((mesa: Mesa, esNueva: boolean) => {
    setPlano((prev) => {
      if (!prev) return prev
      const existe = prev.mesas.some((m) => m.id === mesa.id)
      return {
        ...prev,
        mesas: existe ? prev.mesas.map((m) => (m.id === mesa.id ? mesa : m)) : [...prev.mesas, mesa],
      }
    })
    toast.add({ type: "success", title: esNueva ? `"${mesa.nombre}" registrada en el plano.` : `"${mesa.nombre}" actualizada.` })
  }, [])

  // Se invoca desde la vista (useEntityDelete de shared) tras eliminar con éxito
  const mesaEliminada = React.useCallback((mesa: Mesa) => {
    setPlano((prev) => (prev ? { ...prev, mesas: prev.mesas.filter((m) => m.id !== mesa.id) } : prev))
    toast.add({ type: "success", title: `"${mesa.nombre}" eliminada del plano.` })
  }, [])

  // Alta o renombrado de área; devuelve la respuesta para mostrar el error en el formulario
  const guardarArea = React.useCallback(async (nombre: string, id?: string) => {
    const respuesta = id ? await renombrarArea(id, nombre) : await registrarArea(nombre)
    if (respuesta.isOk()) {
      const guardada = respuesta.data
      setPlano((prev) => {
        if (!prev) return prev
        const existe = prev.areas.some((a) => a.id === guardada.id)
        return {
          ...prev,
          areas: existe ? prev.areas.map((a) => (a.id === guardada.id ? guardada : a)) : [...prev.areas, guardada],
        }
      })
      toast.add({ type: "success", title: id ? `Área renombrada a "${guardada.nombre}".` : `Área "${guardada.nombre}" creada.` })
    }
    return respuesta
  }, [])

  // Se invoca desde AreasForm (useEntityDelete de shared) tras eliminar con éxito
  const areaEliminada = React.useCallback((area: Area) => {
    setPlano((prev) => (prev ? { ...prev, areas: prev.areas.filter((a) => a.id !== area.id) } : prev))
    toast.add({ type: "success", title: `Área "${area.nombre}" eliminada.` })
  }, [])

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
    mesaGuardada,
    mesaEliminada,
    guardarArea,
    areaEliminada,
  }
}
