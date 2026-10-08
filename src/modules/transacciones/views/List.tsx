"use client"

import * as React from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  Coins,
  Eye,
  History,
  LockKeyhole,
  LockKeyholeOpen,
  ReceiptText,
  RefreshCw,
  Search,
  SearchX,
  Undo2,
  X,
} from "lucide-react"

import type { MetodoPago, MovimientoHistorialDto, TipoMovimientoManual } from "@/dtos/caja"
import type { PedidoListadoDto } from "@/dtos/pedidos"
import { useCan } from "@/modules/auth"
import { usePaginacionAjustada } from "@/shared/hooks"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { BarraPaginacion, GrillaAjustada } from "@/shared/components/ui/pagination"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ACCION, MODULO } from "@/shared/constants/permisos"
import { cn } from "@/shared/utils/cn"
import { aCentimos, formatearCentimos, formatearDinero } from "@/shared/utils/dinero"

import { useAnularPedido, useComprobante, useHistorialPedidos, useTurnoCaja } from "../hooks"
import {
  AnularPedidoForm,
  AperturaCajaForm,
  CierreCajaForm,
  ComprobanteModal,
  DevolucionForm,
  MovimientoCajaForm,
  type CobroDevolvible,
} from "./Form"
import {
  ESTADO_PEDIDO_CONFIG,
  GRUPO_PEDIDO_CHIPS,
  botonSecundarioClass,
  formatFechaHora,
  formatHora,
  formatTranscurrido,
  opcionClass,
  panelClass,
  pestanaClass,
  tarjetaClass,
  textoAcento,
  textoEtiqueta,
  textoSecundario,
  textoTitulo,
} from "../components"
import {
  ESTADO_PEDIDO_LABELS,
  GRUPO_PEDIDO_LABELS,
  METODO_PAGO_LABELS,
  PERIODO_PEDIDOS_LABELS,
  TIPO_MOVIMIENTO_LABELS,
  codigoPedido,
  type FiltroGrupoPedido,
  type PeriodoPedidos,
  type TurnoArchivado,
} from "../schema"
import { devolverCobro } from "../actions/transacciones.actions"
import { toastResponse } from "@/shared/utils/toast-response"

export type PestanaTransacciones = "cajas" | "historial"

interface TransaccionesViewProps {
  pestanaPorDefecto?: PestanaTransacciones
}

