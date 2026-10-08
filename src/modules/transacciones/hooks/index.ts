"use client"

import * as React from "react"

import type { AperturaTurnoPayload, CierreTurnoPayload, MovimientoCajaPayload, MovimientoHistorialDto, TurnoActualDto } from "@/dtos/caja"
import type { ComprobanteDto, PedidoListadoDto } from "@/dtos/pedidos"
import { toastResponse } from "@/shared/utils/toast-response"
import { rangoUltimosDias } from "@/shared/utils/fechas"
import { aCentimos } from "@/shared/utils/dinero"

import {
  abrirTurno,
  anularPedido,
  cerrarTurno,
  getComprobante,
  getHistorialCaja,
  getPedidos,
  getTurnoActual,
  registrarMovimiento,
} from "../actions/transacciones.actions"
import {
  DIAS_PERIODO_PEDIDOS,
  LIMITE_PEDIDOS,
  REFRESCO_CAJA_MS,
  agruparTurnosArchivados,
  codigoPedido,
  grupoDePedido,
  resumirTurno,
  type FiltroGrupoPedido,
  type PeriodoPedidos,
} from "../schema"

// Normaliza texto para búsquedas sin tildes ni mayúsculas
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/* -------------------------------------------------------------------------- */
/*                     Turno de caja (apertura, movimientos, cierre)          */
/* -------------------------------------------------------------------------- */

