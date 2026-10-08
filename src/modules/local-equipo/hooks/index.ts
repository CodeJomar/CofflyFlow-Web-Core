"use client"

import * as React from "react"

import type { BaseResponse } from "@/dtos/core/baseResponse.dto"
import { normalizarTexto } from "@/shared/utils/formatters"
import { toastResponse } from "@/shared/utils/toast-response"

import {
  actualizarEmpleado,
  actualizarMesa,
  actualizarRol,
  crearEmpleado,
  crearMesa,
  crearRol,
  darDeBajaEmpleado,
  eliminarMesa,
  eliminarRol,
  getCargos,
  getCatalogoPermisos,
  getEmpleados,
  getMesas,
  getRol,
  getRoles,
  reemplazarPermisosRol,
  reenviarActivacion,
} from "../actions/local-equipo.actions"
import {
  FILTRO_TODAS_LAS_AREAS,
  areaDeMesa,
  areasDeMesas,
  permisoDesdeClave,
  type Cargo,
  type Empleado,
  type EmpleadoFormValues,
  type EstadoEmpleado,
  type FiltroEstadoEmpleado,
  type FiltroRolEmpleado,
  type Mesa,
  type MesaFormValues,
  type ModuloCatalogo,
  type Rol,
  type RolDetalle,
  type RolFormValues,
} from "../schema"

// La API entrega como máximo 100 empleados por página: se leen todas las páginas
async function getTodosLosEmpleados(): Promise<{ empleados: Empleado[]; error: string | null }> {
  const primera = await getEmpleados(1)
  if (!primera.isOk()) return { empleados: [], error: primera.getMessage() }
  const empleados = [...primera.data]
  for (let pagina = 2; pagina <= primera.meta.total_paginas; pagina++) {
    const siguiente = await getEmpleados(pagina)
    if (!siguiente.isOk()) return { empleados, error: siguiente.getMessage() }
    empleados.push(...siguiente.data)
  }
  return { empleados, error: null }
}

/* -------------------------------------------------------------------------- */
/*                 Gestión de personal y asignación de cargos                 */
/* -------------------------------------------------------------------------- */

