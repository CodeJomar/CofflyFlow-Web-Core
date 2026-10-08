"use client"

import * as React from "react"
import {
  avanzarEstadoComanda,
  getComandasKds,
  retrocederEstadoComanda,
} from "../actions/kds.actions"
import type {
  ComandaKds,
  EstadoComanda,
  FiltroEstadoKds,
} from "../schema"

/* -------------------------------------------------------------------------- */
/*                            Hook principal del KDS                           */
/* -------------------------------------------------------------------------- */

export function useComandasKds() {
  const [comandas, setComandas] = React.useState<ComandaKds[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [filtro, setFiltro] = React.useState<FiltroEstadoKds>("todas")

  React.useEffect(() => {
    let vigente = true

    getComandasKds()
      .then((data) => {
        if (!vigente) return
        setComandas(data)
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudieron cargar las comandas.")
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

  const comandasFiltradas = React.useMemo(() => {
    if (filtro === "todas") return comandas
    return comandas.filter((c) => c.estado === filtro)
  }, [comandas, filtro])

  // Contadores por estado para los badges del filtro
  const contadores = React.useMemo(() => {
    const map: Record<FiltroEstadoKds, number> = {
      todas: comandas.length,
      pendiente: 0,
      en_preparacion: 0,
      lista: 0,
      entregada: 0,
    }
    for (const c of comandas) {
      map[c.estado]++
    }
    return map
  }, [comandas])

  const avanzar = React.useCallback(async (comandaId: string) => {
    try {
      const { nuevoEstado } = await avanzarEstadoComanda(comandaId)
      setComandas((prev) =>
        prev.map((c) => (c.id === comandaId ? { ...c, estado: nuevoEstado } : c))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al avanzar el estado.")
    }
  }, [])

  const retroceder = React.useCallback(async (comandaId: string) => {
    try {
      const { nuevoEstado } = await retrocederEstadoComanda(comandaId)
      setComandas((prev) =>
        prev.map((c) => (c.id === comandaId ? { ...c, estado: nuevoEstado } : c))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al retroceder el estado.")
    }
  }, [])

  return {
    comandas: comandasFiltradas,
    allComandas: comandas,
    isLoading,
    error,
    recargar,
    filtro,
    setFiltro,
    contadores,
    avanzar,
    retroceder,
  }
}
