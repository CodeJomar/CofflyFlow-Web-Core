"use client"

import * as React from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  Clock,
  Coins,
  Eye,
  History,
  LockKeyhole,
  LockKeyholeOpen,
  Printer,
  Receipt,
  ReceiptText,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  Sparkles,
  Store,
  Tag,
  User,
  Utensils,
  X,
} from "lucide-react"

import { usePaginacionAjustada } from "@/shared/hooks"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { BarraPaginacion, GrillaAjustada } from "@/shared/components/ui/pagination"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/utils/cn"
import { formatToCurrency } from "@/shared/utils/formatters"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import {
  useComprobante,
  useCuentasMesa,
  useHistorialComandas,
  useTurnoCaja,
} from "../hooks"
import {
  AperturaCajaForm,
  CierreCajaForm,
  CobroCuentaForm,
  ComprobanteModal,
  DetalleComandaModal,
  AnularComandaForm,
  MovimientoCajaForm,
} from "./Form"
import {
  ESTADO_COMANDA_CONFIG,
  METODO_PAGO_ICONS,
  RESULTADO_ARQUEO_CONFIG,
  botonPeligroClass,
  botonSecundarioClass,
  formatFechaHora,
  formatHora,
  formatTranscurrido,
  opcionClass,
  panelClass,
  pestanaClass,
  tarjetaClass,
  textoAcento,
  textoCuerpo,
  textoEtiqueta,
  textoSecundario,
  textoTitulo,
} from "../components"
import {
  ESTADO_COMANDA_LABELS,
  METODO_PAGO_LABELS,
  RESULTADO_ARQUEO_LABELS,
  TIPO_MOVIMIENTO_LABELS,
  type Comanda,
  type ComprobanteInterno,
  type CuentaMesa,
  type FiltroEstadoComanda,
  type TipoMovimiento,
  type TurnoCaja,
} from "../schema"

export type PestanaTransacciones = "cajas" | "cuentas" | "historial"

interface TransaccionesViewProps {
  pestanaPorDefecto?: PestanaTransacciones
}

export default function TransaccionesView({
  pestanaPorDefecto = "cajas",
}: TransaccionesViewProps) {
  const { rol } = useWorkspaceLayout()

  // Control granular de permisos: el empleado puede ver/operar según su asignación
  if (!tienePermiso(rol, PERMISO.READ_CASH_SHIFT) && !tienePermiso(rol, PERMISO.READ_POS)) {
    return <AccesoRestringido rol={ROL_LABELS[rol]} />
  }

  return (
    <TransaccionesContenido
      pestanaInicial={pestanaPorDefecto}
      puedeAbrirCerrar={tienePermiso(rol, PERMISO.OPEN_CASH_SHIFT)}
      puedeCobrar={tienePermiso(rol, PERMISO.CREATE_ORDER)}
      puedeAnular={tienePermiso(rol, PERMISO.CANCEL_ORDER)}
    />
  )
}