export function useTurnoCaja() {
  const [actual, setActual] = React.useState<TurnoActualDto | null>(null)
  const [historial, setHistorial] = React.useState<MovimientoHistorialDto[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    let vigente = true
    Promise.all([getTurnoActual(), getHistorialCaja()])
      .then(([turno, movimientos]) => {
        if (!vigente) return
        // 404 = caja cerrada: es un estado normal, no un error
        if (turno.isOk()) setActual(turno.data ?? null)
        else if (turno.httpStatusCode === 404) setActual(null)
        else {
          setError(turno.getMessage())
          return
        }
        setHistorial(movimientos.isOk() ? (movimientos.data ?? []) : [])
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar la información de caja.")
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })
    return () => {
      vigente = false
    }
  }, [reloadKey])

  // La caja se actualiza sola mientras la pestaña está visible (cobros hechos desde el POS, por ejemplo)
  React.useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") setReloadKey((k) => k + 1)
    }
    const timer = window.setInterval(refrescar, REFRESCO_CAJA_MS)
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

  const idTurno = actual?.turno.id_turno_caja ?? null
  const resumen = React.useMemo(() => (actual ? resumirTurno(actual) : null), [actual])
  const movimientos = React.useMemo(
    () =>
      historial
        .filter((m) => m.id_turno_caja === idTurno)
        .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion)),
    [historial, idTurno],
  )
  const archivados = React.useMemo(() => agruparTurnosArchivados(historial, idTurno), [historial, idTurno])

  const abrir = React.useCallback(
    async (payload: AperturaTurnoPayload) => {
      const respuesta = await toastResponse(abrirTurno(payload), {
        loading: "Abriendo la caja…",
        success: "Caja abierta",
        error: "No se pudo abrir la caja",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta
    },
    [refrescar],
  )

  const registrar = React.useCallback(
    async (payload: MovimientoCajaPayload) => {
      const respuesta = await toastResponse(registrarMovimiento(payload), {
        loading: "Registrando el movimiento…",
        success: "Movimiento registrado",
        error: "No se pudo registrar el movimiento",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta
    },
    [refrescar],
  )

  const cerrar = React.useCallback(
    async (payload: CierreTurnoPayload) => {
      if (!idTurno) return null
      const respuesta = await toastResponse(cerrarTurno(idTurno, payload), {
        loading: "Cerrando la caja…",
        success: (r) => (r.data?.estado === "descuadre" ? "Caja cerrada con descuadre" : "Caja cerrada"),
        error: "No se pudo cerrar la caja",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta
    },
    [idTurno, refrescar],
  )

  return { actual, resumen, movimientos, archivados, isLoading, error, recargar, refrescar, abrir, registrar, cerrar }
}

/* -------------------------------------------------------------------------- */
/*                        Historial de pedidos y comprobantes                 */
/* -------------------------------------------------------------------------- */

export function useHistorialPedidos() {
  const [pedidos, setPedidos] = React.useState<PedidoListadoDto[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [periodo, setPeriodoState] = React.useState<PeriodoPedidos>("hoy")
  const [busqueda, setBusqueda] = React.useState("")
  const [grupo, setGrupo] = React.useState<FiltroGrupoPedido>("todos")

  React.useEffect(() => {
    let vigente = true
    const dias = DIAS_PERIODO_PEDIDOS[periodo]
    getPedidos({ limite: LIMITE_PEDIDOS, ...(dias > 1 ? rangoUltimosDias(dias) : {}) })
      .then((respuesta) => {
        if (!vigente) return
        if (respuesta.isOk()) {
          setPedidos(respuesta.data)
          setError(null)
        } else {
          setError(respuesta.getMessage())
        }
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar el historial de pedidos.")
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })
    return () => {
      vigente = false
    }
  }, [periodo, reloadKey])

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  const setPeriodo = React.useCallback((nuevo: PeriodoPedidos) => {
    setIsLoading(true)
    setPeriodoState(nuevo)
  }, [])

  const pedidosFiltrados = React.useMemo(() => {
    const termino = normalizar(busqueda)
    return pedidos.filter((p) => {
      const coincideGrupo = grupo === "todos" || grupoDePedido(p.estado) === grupo
      const coincideBusqueda =
        !termino || [codigoPedido(p.id_pedido), p.mesa_numero ?? "para llevar", p.estado, p.estado_pago].some((campo) => normalizar(campo).includes(termino))
      return coincideGrupo && coincideBusqueda
    })
  }, [pedidos, busqueda, grupo])

  const conteo = React.useMemo(() => {
    const base = { activo: 0, pagado: 0, anulado: 0 }
    for (const p of pedidos) base[grupoDePedido(p.estado)] += 1
    return base
  }, [pedidos])

  const cobradoCentimos = React.useMemo(() => pedidos.reduce((acc, p) => acc + aCentimos(p.total_pagado), 0), [pedidos])
  const porCobrarCentimos = React.useMemo(
    () => pedidos.filter((p) => p.estado !== "anulado").reduce((acc, p) => acc + aCentimos(p.saldo_pendiente), 0),
    [pedidos],
  )

  return {
    pedidos,
    pedidosFiltrados,
    conteo,
    cobradoCentimos,
    porCobrarCentimos,
    periodo,
    setPeriodo,
    busqueda,
    setBusqueda,
    grupo,
    setGrupo,
    isLoading,
    error,
    recargar,
  }
}

/** Comprobante de un pedido (con sus pagos y devoluciones), que se abre en un modal. */
export function useComprobante() {
  const [comprobante, setComprobante] = React.useState<(ComprobanteDto & { id_pedido: string }) | null>(null)

  const consultar = React.useCallback(async (idPedido: string) => {
    const respuesta = await toastResponse(getComprobante(idPedido), {
      loading: "Cargando el comprobante…",
      success: "Comprobante listo",
      error: "No se pudo cargar el comprobante",
    })
    if (respuesta.isOk()) setComprobante({ ...respuesta.data, id_pedido: idPedido })
    return respuesta
  }, [])

  // Vuelve a pedir el comprobante sin avisos (tras una devolución, por ejemplo)
  const actualizar = React.useCallback(async (idPedido: string) => {
    const respuesta = await getComprobante(idPedido)
    if (respuesta.isOk()) setComprobante({ ...respuesta.data, id_pedido: idPedido })
  }, [])

  const cerrar = React.useCallback(() => setComprobante(null), [])

  return { comprobante, consultar, actualizar, cerrar }
}

/** Anulación de un pedido que todavía no se cobró. */
export function useAnularPedido() {
  return React.useCallback(async (idPedido: string, motivo: string) => {
    return toastResponse(anularPedido(idPedido, motivo), {
      loading: "Anulando el pedido…",
      success: "Pedido anulado",
      error: "No se pudo anular el pedido",
    })
  }, [])
}
