"use client"

import * as React from "react"
import { useEntityList } from "@/shared/hooks"
import { toast } from "@/shared/components/ui/toast"
import { normalizarTexto } from "@/shared/utils/formatters"
import { suscribirseCambiosCatalogo } from "@/modules/pos/actions/pos.actions"
import {
  getEmpleados,
  getPlanoMesas,
  getRoles,
  reactivarEmpleado,
  registrarArea,
  renombrarArea,
} from "../actions/local-equipo.actions"
import type {
  Area,
  AreaMesa,
  Empleado,
  EstadoEmpleado,
  FiltroEstadoEmpleado,
  FiltroRolEmpleado,
  Mesa,
  PlanoMesas,
  Rol,
} from "../schema"

/* -------------------------------------------------------------------------- */
/*                         Datos compartidos del equipo                       */
/* -------------------------------------------------------------------------- */

// Roles y usuarios se cargan con el hook genérico de shared (DataQuery)
function useEquipo() {
  const roles = useEntityList<Rol>(getRoles)
  const empleados = useEntityList<Empleado>(getEmpleados)
  const { fetchEntities: cargarRoles } = roles
  const { fetchEntities: cargarEmpleados } = empleados
  // Indica si ya terminó la primera carga (las recargas posteriores no muestran el esqueleto)
  const [cargado, setCargado] = React.useState(false)

  React.useEffect(() => {
    Promise.all([cargarRoles(), cargarEmpleados()]).finally(() => setCargado(true))
  }, [cargarRoles, cargarEmpleados])

  const recargar = React.useCallback(() => {
    void Promise.all([cargarRoles(), cargarEmpleados()])
  }, [cargarRoles, cargarEmpleados])

  const rolesPorId = React.useMemo(() => new Map(roles.entities.map((r) => [r.id, r])), [roles.entities])

  const error =
    roles.hasError || empleados.hasError
      ? (roles.errorMessage ?? empleados.errorMessage ?? "No se pudo cargar la información del equipo.")
      : null

  return {
    roles: roles.entities,
    empleados: empleados.entities,
    rolesPorId,
    cargado,
    error,
    recargar,
    cargarRoles,
    cargarEmpleados,
  }
}

/* -------------------------------------------------------------------------- */
/*                      Roles operativos y sus permisos                       */
/* -------------------------------------------------------------------------- */

export function useRoles() {
  const equipo = useEquipo()
  const { cargarRoles } = equipo

  // Empleados vigentes (no dados de baja) por rol
  const empleadosPorRol = React.useMemo(() => {
    const mapa = new Map<string, number>()
    for (const e of equipo.empleados) {
      if (e.idRol && e.estado !== "inactivo") mapa.set(e.idRol, (mapa.get(e.idRol) ?? 0) + 1)
    }
    return mapa
  }, [equipo.empleados])

  const rolGuardado = React.useCallback(
    (nombre: string, esNuevo: boolean) => {
      toast.add({ type: "success", title: esNuevo ? `Rol "${nombre}" creado.` : `Permisos de "${nombre}" actualizados.` })
      void cargarRoles()
    },
    [cargarRoles]
  )

  const rolEliminado = React.useCallback(
    (rol: Rol) => {
      toast.add({ type: "success", title: `Rol "${rol.nombre}" eliminado.` })
      void cargarRoles()
    },
    [cargarRoles]
  )

  return {
    roles: equipo.roles,
    empleadosPorRol,
    cargado: equipo.cargado,
    error: equipo.error,
    recargar: equipo.recargar,
    rolGuardado,
    rolEliminado,
  }
}

/* -------------------------------------------------------------------------- */
/*            RF-11: Gestión de Personal y Asignación de Roles                */
/* -------------------------------------------------------------------------- */

export function usePersonal() {
  const equipo = useEquipo()
  const { cargarEmpleados, rolesPorId } = equipo

  const [busqueda, setBusqueda] = React.useState("")
  const [rol, setRol] = React.useState<FiltroRolEmpleado>("todos")
  const [estado, setEstado] = React.useState<FiltroEstadoEmpleado>("todos")

  const empleadosFiltrados = React.useMemo(() => {
    const termino = normalizarTexto(busqueda)

    return equipo.empleados
      .filter((e) => {
        const coincideRol = rol === "todos" || e.idRol === rol
        const coincideEstado = estado === "todos" || e.estado === estado
        const nombreRol = e.idRol ? (rolesPorId.get(e.idRol)?.nombre ?? "") : ""
        const coincideBusqueda =
          !termino ||
          normalizarTexto(e.nombre).includes(termino) ||
          normalizarTexto(e.email).includes(termino) ||
          normalizarTexto(nombreRol).includes(termino)
        return coincideRol && coincideEstado && coincideBusqueda
      })
      .sort((a, b) => {
        // El Dueño primero; luego los de baja al final y orden alfabético
        if (a.tipoCuenta !== b.tipoCuenta) return a.tipoCuenta === "OWNER" ? -1 : 1
        if ((a.estado === "inactivo") !== (b.estado === "inactivo")) return a.estado === "inactivo" ? 1 : -1
        return a.nombre.localeCompare(b.nombre, "es")
      })
  }, [equipo.empleados, rolesPorId, busqueda, rol, estado])

  const conteoPorEstado = React.useMemo(() => {
    const mapa = new Map<EstadoEmpleado, number>()
    for (const e of equipo.empleados) mapa.set(e.estado, (mapa.get(e.estado) ?? 0) + 1)
    return mapa
  }, [equipo.empleados])

  // Se invoca desde EmpleadoForm (useEntityForm de shared) tras guardar con éxito
  const empleadoGuardado = React.useCallback(
    (nombre: string, esNuevo: boolean) => {
      toast.add({
        type: "success",
        title: esNuevo ? `${nombre} registrado. Su cuenta queda pendiente de activación.` : `Datos de ${nombre} actualizados.`,
      })
      void cargarEmpleados()
    },
    [cargarEmpleados]
  )

  // Se invoca desde BajaEmpleadoForm (useEntityDelete de shared) tras la baja
  const empleadoDadoDeBaja = React.useCallback(
    (empleado: Empleado) => {
      toast.add({ type: "success", title: `${empleado.nombre} fue dado de baja.` })
      void cargarEmpleados()
    },
    [cargarEmpleados]
  )

  const reactivar = React.useCallback(
    async (empleado: Empleado) => {
      const respuesta = await reactivarEmpleado(empleado.id)
      if (respuesta.isOk()) {
        toast.add({ type: "success", title: `${empleado.nombre} fue reactivado.` })
        await cargarEmpleados()
      } else {
        toast.add({ type: "error", title: "No se pudo reactivar al empleado.", description: respuesta.getMessage() })
      }
    },
    [cargarEmpleados]
  )

  const limpiarFiltros = React.useCallback(() => {
    setBusqueda("")
    setRol("todos")
    setEstado("todos")
  }, [])

  return {
    roles: equipo.roles,
    rolesPorId,
    empleados: equipo.empleados,
    empleadosFiltrados,
    conteoPorEstado,
    cargado: equipo.cargado,
    error: equipo.error,
    recargar: equipo.recargar,
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

  const resumen = React.useMemo(
    () => ({
      mesas: mesasFiltradas.length,
      capacidad: mesasFiltradas.reduce((acc, m) => acc + m.capacidad, 0),
    }),
    [mesasFiltradas]
  )

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