export function usePersonal() {
  const [empleados, setEmpleados] = React.useState<Empleado[]>([])
  const [cargos, setCargos] = React.useState<Cargo[]>([])
  const [cargado, setCargado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  const [busqueda, setBusqueda] = React.useState("")
  const [rol, setRol] = React.useState<FiltroRolEmpleado>("todos")
  const [estado, setEstado] = React.useState<FiltroEstadoEmpleado>("todos")

  React.useEffect(() => {
    let vigente = true

    Promise.all([getTodosLosEmpleados(), getCargos()])
      .then(([lista, respuestaCargos]) => {
        if (!vigente) return
        if (lista.error) {
          setError(lista.error)
          return
        }
        setEmpleados(lista.empleados)
        setCargos(respuestaCargos.isOk() ? (respuestaCargos.data ?? []) : [])
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar la información del equipo.")
      })
      .finally(() => {
        if (vigente) setCargado(true)
      })

    return () => {
      vigente = false
    }
  }, [reloadKey])

  const recargar = React.useCallback(() => {
    setCargado(false)
    setReloadKey((k) => k + 1)
  }, [])

  const refrescar = React.useCallback(() => setReloadKey((k) => k + 1), [])

  const empleadosFiltrados = React.useMemo(() => {
    const termino = normalizarTexto(busqueda)

    return empleados
      .filter((e) => {
        const coincideRol = rol === "todos" || e.id_rol === rol
        const coincideEstado = estado === "todos" || e.estado === estado
        const coincideBusqueda =
          !termino ||
          normalizarTexto(e.nombre).includes(termino) ||
          normalizarTexto(e.email).includes(termino) ||
          normalizarTexto(e.rol_nombre ?? "").includes(termino)
        return coincideRol && coincideEstado && coincideBusqueda
      })
      .sort((a, b) => {
        // El Dueño primero; luego los de baja al final y orden alfabético
        if (a.tipo_cuenta !== b.tipo_cuenta) return a.tipo_cuenta === "OWNER" ? -1 : 1
        if ((a.estado === "inactivo") !== (b.estado === "inactivo")) return a.estado === "inactivo" ? 1 : -1
        return a.nombre.localeCompare(b.nombre, "es")
      })
  }, [empleados, busqueda, rol, estado])

  const conteoPorEstado = React.useMemo(() => {
    const mapa = new Map<EstadoEmpleado, number>()
    for (const e of empleados) mapa.set(e.estado, (mapa.get(e.estado) ?? 0) + 1)
    return mapa
  }, [empleados])

  /** Registra un empleado (la API le envía el correo de activación) o actualiza sus datos y su cargo. */
  const guardarEmpleado = React.useCallback(
    async (values: EmpleadoFormValues, empleado?: Empleado): Promise<boolean> => {
      const base = { nombre: values.nombre.trim(), email: values.email, id_rol: values.idRol }
      const respuesta = await toastResponse(
        empleado ? actualizarEmpleado(empleado.id_usuario, base) : crearEmpleado(base),
        {
          loading: empleado ? "Guardando los cambios…" : "Registrando al empleado…",
          success: empleado
            ? `Datos de ${base.nombre} actualizados`
            : `${base.nombre} registrado`,
          successDescription: empleado ? undefined : "Su cuenta queda pendiente de activación por correo.",
          error: empleado ? "No se pudo guardar el empleado" : "No se pudo registrar al empleado",
        },
      )
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  /** Cambia el estado de la cuenta: reactivar, suspender o volver a activar tras una baja. */
  const cambiarEstado = React.useCallback(
    async (empleado: Empleado, nuevo: "activo" | "suspendido"): Promise<boolean> => {
      const respuesta = await toastResponse(actualizarEmpleado(empleado.id_usuario, { estado: nuevo }), {
        loading: nuevo === "activo" ? "Reactivando…" : "Suspendiendo…",
        success: nuevo === "activo" ? `${empleado.nombre} fue reactivado` : `${empleado.nombre} fue suspendido`,
        error: "No se pudo cambiar el estado",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  const darDeBaja = React.useCallback(
    async (empleado: Empleado): Promise<boolean> => {
      const respuesta = await toastResponse(darDeBajaEmpleado(empleado.id_usuario), {
        loading: "Dando de baja…",
        success: `${empleado.nombre} fue dado de baja`,
        error: "No se pudo dar de baja al empleado",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  const reenviar = React.useCallback(async (empleado: Empleado): Promise<boolean> => {
    const respuesta = await toastResponse(reenviarActivacion(empleado.id_usuario), {
      loading: "Enviando el correo de activación…",
      success: `Correo de activación enviado a ${empleado.email}`,
      error: "No se pudo enviar el correo",
    })
    return respuesta.isOk()
  }, [])

  const limpiarFiltros = React.useCallback(() => {
    setBusqueda("")
    setRol("todos")
    setEstado("todos")
  }, [])

  return {
    cargos,
    empleados,
    empleadosFiltrados,
    conteoPorEstado,
    cargado,
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
    cambiarEstado,
    darDeBaja,
    reenviar,
  }
}

/* -------------------------------------------------------------------------- */
/*                       Cargos (roles) y sus permisos                        */
/* -------------------------------------------------------------------------- */

export function useRoles() {
  const [roles, setRoles] = React.useState<Rol[]>([])
  const [catalogo, setCatalogo] = React.useState<ModuloCatalogo[]>([])
  const [cargado, setCargado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    let vigente = true

    Promise.all([getRoles(), getCatalogoPermisos()])
      .then(([respuestaRoles, respuestaCatalogo]) => {
        if (!vigente) return
        if (!respuestaRoles.isOk()) {
          setError(respuestaRoles.getMessage())
          return
        }
        setRoles(respuestaRoles.data ?? [])
        setCatalogo(respuestaCatalogo.isOk() ? (respuestaCatalogo.data ?? []) : [])
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudieron cargar los roles.")
      })
      .finally(() => {
        if (vigente) setCargado(true)
      })

    return () => {
      vigente = false
    }
  }, [reloadKey])

  const recargar = React.useCallback(() => {
    setCargado(false)
    setReloadKey((k) => k + 1)
  }, [])

  const refrescar = React.useCallback(() => setReloadKey((k) => k + 1), [])

  /** Lee el rol con sus permisos para editarlo; devuelve null (y avisa con un toast) si no se pudo. */
  const cargarDetalle = React.useCallback(async (id: string): Promise<RolDetalle | null> => {
    const respuesta = await toastResponse(getRol(id), {
      loading: "Cargando el rol…",
      success: "Rol cargado",
      error: "No se pudo cargar el rol",
    })
    return respuesta.isOk() ? respuesta.data : null
  }, [])

  /** Crea el rol con sus permisos o actualiza nombre, descripción y permisos de uno existente. */
  const guardarRol = React.useCallback(
    async (values: RolFormValues, rol?: RolDetalle): Promise<boolean> => {
      const nombre = values.nombre.trim()
      const permisos = values.permisos.map(permisoDesdeClave)

      const operacion = (async (): Promise<BaseResponse> => {
        if (!rol) return crearRol({ nombre, descripcion: values.descripcion.trim() || undefined, permisos })
        const datos = await actualizarRol(rol.id_rol, { nombre, descripcion: values.descripcion.trim() })
        if (!datos.isOk()) return datos
        return reemplazarPermisosRol(rol.id_rol, { permisos })
      })()

      const respuesta = await toastResponse(operacion, {
        loading: rol ? "Guardando el rol…" : "Creando el rol…",
        success: rol ? `Permisos de "${nombre}" actualizados` : `Rol "${nombre}" creado`,
        error: rol ? "No se pudo guardar el rol" : "No se pudo crear el rol",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  const quitarRol = React.useCallback(
    async (rol: RolDetalle): Promise<boolean> => {
      const respuesta = await toastResponse(eliminarRol(rol.id_rol), {
        loading: "Eliminando el rol…",
        success: `Rol "${rol.nombre}" eliminado`,
        error: "No se pudo eliminar el rol",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  return { roles, catalogo, cargado, error, recargar, cargarDetalle, guardarRol, quitarRol }
}

/* -------------------------------------------------------------------------- */
/*                    Configuración del plano de mesas                        */
/* -------------------------------------------------------------------------- */

const REFRESCO_MESAS_MS = 30_000

export function usePlanoMesas() {
  const [mesas, setMesas] = React.useState<Mesa[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [areaFiltro, setAreaFiltro] = React.useState<string>(FILTRO_TODAS_LAS_AREAS)

  React.useEffect(() => {
    let vigente = true

    getMesas()
      .then((respuesta) => {
        if (!vigente) return
        if (respuesta.isOk()) {
          setMesas(respuesta.data ?? [])
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

  // El estado de las mesas lo mueve la operación (POS): se mantiene al día sin tocar nada
  React.useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") setReloadKey((k) => k + 1)
    }
    const timer = window.setInterval(refrescar, REFRESCO_MESAS_MS)
    document.addEventListener("visibilitychange", refrescar)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refrescar)
    }
  }, [])

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  const refrescar = React.useCallback(() => setReloadKey((k) => k + 1), [])

  // Las áreas salen de las mesas (texto libre que administra el propietario)
  const areas = React.useMemo(() => areasDeMesas(mesas), [mesas])

  // Si el área filtrada ya no existe (se quedó sin mesas), se vuelve a mostrar todo el plano
  const areaActiva = areaFiltro !== FILTRO_TODAS_LAS_AREAS && areas.includes(areaFiltro) ? areaFiltro : FILTRO_TODAS_LAS_AREAS

  const mesasFiltradas = React.useMemo(
    () =>
      mesas
        .filter((m) => areaActiva === FILTRO_TODAS_LAS_AREAS || areaDeMesa(m) === areaActiva)
        .sort((a, b) => a.numero.localeCompare(b.numero, "es", { numeric: true })),
    [mesas, areaActiva],
  )

  const mesasPorArea = React.useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of mesas) mapa.set(areaDeMesa(m), (mapa.get(areaDeMesa(m)) ?? 0) + 1)
    return mapa
  }, [mesas])

  const resumen = React.useMemo(
    () => ({
      mesas: mesasFiltradas.length,
      capacidad: mesasFiltradas.reduce((acc, m) => acc + m.capacidad, 0),
    }),
    [mesasFiltradas],
  )

  const guardarMesa = React.useCallback(
    async (values: MesaFormValues, mesa?: Mesa): Promise<boolean> => {
      const base = { numero: values.numero.trim(), area: values.area.trim(), capacidad: Number(values.capacidad) }
      const respuesta = await toastResponse(mesa ? actualizarMesa(mesa.id_mesa, base) : crearMesa(base), {
        loading: mesa ? "Guardando la mesa…" : "Registrando la mesa…",
        success: mesa ? `"${base.numero}" actualizada` : `"${base.numero}" registrada en el plano`,
        error: mesa ? "No se pudo guardar la mesa" : "No se pudo registrar la mesa",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  const quitarMesa = React.useCallback(
    async (mesa: Mesa): Promise<boolean> => {
      const respuesta = await toastResponse(eliminarMesa(mesa.id_mesa), {
        loading: "Eliminando la mesa…",
        success: `"${mesa.numero}" eliminada del plano`,
        error: "No se pudo eliminar la mesa",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  return {
    mesas,
    areas,
    mesasFiltradas,
    mesasPorArea,
    resumen,
    isLoading,
    error,
    recargar,
    areaFiltro: areaActiva,
    setAreaFiltro,
    guardarMesa,
    quitarMesa,
  }
}