/** Cada ruta muestra una sola sección: /transacciones/cajas (turno de caja) o /transacciones/pedidos (historial). */
export default function TransaccionesView({ pestanaPorDefecto = "cajas" }: TransaccionesViewProps) {
  const { puede } = useCan()

  // Todas las vistas se ajustan al alto disponible (sin scroll en ningún dispositivo)
  return (
    <div data-sin-desborde className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {pestanaPorDefecto === "cajas" ? (
        <SeccionCajas
          puedeAbrirCerrar={puede({ modulo: MODULO.TRANSACTIONS, accion: ACCION.ARQUEAR })}
          puedeMover={puede({ modulo: MODULO.TRANSACTIONS, accion: ACCION.CREAR })}
        />
      ) : (
        <SeccionHistorialPedidos
          puedeDevolver={puede({ modulo: MODULO.TRANSACTIONS, accion: ACCION.DEVOLVER })}
          puedeAnular={puede({ modulo: MODULO.ORDERS, accion: ACCION.ANULAR })}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*        Ajuste sin scroll: altos fijos y selector de paneles en móvil       */
/* -------------------------------------------------------------------------- */

// Altos fijos de filas: permiten calcular cuántas caben sin scroll en cualquier pantalla
const ALTO_MOVIMIENTO = 60
const ALTO_TURNO = 76
const ALTO_PEDIDO = 60
// Ancho mínimo enorme = listas de una sola columna
const UNA_COLUMNA = 100_000

type PanelCaja = "principal" | "movimientos" | "turnos"

// En móvil y tablet los paneles se alternan con este selector; en escritorio se ven todos a la vez
function SelectorPaneles({
  opciones,
  activo,
  onChange,
}: {
  opciones: { id: PanelCaja; label: string; total?: number }[]
  activo: PanelCaja
  onChange: (id: PanelCaja) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Paneles de la caja"
      className="flex shrink-0 items-center gap-1 rounded-full bg-[#EDE5E6]/60 p-1 xl:hidden dark:bg-stone-800"
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          role="tab"
          aria-selected={activo === opcion.id}
          onClick={() => onChange(opcion.id)}
          className={cn(
            "inline-flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-all",
            pestanaClass(activo === opcion.id)
          )}
        >
          <span className="truncate">{opcion.label}</span>
          {opcion.total !== undefined && <span className="shrink-0 tabular-nums opacity-70">{opcion.total}</span>}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                         Turno de caja (apertura y cierre)                  */
/* -------------------------------------------------------------------------- */

function SeccionCajas({ puedeAbrirCerrar, puedeMover }: { puedeAbrirCerrar: boolean; puedeMover: boolean }) {
  const { actual, resumen, movimientos, archivados, isLoading, error, recargar, abrir, registrar, cerrar } = useTurnoCaja()
  const [panel, setPanel] = React.useState<PanelCaja>("principal")
  const [modalMovimiento, setModalMovimiento] = React.useState<TipoMovimientoManual | null>(null)
  const [modalCierre, setModalCierre] = React.useState(false)

  if (isLoading) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={recargar} />

  // En móvil/tablet solo se muestra el panel elegido; en escritorio (xl) se muestran todos
  const visibilidad = (id: PanelCaja) => (panel === id ? "flex" : "hidden xl:flex")

  /* Sin turno activo: formulario de apertura + turnos anteriores */
  if (!actual || !resumen) {
    const activo = panel === "movimientos" ? "principal" : panel
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <SelectorPaneles
          opciones={[
            { id: "principal", label: "Apertura" },
            { id: "turnos", label: "Turnos anteriores", total: archivados.length },
          ]}
          activo={activo}
          onChange={setPanel}
        />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={cn("min-h-0 flex-col", activo === "principal" ? "flex" : "hidden xl:flex")}>
            <AperturaCajaForm
              ultimoTurno={archivados[0]}
              puedeAbrir={puedeAbrirCerrar}
              onAbrir={async (monto) => (await abrir({ monto_inicial: monto })).isOk()}
            />
          </div>
          <PanelTurnos turnos={archivados} titulo="Turnos anteriores" className={visibilidad("turnos")} />
        </div>
      </div>
    )
  }

  const { turno } = actual

  /* Turno abierto: estado, acciones y métricas + movimientos + turnos anteriores */
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className={cn(tarjetaClass, "flex shrink-0 flex-col gap-4 p-4 xl:gap-5 xl:p-5")}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 sm:size-12 dark:bg-emerald-500/20 dark:text-emerald-300">
              <LockKeyholeOpen className="size-5 sm:size-6" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className={cn("truncate text-base font-bold sm:text-lg", textoTitulo)}>
                  Turno {turno.id_turno_caja.slice(0, 8).toUpperCase()}
                </h2>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Abierto
                </span>
              </div>
              <p className={cn("truncate text-xs", textoSecundario)}>
                Responsable: <strong>{turno.abierto_por}</strong> · Abierto hace{" "}
                <strong>{formatTranscurrido(turno.fecha_apertura)}</strong> ({formatHora(turno.fecha_apertura)})
              </p>
            </div>
          </div>

          {/* Acciones del turno: Entradas, Salidas y Arqueo/Cierre */}
          <div className="grid shrink-0 grid-cols-3 gap-2 sm:flex sm:items-center">
            {puedeMover && (
              <>
                <Button
                  id="caja-btn-entrada"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalMovimiento("ingreso_manual")}
                  leftIcon={<ArrowDownCircle className="size-4" />}
                  className={cn("w-full gap-1.5 px-2 sm:w-auto sm:px-4", botonSecundarioClass)}
                >
                  Entrada
                </Button>
                <Button
                  id="caja-btn-salida"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalMovimiento("retiro_manual")}
                  leftIcon={<ArrowUpCircle className="size-4" />}
                  className={cn("w-full gap-1.5 px-2 sm:w-auto sm:px-4", botonSecundarioClass)}
                >
                  Salida
                </Button>
              </>
            )}
            {puedeAbrirCerrar && (
              <Button
                id="caja-btn-cerrar"
                type="button"
                size="sm"
                onClick={() => setModalCierre(true)}
                leftIcon={<LockKeyhole className="size-4" />}
                className="w-full gap-1.5 bg-[#4C0107] px-2 text-white hover:bg-[#4C0107]/90 sm:w-auto sm:px-4 dark:bg-stone-100 dark:text-stone-900"
              >
                <span className="sm:hidden">Cierre</span>
                <span className="hidden sm:inline">Arqueo y Cierre</span>
              </Button>
            )}
          </div>
        </div>

        {/* En escritorio las métricas viven en la tarjeta del turno */}
        <MetricasTurno fondo={turno.monto_inicial} resumen={resumen} className="hidden xl:grid" />
      </div>

      <SelectorPaneles
        opciones={[
          { id: "principal", label: "Resumen" },
          { id: "movimientos", label: "Movimientos", total: movimientos.length },
          { id: "turnos", label: "Turnos", total: archivados.length },
        ]}
        activo={panel}
        onChange={setPanel}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* En móvil y tablet las métricas son un panel propio */}
        <div
          data-sin-desborde
          className={cn("min-h-0 flex-col overflow-hidden xl:hidden", panel === "principal" ? "flex" : "hidden")}
        >
          <MetricasTurno fondo={turno.monto_inicial} resumen={resumen} className="grid" />
        </div>
        <PanelMovimientos movimientos={movimientos} className={visibilidad("movimientos")} />
        <PanelTurnos turnos={archivados} titulo="Turnos anteriores" className={visibilidad("turnos")} />
      </div>

      {modalMovimiento && (
        <MovimientoCajaForm
          tipoInicial={modalMovimiento}
          efectivoDisponibleCentimos={resumen.efectivoEsperado}
          onClose={() => setModalMovimiento(null)}
          onRegistrar={async (tipo, concepto, monto) =>
            (await registrar({ tipo_movimiento: tipo, metodo_pago: "efectivo", monto, notas: concepto })).isOk()
          }
        />
      )}

      {modalCierre && (
        <CierreCajaForm
          turno={turno}
          resumen={resumen}
          onClose={() => setModalCierre(false)}
          onCerrar={async (montoFinalReal, observaciones) => {
            const respuesta = await cerrar({ monto_final_real: montoFinalReal, notas_cierre: observaciones })
            return respuesta?.isOk() ? respuesta.data : null
          }}
        />
      )}
    </div>
  )
}

function MetricasTurno({
  fondo,
  resumen,
  className,
}: {
  fondo: string
  resumen: NonNullable<ReturnType<typeof useTurnoCaja>["resumen"]>
  className?: string
}) {
  return (
    <div className={cn("grid-cols-2 content-start gap-2 sm:grid-cols-3 lg:gap-3 xl:grid-cols-5", className)}>
      <MetricCard label="Fondo Inicial" valor={formatearDinero(fondo)} sub="Efectivo de apertura" />
      <MetricCard
        label="Efectivo en Caja"
        valor={formatearCentimos(resumen.efectivoEsperado)}
        sub="Fondo + ventas + entradas − salidas"
        destacado
      />
      <MetricCard
        label="Ventas Efectivo"
        valor={formatearCentimos(resumen.ventasEfectivo)}
        sub={`${resumen.cuentasCobradas} cobros registrados`}
      />
      <MetricCard
        label="Digital / Tarjeta"
        valor={formatearCentimos(resumen.ventasTarjeta + resumen.ventasDigitales)}
        sub={`Tarj: ${formatearCentimos(resumen.ventasTarjeta)} · Dig: ${formatearCentimos(resumen.ventasDigitales)}`}
      />
      <MetricCard
        label="Entradas / Salidas"
        valor={`${formatearCentimos(resumen.ingresos)} / ${formatearCentimos(resumen.retiros)}`}
        sub={`Devoluciones: ${formatearCentimos(resumen.devoluciones)}`}
      />
    </div>
  )
}

function MetricCard({
  label,
  valor,
  sub,
  destacado = false,
}: {
  label: string
  valor: string
  sub?: string
  destacado?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-2xl border p-3 transition-colors lg:p-3.5",
        destacado
          ? "border-[#4C0107]/30 bg-[#EDE5E6]/40 dark:border-[#E7B7BC]/30 dark:bg-stone-800/80"
          : "border-slate-100 bg-slate-50/70 dark:border-stone-800 dark:bg-stone-900"
      )}
    >
      <span className={cn("truncate", textoEtiqueta)}>{label}</span>
      <span
        className={cn(
          "truncate text-base font-bold tabular-nums tracking-tight lg:text-lg",
          destacado ? textoAcento : textoTitulo
        )}
      >
        {valor}
      </span>
      {/* En pantallas de poca altura se omite el detalle para que todo quepa */}
      {sub && <span className={cn("truncate text-[11px] [@media(max-height:700px)]:hidden", textoSecundario)}>{sub}</span>}
    </div>
  )
}

