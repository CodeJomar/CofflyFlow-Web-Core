"use client"

import * as React from "react"
import {
  abrirTurnoCaja,
  anularComanda,
  cerrarTurnoCaja,
  cobrarCuentaMesa,
  getComprobante,
  getCuentasAbiertas,
  getHistorialComandas,
  getTurnosCaja,
  registrarMovimientoCaja,
  reimprimirComprobante,
} from "../actions/transacciones.actions"
import {
  calcularResumenTurno,
  type CobroCuentaPayload,
  type Comanda,
  type ComprobanteInterno,
  type CuentaMesa,
  type EstadoComanda,
  type FiltroEstadoComanda,
  type TipoMovimiento,
  type TurnoCaja,
} from "../schema"

// Normaliza texto para búsquedas sin tildes ni mayúsculas
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

const mensajeError = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto)

/* -------------------------------------------------------------------------- */
/*                 RF-13: Apertura y Cierre de Turnos de Caja                 */
/* -------------------------------------------------------------------------- */

export function useTurnoCaja() {
  const [turnos, setTurnos] = React.useState<TurnoCaja[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    let vigente = true
    getTurnosCaja()
      .then((data) => {
        if (!vigente) return
        setTurnos(data)
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

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  // Vuelve a consultar sin mostrar el estado de carga (tras un cobro, por ejemplo)
  const refrescar = React.useCallback(() => setReloadKey((k) => k + 1), [])

  const turnoActivo = React.useMemo(() => turnos.find((t) => t.estado === "abierto") ?? null, [turnos])
  const turnosCerrados = React.useMemo(() => turnos.filter((t) => t.estado === "cerrado"), [turnos])
  const resumen = React.useMemo(() => (turnoActivo ? calcularResumenTurno(turnoActivo) : null), [turnoActivo])

  // Reemplaza o agrega el turno actualizado en la lista local
  const aplicarTurno = React.useCallback((turno: TurnoCaja) => {
    setTurnos((prev) => {
      const existe = prev.some((t) => t.id === turno.id)
      const lista = existe ? prev.map((t) => (t.id === turno.id ? turno : t)) : [turno, ...prev]
      return lista.sort((a, b) => b.abiertoEn.localeCompare(a.abiertoEn))
    })
  }, [])

  const abrir = React.useCallback(
    async (montoInicial: number, nota?: string) => {
      const turno = await abrirTurnoCaja(montoInicial, nota)
      aplicarTurno(turno)
      return turno
    },
    [aplicarTurno]
  )

  const registrarMovimiento = React.useCallback(
    async (tipo: TipoMovimiento, concepto: string, monto: number) => {
      const turno = await registrarMovimientoCaja(tipo, concepto, monto)
      aplicarTurno(turno)
      return turno
    },
    [aplicarTurno]
  )

  const cerrar = React.useCallback(
    async (conteo: Record<string, number>, observaciones?: string) => {
      const turno = await cerrarTurnoCaja(conteo, observaciones)
      aplicarTurno(turno)
      return turno
    },
    [aplicarTurno]
  )

  return {
    turnos,
    turnoActivo,
    turnosCerrados,
    resumen,
    isLoading,
    error,
    recargar,
    refrescar,
    abrir,
    registrarMovimiento,
    cerrar,
  }
}

/* -------------------------------------------------------------------------- */
/*                 RF-14: Cobro y Cierre de Cuentas por Mesa                  */
/* -------------------------------------------------------------------------- */

export function useCuentasMesa() {
  const [cuentas, setCuentas] = React.useState<CuentaMesa[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    let vigente = true
    getCuentasAbiertas()
      .then((data) => {
        if (!vigente) return
        setCuentas(data)
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudieron cargar las cuentas abiertas.")
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

  const totalPendiente = React.useMemo(() => cuentas.reduce((acc, c) => acc + c.total, 0), [cuentas])

  const refrescar = React.useCallback(() => setReloadKey((k) => k + 1), [])

  return { cuentas, totalPendiente, isLoading, error, recargar, refrescar }
}

export function useCobroCuenta() {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const cobrar = React.useCallback(async (payload: CobroCuentaPayload) => {
    setIsSubmitting(true)
    setError(null)
    try {
      return await cobrarCuentaMesa(payload)
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar el cobro."))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { cobrar, isSubmitting, error, setError }
}

/* -------------------------------------------------------------------------- */
/*                   RF-15: Historial y Auditoría de Comandas                 */
/* -------------------------------------------------------------------------- */

export function useHistorialComandas() {
  const [comandas, setComandas] = React.useState<Comanda[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [busqueda, setBusqueda] = React.useState("")
  const [estado, setEstado] = React.useState<FiltroEstadoComanda>("todas")

  React.useEffect(() => {
    let vigente = true
    getHistorialComandas()
      .then((data) => {
        if (!vigente) return
        setComandas(data)
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar el historial de comandas.")
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
    const termino = normalizar(busqueda)
    return comandas.filter((c) => {
      const coincideEstado = estado === "todas" || c.estado === estado
      const coincideBusqueda =
        !termino ||
        [c.codigo, c.mesaNombre, c.mozo, c.comprobante ?? "", ...c.items.map((i) => i.nombre)].some((campo) =>
          normalizar(campo).includes(termino)
        )
      return coincideEstado && coincideBusqueda
    })
  }, [comandas, busqueda, estado])

  const conteo = React.useMemo(() => {
    const base: Record<EstadoComanda, number> = { emitida: 0, cobrada: 0, anulada: 0 }
    for (const c of comandas) base[c.estado] += 1
    return base
  }, [comandas])

  const montoCobrado = React.useMemo(
    () => comandas.filter((c) => c.estado === "cobrada").reduce((acc, c) => acc + c.total, 0),
    [comandas]
  )
  const montoAnulado = React.useMemo(
    () => comandas.filter((c) => c.estado === "anulada").reduce((acc, c) => acc + c.total, 0),
    [comandas]
  )

  const reemplazar = React.useCallback((actualizada: Comanda) => {
    setComandas((prev) => prev.map((c) => (c.codigo === actualizada.codigo ? actualizada : c)))
  }, [])

  const anular = React.useCallback(
    async (codigo: string, motivo: string) => {
      const actualizada = await anularComanda(codigo, motivo)
      reemplazar(actualizada)
      return actualizada
    },
    [reemplazar]
  )

  return {
    comandas,
    comandasFiltradas,
    conteo,
    montoCobrado,
    montoAnulado,
    busqueda,
    setBusqueda,
    estado,
    setEstado,
    isLoading,
    error,
    recargar,
    anular,
  }
}

// Consulta y reimpresión de comprobantes internos
export function useComprobante() {
  const [comprobante, setComprobante] = React.useState<ComprobanteInterno | null>(null)
  const [esReimpresion, setEsReimpresion] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const mostrar = React.useCallback((data: ComprobanteInterno, reimpresion = false) => {
    setComprobante(data)
    setEsReimpresion(reimpresion)
    setError(null)
  }, [])

  const reimprimir = React.useCallback(async (codigo: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await reimprimirComprobante(codigo)
      setComprobante(data)
      setEsReimpresion(true)
      return data
    } catch (e) {
      setError(mensajeError(e, "No se pudo reimprimir el comprobante."))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const consultar = React.useCallback(async (codigo: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getComprobante(codigo)
      setComprobante(data)
      setEsReimpresion(false)
      return data
    } catch (e) {
      setError(mensajeError(e, "No se pudo obtener el comprobante."))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const cerrar = React.useCallback(() => {
    setComprobante(null)
    setEsReimpresion(false)
  }, [])

  return { comprobante, esReimpresion, isLoading, error, mostrar, reimprimir, consultar, cerrar }
}