function TransaccionesContenido({
  pestanaInicial,
  puedeAbrirCerrar,
  puedeCobrar,
  puedeAnular,
}: {
  pestanaInicial: PestanaTransacciones
  puedeAbrirCerrar: boolean
  puedeCobrar: boolean
  puedeAnular: boolean
}) {
  const [pestanaActiva, setPestanaActiva] = React.useState<PestanaTransacciones>(pestanaInicial)

  // Sincronización en cambios de prop (ej. al navegar entre sub-rutas de Transacciones)
  React.useEffect(() => {
    setPestanaActiva(pestanaInicial)
  }, [pestanaInicial])

  // Hooks de módulos
  const {
    turnoActivo,
    turnosCerrados,
    resumen,
    isLoading: cargandoCaja,
    error: errorCaja,
    recargar: recargarCaja,
    refrescar: refrescarCaja,
    abrir: abrirCaja,
    registrarMovimiento,
    cerrar: cerrarCaja,
  } = useTurnoCaja()

  const {
    cuentas,
    totalPendiente,
    isLoading: cargandoCuentas,
    error: errorCuentas,
    recargar: recargarCuentas,
    refrescar: refrescarCuentas,
  } = useCuentasMesa()

  const {
    comandasFiltradas,
    conteo: conteoComandas,
    montoCobrado,
    montoAnulado,
    busqueda: busquedaComandas,
    setBusqueda: setBusquedaComandas,
    estado: filtroEstadoComanda,
    setEstado: setFiltroEstadoComanda,
    isLoading: cargandoComandas,
    error: errorComandas,
    recargar: recargarComandas,
    anular: anularComandaAction,
  } = useHistorialComandas()

  const {
    comprobante,
    esReimpresion,
    isLoading: reimprimiendo,
    mostrar: mostrarComprobante,
    reimprimir: reimprimirComprobanteAction,
    consultar: consultarComprobante,
    cerrar: cerrarComprobante,
  } = useComprobante()

  // Modales abiertos
  const [modalMovimiento, setModalMovimiento] = React.useState<TipoMovimiento | null>(null)
  const [modalCierre, setModalCierre] = React.useState(false)
  const [cuentaParaCobrar, setCuentaParaCobrar] = React.useState<CuentaMesa | null>(null)
  const [comandaDetalle, setComandaDetalle] = React.useState<Comanda | null>(null)
  const [comandaParaAnular, setComandaParaAnular] = React.useState<Comanda | null>(null)

  // Callback ejecutado tras cobrar con éxito una cuenta por mesa (RF-14)
  const handleCobroExitoso = (comp: ComprobanteInterno) => {
    setCuentaParaCobrar(null)
    mostrarComprobante(comp, false)
    refrescarCuentas()
    refrescarCaja()
    recargarComandas()
  }

  // Todas las vistas se ajustan al alto disponible (sin scroll en ningún dispositivo)
  return (
    <div data-sin-desborde className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {/* Pestañas de Gestión de Cajas: RF-13 (Turno de Caja) y RF-14 (Cuentas por Mesa).
          En Historial de Pedidos no se muestran: esa ventana solo presenta el historial (RF-15). */}
      {pestanaInicial !== "historial" && (
        <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
          {/* Pestañas: RF-13 (Cajas) y RF-14 (Cuentas por Mesa) */}
          <div className="flex w-full min-w-0 items-center gap-1 rounded-full bg-[#EDE5E6]/60 p-1 sm:w-auto dark:bg-stone-800">
            <button
              type="button"
              id="transacciones-tab-cajas"
              onClick={() => setPestanaActiva("cajas")}
              className={cn(
                "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap sm:flex-none sm:px-4",
                pestanaClass(pestanaActiva === "cajas")
              )}
            >
              <Coins className="size-3.5 shrink-0" />
              <span className="truncate">Turno de Caja</span>
              {turnoActivo && (
                <span className="flex size-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              id="transacciones-tab-cuentas"
              onClick={() => setPestanaActiva("cuentas")}
              className={cn(
                "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap sm:flex-none sm:px-4",
                pestanaClass(pestanaActiva === "cuentas")
              )}
            >
              <Utensils className="size-3.5 shrink-0" />
              <span className="truncate">Cuentas por Mesa</span>
              {cuentas.length > 0 && (
                <span className="shrink-0 rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] dark:bg-white/20">
                  {cuentas.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Renderizado de la Sección Activa */}
      {pestanaActiva === "cajas" && (
        <SeccionCajas
          turnoActivo={turnoActivo}
          turnosCerrados={turnosCerrados}
          resumen={resumen}
          cargando={cargandoCaja}
          error={errorCaja}
          puedeAbrirCerrar={puedeAbrirCerrar}
          onRecargar={recargarCaja}
          onAbrir={abrirCaja}
          onAbrirMovimiento={(tipo) => setModalMovimiento(tipo)}
          onAbrirCierre={() => setModalCierre(true)}
        />
      )}

      {pestanaActiva === "cuentas" && (
        <SeccionCuentasMesa
          cuentas={cuentas}
          totalPendiente={totalPendiente}
          hayCajaAbierta={!!turnoActivo}
          cargando={cargandoCuentas}
          error={errorCuentas}
          puedeCobrar={puedeCobrar}
          onRecargar={recargarCuentas}
          onCobrarCuenta={(cuenta) => setCuentaParaCobrar(cuenta)}
        />
      )}

      {pestanaActiva === "historial" && (
        <SeccionHistorialComandas
          comandas={comandasFiltradas}
          conteo={conteoComandas}
          montoCobrado={montoCobrado}
          montoAnulado={montoAnulado}
          busqueda={busquedaComandas}
          setBusqueda={setBusquedaComandas}
          estado={filtroEstadoComanda}
          setEstado={setFiltroEstadoComanda}
          cargando={cargandoComandas}
          error={errorComandas}
          puedeAnular={puedeAnular}
          onRecargar={recargarComandas}
          onVerDetalle={(comanda) => setComandaDetalle(comanda)}
          onAnularDirecto={(comanda) => setComandaParaAnular(comanda)}
          onVerComprobante={consultarComprobante}
        />
      )}

      {/* Modales funcionales */}
      {modalMovimiento && turnoActivo && resumen && (
        <MovimientoCajaForm
          tipoInicial={modalMovimiento}
          efectivoDisponible={resumen.efectivoEsperado}
          onClose={() => setModalMovimiento(null)}
          onRegistrar={registrarMovimiento}
        />
      )}

      {modalCierre && turnoActivo && resumen && (
        <CierreCajaForm
          turno={turnoActivo}
          resumen={resumen}
          onClose={() => setModalCierre(false)}
          onCerrar={cerrarCaja}
        />
      )}

      {cuentaParaCobrar && (
        <CobroCuentaForm
          cuenta={cuentaParaCobrar}
          onClose={() => setCuentaParaCobrar(null)}
          onCobrado={handleCobroExitoso}
        />
      )}

      {comandaDetalle && (
        <DetalleComandaModal
          comanda={comandaDetalle}
          puedeAnular={puedeAnular}
          reimprimiendo={reimprimiendo}
          onClose={() => setComandaDetalle(null)}
          onAnular={() => {
            setComandaParaAnular(comandaDetalle)
            setComandaDetalle(null)
          }}
          onReimprimir={async () => {
            if (comandaDetalle.comprobante) {
              await reimprimirComprobanteAction(comandaDetalle.comprobante)
            }
          }}
        />
      )}

      {comandaParaAnular && (
        <AnularComandaForm
          comanda={comandaParaAnular}
          onClose={() => setComandaParaAnular(null)}
          onAnular={async (codigo, motivo) => {
            await anularComandaAction(codigo, motivo)
            refrescarCuentas()
          }}
        />
      )}

      {comprobante && (
        <ComprobanteModal
          comprobante={comprobante}
          esReimpresion={esReimpresion}
          onClose={cerrarComprobante}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*        Ajuste sin scroll: altos fijos y selector de paneles en móvil       */
/* -------------------------------------------------------------------------- */

// Altos fijos de filas y tarjetas: permiten calcular cuántas caben sin scroll en cualquier pantalla
const ALTO_MOVIMIENTO = 60
const ALTO_TURNO = 76
const ALTO_CUENTA = 292
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
/*                 RF-13: Vista de Apertura y Cierre de Turnos                */
/* -------------------------------------------------------------------------- */

function SeccionCajas({
  turnoActivo,
  turnosCerrados,
  resumen,
  cargando,
  error,
  puedeAbrirCerrar,
  onRecargar,
  onAbrir,
  onAbrirMovimiento,
  onAbrirCierre,
}: {
  turnoActivo: TurnoCaja | null
  turnosCerrados: TurnoCaja[]
  resumen: ReturnType<typeof useTurnoCaja>["resumen"]
  cargando: boolean
  error: string | null
  puedeAbrirCerrar: boolean
  onRecargar: () => void
  onAbrir: (monto: number, nota?: string) => Promise<unknown>
  onAbrirMovimiento: (tipo: TipoMovimiento) => void
  onAbrirCierre: () => void
}) {
  const [panel, setPanel] = React.useState<PanelCaja>("principal")

  if (cargando) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRecargar} />

  // En móvil/tablet solo se muestra el panel elegido; en escritorio (xl) se muestran todos
  const visibilidad = (id: PanelCaja) => (panel === id ? "flex" : "hidden xl:flex")

  /* Sin turno activo: formulario de apertura + turnos anteriores */
  if (!turnoActivo) {
    const activo = panel === "movimientos" ? "principal" : panel
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <SelectorPaneles
          opciones={[
            { id: "principal", label: "Apertura" },
            { id: "turnos", label: "Turnos anteriores", total: turnosCerrados.length },
          ]}
          activo={activo}
          onChange={setPanel}
        />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={cn("min-h-0 flex-col", activo === "principal" ? "flex" : "hidden xl:flex")}>
            <AperturaCajaForm
              cajero="Jomar Peralta"
              ultimoTurno={turnosCerrados[0]}
              puedeAbrir={puedeAbrirCerrar}
              onAbrir={onAbrir}
            />
          </div>
          <PanelTurnos turnos={turnosCerrados} titulo="Turnos anteriores" className={visibilidad("turnos")} />
        </div>
      </div>
    )
  }

  /* Turno abierto: estado, acciones y métricas + movimientos en vivo + turnos archivados */
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
                <h2 className={cn("truncate text-base font-bold sm:text-lg", textoTitulo)}>Turno {turnoActivo.codigo}</h2>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Abierto
                </span>
              </div>
              <p className={cn("truncate text-xs", textoSecundario)}>
                Responsable: <strong>{turnoActivo.cajero}</strong> · Abierto hace{" "}
                <strong>{formatTranscurrido(turnoActivo.abiertoEn)}</strong> ({formatHora(turnoActivo.abiertoEn)})
              </p>
            </div>
          </div>

          {/* Acciones del turno: Entradas, Salidas y Arqueo/Cierre */}
          <div className="grid shrink-0 grid-cols-3 gap-2 sm:flex sm:items-center">
            <Button
              id="caja-btn-entrada"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAbrirMovimiento("ingreso")}
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
              onClick={() => onAbrirMovimiento("egreso")}
              leftIcon={<ArrowUpCircle className="size-4" />}
              className={cn("w-full gap-1.5 px-2 sm:w-auto sm:px-4", botonSecundarioClass)}
            >
              Salida
            </Button>
            <Button
              id="caja-btn-cerrar"
              type="button"
              size="sm"
              disabled={!puedeAbrirCerrar}
              onClick={onAbrirCierre}
              leftIcon={<LockKeyhole className="size-4" />}
              className="w-full gap-1.5 bg-[#4C0107] px-2 text-white hover:bg-[#4C0107]/90 sm:w-auto sm:px-4 dark:bg-stone-100 dark:text-stone-900"
            >
              <span className="sm:hidden">Cierre</span>
              <span className="hidden sm:inline">Arqueo y Cierre</span>
            </Button>
          </div>
        </div>

        {/* En escritorio las métricas viven en la tarjeta del turno */}
        {resumen && <MetricasTurno turno={turnoActivo} resumen={resumen} className="hidden xl:grid" />}
      </div>

      <SelectorPaneles
        opciones={[
          { id: "principal", label: "Resumen" },
          { id: "movimientos", label: "Movimientos", total: turnoActivo.movimientos.length },
          { id: "turnos", label: "Turnos", total: turnosCerrados.length },
        ]}
        activo={panel}
        onChange={setPanel}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* En móvil y tablet las métricas son un panel propio */}
        {resumen && (
          <div
            data-sin-desborde
            className={cn("min-h-0 flex-col overflow-hidden xl:hidden", panel === "principal" ? "flex" : "hidden")}
          >
            <MetricasTurno turno={turnoActivo} resumen={resumen} className="grid" />
          </div>
        )}
        <PanelMovimientos movimientos={turnoActivo.movimientos} className={visibilidad("movimientos")} />
        <PanelTurnos turnos={turnosCerrados} titulo="Turnos archivados" className={visibilidad("turnos")} />
      </div>
    </div>
  )
}

function MetricasTurno({
  turno,
  resumen,
  className,
}: {
  turno: TurnoCaja
  resumen: NonNullable<ReturnType<typeof useTurnoCaja>["resumen"]>
  className?: string
}) {
  return (
    <div className={cn("grid-cols-2 content-start gap-2 sm:grid-cols-3 lg:gap-3 xl:grid-cols-5", className)}>
      <MetricCard
        label="Fondo Inicial"
        valor={formatToCurrency(turno.montoInicial)}
        sub={turno.notaApertura || "Efectivo de apertura"}
      />
      <MetricCard
        label="Efectivo en Caja"
        valor={formatToCurrency(resumen.efectivoEsperado)}
        sub="Fondo + ventas - salidas"
        destacado
      />
      <MetricCard
        label="Ventas Efectivo"
        valor={formatToCurrency(resumen.ventasEfectivo)}
        sub={`${resumen.cuentasCobradas} cuentas cobradas`}
      />
      <MetricCard
        label="Digital / Tarjeta"
        valor={formatToCurrency(resumen.ventasTarjeta + resumen.ventasBilletera)}
        sub={`Tarj: ${formatToCurrency(resumen.ventasTarjeta)} · Bill: ${formatToCurrency(resumen.ventasBilletera)}`}
      />
      <MetricCard
        label="Entradas / Salidas"
        valor={`${formatToCurrency(resumen.ingresos)} / ${formatToCurrency(resumen.egresos)}`}
        sub={`Neto: ${formatToCurrency(resumen.ingresos - resumen.egresos)}`}
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

// Registro en vivo de movimientos del turno, paginado según el alto disponible
function PanelMovimientos({
  movimientos,
  className,
}: {
  movimientos: TurnoCaja["movimientos"]
  className?: string
}) {
  const recientes = React.useMemo(() => [...movimientos].reverse(), [movimientos])
  const paginacion = usePaginacionAjustada(recientes, { altoItem: ALTO_MOVIMIENTO, anchoMinimo: UNA_COLUMNA, gap: 0 })

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
          texto="Al cobrar cuentas o registrar entradas/salidas se listarán en tiempo real."
        />
      ) : (
        <>
          <GrillaAjustada paginacion={paginacion} etiqueta="Movimientos del turno">
            {paginacion.visibles.map((mov) => (
              <li key={mov.id} className="min-h-0">
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

// Turnos cerrados archivados, paginados según el alto disponible
function PanelTurnos({ turnos, titulo, className }: { turnos: TurnoCaja[]; titulo: string; className?: string }) {
  const paginacion = usePaginacionAjustada(turnos, { altoItem: ALTO_TURNO, anchoMinimo: UNA_COLUMNA, gap: 0 })

  return (
    <section className={cn(panelClass, "min-h-0 flex-col gap-3 overflow-hidden p-4", className)} aria-label={titulo}>
      <EncabezadoPanel titulo={titulo} detalle={`${turnos.length} cerrados`} />
      {turnos.length === 0 ? (
        <PanelVacio icono={History} titulo="Sin turnos archivados" texto="Los turnos cerrados aparecerán aquí." />
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

function MovimientoItem({ movimiento }: { movimiento: TurnoCaja["movimientos"][number] }) {
  const esVenta = movimiento.tipo === "venta"
  const esIngreso = movimiento.tipo === "ingreso"
  const Icono = esVenta
    ? ReceiptText
    : esIngreso
      ? ArrowDownCircle
      : ArrowUpCircle

  const colorIcono = esVenta
    ? "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300"
    : esIngreso
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"

  const signo = esVenta || esIngreso ? "+" : "-"

  return (
    <div className="flex h-full items-center justify-between gap-3 border-b border-slate-100 text-sm dark:border-stone-800">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", colorIcono)}>
          <Icono className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className={cn("truncate font-semibold", textoTitulo)}>{movimiento.concepto}</span>
          <span className={cn("truncate text-xs", textoSecundario)}>
            {formatHora(movimiento.registradoEn)} · {METODO_PAGO_LABELS[movimiento.metodoPago]} · Por{" "}
            {movimiento.registradoPor}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <span
          className={cn(
            "font-bold tabular-nums",
            esVenta || esIngreso ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {signo} {formatToCurrency(movimiento.monto)}
        </span>
        {movimiento.referencia && (
          <span className={cn("text-[11px] font-mono", textoSecundario)}>{movimiento.referencia}</span>
        )}
      </div>
    </div>
  )
}

function TurnoItem({ turno }: { turno: TurnoCaja }) {
  const arqueo = turno.arqueo
  const resultadoConf = arqueo ? RESULTADO_ARQUEO_CONFIG[arqueo.resultado] : null

  return (
    <div className="flex h-full flex-col justify-center gap-0.5 border-b border-slate-100 text-xs dark:border-stone-800">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("truncate text-sm font-bold", textoTitulo)}>{turno.codigo}</span>
        {arqueo && resultadoConf && (
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", resultadoConf.badge)}>
            {RESULTADO_ARQUEO_LABELS[arqueo.resultado]}
          </span>
        )}
      </div>
      <div className={cn("flex items-center justify-between gap-2", textoSecundario)}>
        <span className="truncate">{formatFechaHora(turno.abiertoEn)}</span>
        <span className="truncate">Cajero: {turno.cajero}</span>
      </div>
      {arqueo && (
        <div className="flex items-center justify-between gap-2">
          <span className={textoSecundario}>Arqueo contado:</span>
          <span className={cn("font-semibold tabular-nums", textoTitulo)}>
            {formatToCurrency(arqueo.efectivoContado)}
          </span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-14: Cobro y Cierre de Cuentas por Mesa                  */
/* -------------------------------------------------------------------------- */

// Productos visibles por tarjeta; el detalle completo se ve al cobrar
const MAX_ITEMS_CUENTA = 2

function SeccionCuentasMesa({
  cuentas,
  totalPendiente,
  hayCajaAbierta,
  cargando,
  error,
  puedeCobrar,
  onRecargar,
  onCobrarCuenta,
}: {
  cuentas: CuentaMesa[]
  totalPendiente: number
  hayCajaAbierta: boolean
  cargando: boolean
  error: string | null
  puedeCobrar: boolean
  onRecargar: () => void
  onCobrarCuenta: (cuenta: CuentaMesa) => void
}) {
  const paginacion = usePaginacionAjustada(cuentas, { altoItem: ALTO_CUENTA, anchoMinimo: 290 })

  if (cargando) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRecargar} />

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Resumen superior (incluye el aviso de caja cerrada) */}
      <div className={cn(tarjetaClass, "flex shrink-0 items-center justify-between gap-3 p-4")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className={cn("truncate text-sm font-bold sm:text-base", textoTitulo)}>Consumos pendientes por mesa</h2>
          {hayCajaAbierta ? (
            <p className={cn("truncate text-xs", textoSecundario)}>
              {cuentas.length} {cuentas.length === 1 ? "mesa con orden activa" : "mesas con órdenes activas"} listas para
              liquidar.
            </p>
          ) : (
            <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <LockKeyhole className="size-3.5 shrink-0" />
              <span className="truncate">Caja cerrada: abre un turno para registrar cobros.</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className={cn("text-[11px]", textoSecundario)}>Total por cobrar</span>
          <span className={cn("text-xl font-bold tabular-nums sm:text-2xl", textoAcento)}>
            {formatToCurrency(totalPendiente)}
          </span>
        </div>
      </div>

      {/* Grid de mesas con cuentas consolidadas: solo las que caben, el resto se pagina */}
      {cuentas.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-stone-700">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
            <Utensils className="size-6" />
          </span>
          <p className={cn("text-base font-bold", textoTitulo)}>Todas las mesas al día</p>
          <p className={cn("max-w-sm text-xs", textoSecundario)}>
            No hay comandas pendientes de cobro en este momento. Las nuevas comandas enviadas desde el POS aparecerán aquí.
          </p>
        </div>
      ) : (
        <>
          <GrillaAjustada paginacion={paginacion} etiqueta="Cuentas por mesa">
            {paginacion.visibles.map((cuenta) => (
              <li key={cuenta.mesaId} className="min-h-0">
                <CuentaMesaCard
                  cuenta={cuenta}
                  puedeCobrar={puedeCobrar && hayCajaAbierta}
                  onCobrar={() => onCobrarCuenta(cuenta)}
                />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="mesas" />
        </>
      )}
    </div>
  )
}

function CuentaMesaCard({
  cuenta,
  puedeCobrar,
  onCobrar,
}: {
  cuenta: CuentaMesa
  puedeCobrar: boolean
  onCobrar: () => void
}) {
  const visibles = cuenta.items.slice(0, MAX_ITEMS_CUENTA)
  const restantes = cuenta.items.length - visibles.length

  return (
    <article
      className={cn(
        tarjetaClass,
        "flex h-full min-w-0 flex-col gap-2.5 overflow-hidden p-4 shadow-xs transition-all hover:border-[#4C0107]/40 dark:hover:border-stone-600"
      )}
    >
      {/* Cabecera de la Mesa */}
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-stone-800">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("truncate text-lg font-bold", textoTitulo)}>{cuenta.mesaNombre}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-stone-800 dark:text-stone-300">
              {cuenta.area}
            </span>
          </div>
          <span className={cn("truncate text-xs", textoSecundario)}>
            Mozo: <strong>{cuenta.mozo}</strong> · Abierta hace {formatTranscurrido(cuenta.abiertaEn)}
          </span>
        </div>

        <span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-500/20 dark:text-purple-300">
          {cuenta.comandas.length} {cuenta.comandas.length === 1 ? "comanda" : "comandas"}
        </span>
      </div>

      {/* Consumo consolidado (RF-14) */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        <span className={textoEtiqueta}>Consumo consolidado</span>
        <ul className="flex flex-col divide-y divide-slate-100 text-xs dark:divide-stone-800">
          {visibles.map((item) => (
            <li key={`${item.productoId}-${item.precioUnitario}`} className="flex justify-between gap-2 py-1">
              <span className={cn("truncate font-medium", textoTitulo)}>
                {item.cantidad} × {item.nombre}
              </span>
              <span className={cn("shrink-0 font-semibold tabular-nums", textoTitulo)}>
                {formatToCurrency(item.cantidad * item.precioUnitario)}
              </span>
            </li>
          ))}
        </ul>
        {restantes > 0 && (
          <span className={cn("text-[11px] font-medium", textoSecundario)}>
            + {restantes} {restantes === 1 ? "producto más" : "productos más"}
          </span>
        )}
      </div>

      {/* Pie con Total y Botón de Cobro */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-2.5 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold uppercase", textoSecundario)}>Total a cobrar</span>
          <span className={cn("text-xl font-bold tabular-nums", textoAcento)}>{formatToCurrency(cuenta.total)}</span>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!puedeCobrar}
          onClick={onCobrar}
          leftIcon={<ReceiptText className="size-4" />}
          className="w-full bg-[#4C0107] text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900"
        >
          Cobrar y liberar mesa
        </Button>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                   RF-15: Historial y Auditoría de Comandas                 */
/* -------------------------------------------------------------------------- */

// Alto fijo de cada fila: permite calcular cuántas comandas caben sin scroll
const ALTO_COMANDA = 60

// Columnas de la lista: en tablet se muestran las esenciales y en escritorio amplio, todas
const columnasComanda =
  "md:grid md:items-center md:gap-3 md:grid-cols-[84px_minmax(0,1fr)_118px_88px_96px_92px] xl:grid-cols-[84px_92px_minmax(0,1fr)_124px_minmax(0,1.5fr)_92px_100px_164px]"

function SeccionHistorialComandas({
  comandas,
  conteo,
  montoCobrado,
  montoAnulado,
  busqueda,
  setBusqueda,
  estado,
  setEstado,
  cargando,
  error,
  puedeAnular,
  onRecargar,
  onVerDetalle,
  onAnularDirecto,
  onVerComprobante,
}: {
  comandas: Comanda[]
  conteo: Record<FiltroEstadoComanda, number> | Record<string, number>
  montoCobrado: number
  montoAnulado: number
  busqueda: string
  setBusqueda: (b: string) => void
  estado: FiltroEstadoComanda
  setEstado: (e: FiltroEstadoComanda) => void
  cargando: boolean
  error: string | null
  puedeAnular: boolean
  onRecargar: () => void
  onVerDetalle: (comanda: Comanda) => void
  onAnularDirecto: (comanda: Comanda) => void
  onVerComprobante: (codigo: string) => void
}) {
  // Lista de una sola columna; al cambiar búsqueda o filtro se vuelve a la primera página
  const paginacion = usePaginacionAjustada(comandas, {
    altoItem: ALTO_COMANDA,
    anchoMinimo: UNA_COLUMNA,
    gap: 0,
    clave: `${busqueda}|${estado}`,
  })

  if (cargando) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRecargar} />

  const totalComandas = (conteo.emitida ?? 0) + (conteo.cobrada ?? 0) + (conteo.anulada ?? 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* KPIs Rápidos de Auditoría */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <MetricCard label="Comandas Totales" valor={String(totalComandas)} sub="Registro inmutable" />
        <MetricCard label="Cobradas" valor={formatToCurrency(montoCobrado)} sub={`${conteo.cobrada ?? 0} tickets`} />
        <MetricCard label="Pendientes" valor={String(conteo.emitida ?? 0)} sub="En consumo" destacado />
        <MetricCard label="Anuladas" valor={formatToCurrency(montoAnulado)} sub={`${conteo.anulada ?? 0} registradas`} />
      </div>

      {/* Panel de Filtros, Búsqueda y Lista */}
      <section
        className={cn(panelClass, "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4")}
        aria-label="Historial de comandas"
      >
        <div className="flex shrink-0 flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
          {/* Buscador de Comandas */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
            <Input
              id="historial-buscar-comanda"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, mesa, mozo, comprobante o producto…"
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

          {/* Chips de filtro por estado (RF-15): se reparten el ancho sin desbordar */}
          <div className="grid shrink-0 grid-cols-4 gap-1.5 md:flex">
            {(["todas", "emitida", "cobrada", "anulada"] as FiltroEstadoComanda[]).map((est) => {
              const activo = estado === est
              const total = est === "todas" ? totalComandas : conteo[est] ?? 0
              return (
                <button
                  key={est}
                  type="button"
                  onClick={() => setEstado(est)}
                  aria-pressed={activo}
                  className={cn(
                    "inline-flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full border px-1.5 text-xs font-semibold whitespace-nowrap transition-colors md:gap-1.5 md:px-3",
                    opcionClass(activo)
                  )}
                >
                  <span className="truncate capitalize">{est === "todas" ? "Todas" : ESTADO_COMANDA_LABELS[est]}</span>
                  <span
                    className={cn(
                      "hidden shrink-0 rounded-full px-1.5 py-0.2 text-[10px] tabular-nums md:inline",
                      activo
                        ? "bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900"
                        : "bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300"
                    )}
                  >
                    {total}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de Comandas */}
        {comandas.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-stone-700">
            <SearchX className="size-6 text-slate-400 dark:text-stone-500" />
            <p className={cn("text-sm font-semibold", textoTitulo)}>No se encontraron comandas</p>
            <p className={cn("text-xs", textoSecundario)}>Intenta cambiar los términos de búsqueda o el filtro de estado.</p>
          </div>
        ) : (
          <>
            {/* Encabezado de columnas (tablet y escritorio) */}
            <div
              className={cn(
                "hidden shrink-0 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500 dark:border-stone-800 dark:text-stone-400",
                columnasComanda
              )}
            >
              <span>Comanda</span>
              <span>Mesa</span>
              <span className="hidden xl:block">Mozo</span>
              <span>Fecha / Hora</span>
              <span className="hidden xl:block">Productos</span>
              <span className="text-right">Total</span>
              <span className="text-center">Estado</span>
              <span className="text-right">Acciones</span>
            </div>

            <GrillaAjustada paginacion={paginacion} etiqueta="Comandas del historial">
              {paginacion.visibles.map((comanda) => (
                <li key={comanda.codigo} className="min-h-0">
                  <FilaComanda
                    comanda={comanda}
                    puedeAnular={puedeAnular}
                    onVerDetalle={onVerDetalle}
                    onAnularDirecto={onAnularDirecto}
                    onVerComprobante={onVerComprobante}
                  />
                </li>
              ))}
            </GrillaAjustada>
            <BarraPaginacion paginacion={paginacion} etiqueta="comandas" />
          </>
        )}
      </section>
    </div>
  )
}

function FilaComanda({
  comanda,
  puedeAnular,
  onVerDetalle,
  onAnularDirecto,
  onVerComprobante,
}: {
  comanda: Comanda
  puedeAnular: boolean
  onVerDetalle: (comanda: Comanda) => void
  onAnularDirecto: (comanda: Comanda) => void
  onVerComprobante: (codigo: string) => void
}) {
  const conf = ESTADO_COMANDA_CONFIG[comanda.estado]
  const productos = comanda.items.map((i) => `${i.cantidad} ${i.nombre}`).join(", ")
  const puedeAnularla = comanda.estado === "emitida" && puedeAnular
  const comprobante = comanda.estado === "cobrada" ? comanda.comprobante : undefined

  const badgeEstado = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        conf.badge
      )}
    >
      <span className={cn("size-1.5 rounded-full", conf.dot)} />
      {ESTADO_COMANDA_LABELS[comanda.estado]}
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
            <span className="shrink-0 font-bold text-slate-900 dark:text-stone-100">{comanda.codigo}</span>
            <span className="truncate text-slate-700 dark:text-stone-300">{comanda.mesaNombre}</span>
          </span>
          <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-stone-100">
            {formatToCurrency(comanda.total)}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {badgeEstado}
            <span className="truncate text-slate-500 dark:text-stone-400">{formatFechaHora(comanda.emitidaEn)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onVerDetalle(comanda)}
              aria-label={`Auditoría de ${comanda.codigo}`}
              className={cn(botonIcono, "text-slate-600 hover:bg-slate-200/60 dark:text-stone-300 dark:hover:bg-stone-800")}
            >
              <Eye className="size-4" />
            </button>
            {puedeAnularla && (
              <button
                type="button"
                onClick={() => onAnularDirecto(comanda)}
                aria-label={`Anular ${comanda.codigo}`}
                className={cn(botonIcono, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15")}
              >
                <Ban className="size-4" />
              </button>
            )}
            {comprobante && (
              <button
                type="button"
                onClick={() => onVerComprobante(comprobante)}
                aria-label={`Ticket de ${comanda.codigo}`}
                className={cn(botonIcono, "text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/15")}
              >
                <Receipt className="size-4" />
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Tablet y escritorio: una fila con columnas */}
      <div className={cn("hidden h-full", columnasComanda)}>
        <span className="truncate font-bold text-slate-900 dark:text-stone-100">{comanda.codigo}</span>
        <span className="truncate text-slate-700 dark:text-stone-300">{comanda.mesaNombre}</span>
        <span className="hidden truncate text-slate-600 xl:block dark:text-stone-400">{comanda.mozo}</span>
        <span className="truncate text-slate-600 dark:text-stone-400">{formatFechaHora(comanda.emitidaEn)}</span>
        <span className="hidden truncate text-slate-600 xl:block dark:text-stone-400" title={productos}>
          {productos}
        </span>
        <span className="truncate text-right font-bold tabular-nums text-slate-900 dark:text-stone-100">
          {formatToCurrency(comanda.total)}
        </span>
        <span className="text-center">{badgeEstado}</span>
        {/* Entre tablet y laptop: acciones como íconos para dar espacio a las columnas */}
        <span className="flex items-center justify-end gap-0.5 xl:hidden">
          <button
            type="button"
            onClick={() => onVerDetalle(comanda)}
            aria-label={`Auditoría de ${comanda.codigo}`}
            title="Auditoría"
            className={cn(botonIcono, "text-slate-600 hover:bg-slate-200/60 dark:text-stone-300 dark:hover:bg-stone-800")}
          >
            <Eye className="size-4" />
          </button>
          {puedeAnularla && (
            <button
              type="button"
              onClick={() => onAnularDirecto(comanda)}
              aria-label={`Anular ${comanda.codigo}`}
              title="Anular"
              className={cn(botonIcono, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15")}
            >
              <Ban className="size-4" />
            </button>
          )}
          {comprobante && (
            <button
              type="button"
              onClick={() => onVerComprobante(comprobante)}
              aria-label={`Ticket de ${comanda.codigo}`}
              title="Ticket"
              className={cn(botonIcono, "text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/15")}
            >
              <Receipt className="size-4" />
            </button>
          )}
        </span>
        <span className="hidden items-center justify-end gap-1 xl:flex">
          <button
            type="button"
            onClick={() => onVerDetalle(comanda)}
            className={cn(botonTexto, "text-slate-700 hover:bg-slate-200/60 dark:text-stone-300 dark:hover:bg-stone-800")}
          >
            Auditoría
          </button>
          {puedeAnularla && (
            <button
              type="button"
              onClick={() => onAnularDirecto(comanda)}
              className={cn(botonTexto, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15")}
            >
              Anular
            </button>
          )}
          {comprobante && (
            <button
              type="button"
              onClick={() => onVerComprobante(comprobante)}
              className={cn(botonTexto, "text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/15")}
            >
              Ticket
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

function AccesoRestringido({ rol }: { rol: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-[#E7B7BC]">
        <ShieldAlert className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className={cn("text-lg font-bold", textoTitulo)}>Acceso restringido</h1>
        <p className={cn("max-w-sm text-sm", textoSecundario)}>
          Tu rol actual <span className={cn("font-semibold", textoTitulo)}>{rol}</span> no tiene permisos
          para gestionar transacciones o turnos de caja.
        </p>
      </div>
    </div>
  )
}

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