// Encabezado común de los paneles de la caja
function EncabezadoPanel({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <h3 className={cn("truncate text-sm font-bold sm:text-base", textoTitulo)}>{titulo}</h3>
      <span
        className={cn(
          "shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold dark:bg-stone-800",
          textoSecundario
        )}
      >
        {detalle}
      </span>
    </div>
  )
}

function PanelVacio({ icono: Icono, titulo, texto }: { icono: typeof Coins; titulo: string; texto: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center dark:border-stone-700">
      <Icono className="size-6 text-slate-400 dark:text-stone-500" />
      <p className={cn("text-sm font-semibold", textoTitulo)}>{titulo}</p>
      <p className={cn("line-clamp-2 text-xs", textoSecundario)}>{texto}</p>
    </div>
  )
}

// Registro de movimientos del turno, paginado según el alto disponible
function PanelMovimientos({
  movimientos,
  className,
}: {
  movimientos: MovimientoHistorialDto[]
  className?: string
}) {
  const paginacion = usePaginacionAjustada(movimientos, { altoItem: ALTO_MOVIMIENTO, anchoMinimo: UNA_COLUMNA, gap: 0 })

  return (
    <section
      className={cn(panelClass, "min-h-0 flex-col gap-3 overflow-hidden p-4", className)}
      aria-label="Movimientos del turno de caja"
    >
      <EncabezadoPanel titulo="Movimientos del turno" detalle={`${movimientos.length} operaciones`} />
      {movimientos.length === 0 ? (
        <PanelVacio
          icono={Coins}
          titulo="Sin movimientos aún"
          texto="Al cobrar cuentas o registrar entradas/salidas se listarán aquí."
        />
      ) : (
        <>
          <GrillaAjustada paginacion={paginacion} etiqueta="Movimientos del turno">
            {paginacion.visibles.map((mov) => (
              <li key={mov.id_transaccion_caja} className="min-h-0">
                <MovimientoItem movimiento={mov} />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="movimientos" />
        </>
      )}
    </section>
  )
}

// Turnos anteriores (reconstruidos del libro de caja), paginados según el alto disponible
function PanelTurnos({ turnos, titulo, className }: { turnos: TurnoArchivado[]; titulo: string; className?: string }) {
  const paginacion = usePaginacionAjustada(turnos, { altoItem: ALTO_TURNO, anchoMinimo: UNA_COLUMNA, gap: 0 })

  return (
    <section className={cn(panelClass, "min-h-0 flex-col gap-3 overflow-hidden p-4", className)} aria-label={titulo}>
      <EncabezadoPanel titulo={titulo} detalle={`${turnos.length} turnos`} />
      {turnos.length === 0 ? (
        <PanelVacio icono={History} titulo="Sin turnos anteriores" texto="Los turnos con movimientos aparecerán aquí." />
      ) : (
        <>
          <GrillaAjustada paginacion={paginacion} etiqueta={titulo}>
            {paginacion.visibles.map((turno) => (
              <li key={turno.id} className="min-h-0">
                <TurnoItem turno={turno} />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="turnos" compacta />
        </>
      )}
    </section>
  )
}

function MovimientoItem({ movimiento }: { movimiento: MovimientoHistorialDto }) {
  const suma = movimiento.tipo_movimiento === "venta" || movimiento.tipo_movimiento === "ingreso_manual"
  const Icono =
    movimiento.tipo_movimiento === "venta"
      ? ReceiptText
      : movimiento.tipo_movimiento === "devolucion"
        ? Undo2
        : suma
          ? ArrowDownCircle
          : ArrowUpCircle

  const colorIcono =
    movimiento.tipo_movimiento === "venta"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300"
      : suma
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"

  const concepto =
    movimiento.notas || (movimiento.id_pedido ? `Cobro ${codigoPedido(movimiento.id_pedido)}` : TIPO_MOVIMIENTO_LABELS[movimiento.tipo_movimiento])

  return (
    <div className="flex h-full items-center justify-between gap-3 border-b border-slate-100 text-sm dark:border-stone-800">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", colorIcono)}>
          <Icono className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className={cn("truncate font-semibold", textoTitulo)}>{concepto}</span>
          <span className={cn("truncate text-xs", textoSecundario)}>
            {formatHora(movimiento.fecha_creacion)} · {METODO_PAGO_LABELS[movimiento.metodo_pago as MetodoPago]} · Por{" "}
            {movimiento.registrado_por}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <span
          className={cn(
            "font-bold tabular-nums",
            suma ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {suma ? "+" : "-"} {formatearDinero(movimiento.monto)}
        </span>
        {movimiento.id_pedido && (
          <span className={cn("text-[11px] font-mono", textoSecundario)}>{codigoPedido(movimiento.id_pedido)}</span>
        )}
      </div>
    </div>
  )
}

function TurnoItem({ turno }: { turno: TurnoArchivado }) {
  return (
    <div className="flex h-full flex-col justify-center gap-0.5 border-b border-slate-100 text-xs dark:border-stone-800">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("truncate text-sm font-bold", textoTitulo)}>{turno.codigo}</span>
        <span className={cn("shrink-0 tabular-nums", textoSecundario)}>{turno.movimientos} mov.</span>
      </div>
      <div className={cn("flex items-center justify-between gap-2", textoSecundario)}>
        <span className="truncate">{formatFechaHora(turno.desde)}</span>
        <span className="truncate">Registró: {turno.registradoPor}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={textoSecundario}>Ventas del turno:</span>
        <span className={cn("font-semibold tabular-nums", textoTitulo)}>{formatearCentimos(turno.ventasCentimos)}</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                            Historial de pedidos                            */
/* -------------------------------------------------------------------------- */

// Columnas de la lista: en tablet se muestran las esenciales y en escritorio amplio, todas
const columnasPedido =
  "md:grid md:items-center md:gap-3 md:grid-cols-[84px_minmax(0,1fr)_118px_88px_100px_96px] xl:grid-cols-[84px_minmax(0,1fr)_124px_70px_100px_150px_120px]"

function SeccionHistorialPedidos({ puedeDevolver, puedeAnular }: { puedeDevolver: boolean; puedeAnular: boolean }) {
  const {
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
  } = useHistorialPedidos()
  const { comprobante, consultar, actualizar, cerrar: cerrarComprobante } = useComprobante()
  const anular = useAnularPedido()

  const [cobroADevolver, setCobroADevolver] = React.useState<CobroDevolvible | null>(null)
  const [pedidoAAnular, setPedidoAAnular] = React.useState<{ id: string; detalle: string } | null>(null)

  // Lista de una sola columna; al cambiar búsqueda o filtros se vuelve a la primera página
  const paginacion = usePaginacionAjustada(pedidosFiltrados, {
    altoItem: ALTO_PEDIDO,
    anchoMinimo: UNA_COLUMNA,
    gap: 0,
    clave: `${busqueda}|${grupo}|${periodo}`,
  })

  if (isLoading) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={recargar} />

  const total = conteo.activo + conteo.pagado + conteo.anulado

  const devolver = async (payload: { id_transaccion_origen: string; monto: string; motivo: string }, clave: string) => {
    const respuesta = await toastResponse(devolverCobro(payload, clave), {
      loading: "Registrando la devolución…",
      success: "Devolución registrada",
      error: "No se pudo registrar la devolución",
    })
    if (respuesta.isOk()) {
      if (comprobante) await actualizar(comprobante.id_pedido)
      recargar()
    }
    return respuesta.isOk()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Resumen del periodo */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <MetricCard label="Pedidos" valor={String(total)} sub={PERIODO_PEDIDOS_LABELS[periodo]} />
        <MetricCard label="Cobrado" valor={formatearCentimos(cobradoCentimos)} sub={`${conteo.pagado} pagados`} />
        <MetricCard label="Por cobrar" valor={formatearCentimos(porCobrarCentimos)} sub={`${conteo.activo} en curso`} destacado />
        <MetricCard label="Anulados" valor={String(conteo.anulado)} sub="Quedan registrados" />
      </div>

      <section
        className={cn(panelClass, "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4")}
        aria-label="Historial de pedidos"
      >
        <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          {/* Buscador */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
            <Input
              id="historial-buscar-pedido"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, mesa o estado…"
              className="h-10 rounded-full pl-9 pr-9 text-xs"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:text-stone-400 dark:hover:text-stone-200"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5">
            {/* Periodo consultado a la API */}
            {(Object.keys(PERIODO_PEDIDOS_LABELS) as PeriodoPedidos[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                aria-pressed={periodo === p}
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center justify-center rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors",
                  opcionClass(periodo === p)
                )}
              >
                {PERIODO_PEDIDOS_LABELS[p]}
              </button>
            ))}
            <span className="mx-1 hidden w-px self-stretch bg-slate-200 lg:block dark:bg-stone-700" />
            {/* Filtro por estado */}
            {GRUPO_PEDIDO_CHIPS.map((g: FiltroGrupoPedido) => {
              const activo = grupo === g
              const cantidad = g === "todos" ? total : conteo[g]
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrupo(g)}
                  aria-pressed={activo}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors",
                    opcionClass(activo)
                  )}
                >
                  <span>{g === "todos" ? "Todos" : GRUPO_PEDIDO_LABELS[g]}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] tabular-nums",
                      activo
                        ? "bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900"
                        : "bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300"
                    )}
                  >
                    {cantidad}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {pedidosFiltrados.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-stone-700">
            <SearchX className="size-6 text-slate-400 dark:text-stone-500" />
            <p className={cn("text-sm font-semibold", textoTitulo)}>No se encontraron pedidos</p>
            <p className={cn("text-xs", textoSecundario)}>Prueba con otro periodo, filtro o término de búsqueda.</p>
          </div>
        ) : (
          <>
            {/* Encabezado de columnas (tablet y escritorio) */}
            <div
              className={cn(
                "hidden shrink-0 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500 dark:border-stone-800 dark:text-stone-400",
                columnasPedido
              )}
            >
              <span>Pedido</span>
              <span>Lugar</span>
              <span>Fecha / Hora</span>
              <span className="hidden xl:block">Items</span>
              <span className="text-right">Total</span>
              <span className="text-center">Estado</span>
              <span className="text-right">Acciones</span>
            </div>

            <GrillaAjustada paginacion={paginacion} etiqueta="Pedidos del historial">
              {paginacion.visibles.map((pedido) => (
                <li key={pedido.id_pedido} className="min-h-0">
                  <FilaPedido
                    pedido={pedido}
                    puedeAnular={puedeAnular}
                    onVerDetalle={() => void consultar(pedido.id_pedido)}
                    onAnular={() =>
                      setPedidoAAnular({
                        id: pedido.id_pedido,
                        detalle: `${lugarDe(pedido)} · ${formatearDinero(pedido.total_calculado)}`,
                      })
                    }
                  />
                </li>
              ))}
            </GrillaAjustada>
            <BarraPaginacion paginacion={paginacion} etiqueta="pedidos" />
          </>
        )}
      </section>

      {comprobante && (
        <ComprobanteModal
          comprobante={comprobante}
          puedeDevolver={puedeDevolver}
          puedeAnular={puedeAnular}
          onClose={cerrarComprobante}
          onDevolver={setCobroADevolver}
          onAnular={() => {
            setPedidoAAnular({ id: comprobante.id_pedido, detalle: `${comprobante.numero} · ${formatearDinero(comprobante.total)}` })
          }}
        />
      )}

      {comprobante && cobroADevolver && (
        <DevolucionForm
          cobro={cobroADevolver}
          codigo={comprobante.numero}
          onClose={() => setCobroADevolver(null)}
          onDevolver={devolver}
        />
      )}

      {pedidoAAnular && (
        <AnularPedidoForm
          idPedido={pedidoAAnular.id}
          detalle={pedidoAAnular.detalle}
          onClose={() => setPedidoAAnular(null)}
          onAnular={async (id, motivo) => {
            const respuesta = await anular(id, motivo)
            if (respuesta.isOk()) {
              cerrarComprobante()
              recargar()
            }
            return respuesta.isOk()
          }}
        />
      )}
    </div>
  )
}

const lugarDe = (p: Pick<PedidoListadoDto, "tipo_pedido" | "mesa_numero">): string =>
  p.tipo_pedido === "salon" && p.mesa_numero ? `Mesa ${p.mesa_numero}` : p.tipo_pedido === "delivery" ? "Delivery" : "Para llevar"

function FilaPedido({
  pedido,
  puedeAnular,
  onVerDetalle,
  onAnular,
}: {
  pedido: PedidoListadoDto
  puedeAnular: boolean
  onVerDetalle: () => void
  onAnular: () => void
}) {
  const conf = ESTADO_PEDIDO_CONFIG[pedido.estado]
  const codigo = codigoPedido(pedido.id_pedido)
  // Solo se anula lo que está en curso y todavía no tiene cobros
  const sePuedeAnular = puedeAnular && pedido.estado !== "anulado" && pedido.estado !== "pagado" && aCentimos(pedido.total_pagado) === 0
  const conSaldo = pedido.estado !== "anulado" && aCentimos(pedido.saldo_pendiente) > 0 && aCentimos(pedido.total_pagado) > 0

  const badgeEstado = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        conf.badge
      )}
    >
      <span className={cn("size-1.5 rounded-full", conf.dot)} />
      {ESTADO_PEDIDO_LABELS[pedido.estado]}
      {conSaldo && <span className="opacity-70">· parcial</span>}
      {pedido.estado_pago === "devuelto" || pedido.estado_pago === "devuelto_parcial" ? (
        <span className="opacity-70">· {pedido.estado_pago === "devuelto" ? "devuelto" : "dev. parcial"}</span>
      ) : null}
    </span>
  )

  const botonTexto = "rounded-lg px-2 py-1 text-xs font-semibold transition-colors cursor-pointer"
  const botonIcono = "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors"

  return (
    <div className="h-full border-b border-slate-100 text-xs transition-colors hover:bg-slate-100/50 dark:border-stone-800/80 dark:hover:bg-stone-900/60">
      {/* Móvil: dos líneas compactas */}
      <div className="flex h-full flex-col justify-center gap-1 md:hidden">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-bold text-slate-900 dark:text-stone-100">{codigo}</span>
            <span className="truncate text-slate-700 dark:text-stone-300">{lugarDe(pedido)}</span>
          </span>
          <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-stone-100">
            {formatearDinero(pedido.total_calculado)}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {badgeEstado}
            <span className="truncate text-slate-500 dark:text-stone-400">{formatFechaHora(pedido.fecha_creacion)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onVerDetalle}
              aria-label={`Detalle de ${codigo}`}
              className={cn(botonIcono, "text-slate-600 hover:bg-slate-200/60 dark:text-stone-300 dark:hover:bg-stone-800")}
            >
              <Eye className="size-4" />
            </button>
            {sePuedeAnular && (
              <button
                type="button"
                onClick={onAnular}
                aria-label={`Anular ${codigo}`}
                className={cn(botonIcono, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15")}
              >
                <Ban className="size-4" />
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Tablet y escritorio: una fila con columnas */}
      <div className={cn("hidden h-full", columnasPedido)}>
        <span className="truncate font-bold text-slate-900 dark:text-stone-100">{codigo}</span>
        <span className="truncate text-slate-700 dark:text-stone-300">{lugarDe(pedido)}</span>
        <span className="truncate text-slate-600 dark:text-stone-400">{formatFechaHora(pedido.fecha_creacion)}</span>
        <span className="hidden truncate text-slate-600 xl:block dark:text-stone-400">{pedido.total_items}</span>
        <span className="truncate text-right font-bold tabular-nums text-slate-900 dark:text-stone-100">
          {formatearDinero(pedido.total_calculado)}
        </span>
        <span className="text-center">{badgeEstado}</span>
        {/* Entre tablet y laptop: acciones como íconos para dar espacio a las columnas */}
        <span className="flex items-center justify-end gap-0.5 xl:hidden">
          <button
            type="button"
            onClick={onVerDetalle}
            aria-label={`Detalle de ${codigo}`}
            title="Detalle"
            className={cn(botonIcono, "text-slate-600 hover:bg-slate-200/60 dark:text-stone-300 dark:hover:bg-stone-800")}
          >
            <Eye className="size-4" />
          </button>
          {sePuedeAnular && (
            <button
              type="button"
              onClick={onAnular}
              aria-label={`Anular ${codigo}`}
              title="Anular"
              className={cn(botonIcono, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15")}
            >
              <Ban className="size-4" />
            </button>
          )}
        </span>
        <span className="hidden items-center justify-end gap-1 xl:flex">
          <button
            type="button"
            onClick={onVerDetalle}
            className={cn(botonTexto, "text-slate-700 hover:bg-slate-200/60 dark:text-stone-300 dark:hover:bg-stone-800")}
          >
            Detalle
          </button>
          {sePuedeAnular && (
            <button
              type="button"
              onClick={onAnular}
              className={cn(botonTexto, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15")}
            >
              Anular
            </button>
          )}
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Estados auxiliares                           */
/* -------------------------------------------------------------------------- */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-stone-700">
      <p className={cn("text-sm", textoSecundario)}>{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className={cn("rounded-full", botonSecundarioClass)}
      >
        <RefreshCw className="mr-1 size-4" /> Reintentar
      </Button>
    </div>
  )
}

function TransaccionesSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden" aria-busy="true">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl dark:bg-stone-800" />
        ))}
      </div>
      <Skeleton className="min-h-0 flex-1 rounded-2xl dark:bg-stone-800" />
    </div>
  )
}
