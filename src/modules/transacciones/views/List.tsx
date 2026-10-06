"use client"

import * as React from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  Clock,
  Coins,
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

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
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

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Encabezado del Módulo y Switch de Pestañas Funcionales */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className={cn("text-2xl font-bold tracking-tight", textoTitulo)}>
            Transacciones y Cajas
          </h1>
          <p className={cn("text-sm", textoSecundario)}>
            Apertura y cierre de turnos, liquidación de mesas y auditoría inmutable de comandas.
          </p>
        </div>

        {/* Pestañas: RF-13 (Cajas), RF-14 (Cuentas por Mesa), RF-15 (Historial) */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-full bg-[#EDE5E6]/60 p-1 dark:bg-stone-800 no-scrollbar">
          <button
            type="button"
            id="transacciones-tab-cajas"
            onClick={() => setPestanaActiva("cajas")}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              pestanaClass(pestanaActiva === "cajas")
            )}
          >
            <Coins className="size-3.5" />
            Turno de Caja
            {turnoActivo && (
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            id="transacciones-tab-cuentas"
            onClick={() => setPestanaActiva("cuentas")}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              pestanaClass(pestanaActiva === "cuentas")
            )}
          >
            <Utensils className="size-3.5" />
            Cuentas por Mesa
            {cuentas.length > 0 && (
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] dark:bg-white/20">
                {cuentas.length}
              </span>
            )}
          </button>

          <button
            type="button"
            id="transacciones-tab-historial"
            onClick={() => setPestanaActiva("historial")}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              pestanaClass(pestanaActiva === "historial")
            )}
          >
            <History className="size-3.5" />
            Historial de Comandas
          </button>
        </div>
      </div>

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
  if (cargando) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRecargar} />

  const ultimoCerrado = turnosCerrados[0]

  return (
    <div className="flex flex-col gap-6">
      {/* Si NO hay turno activo: Formulario de Apertura */}
      {!turnoActivo ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <AperturaCajaForm
            cajero="Jomar Peralta"
            ultimoTurno={ultimoCerrado}
            puedeAbrir={puedeAbrirCerrar}
            onAbrir={onAbrir}
          />

          {/* Historial rápido de cierres previos */}
          <section className={cn(panelClass, "flex flex-col gap-4 p-5")} aria-label="Historial de turnos anteriores">
            <div className="flex items-center justify-between">
              <h3 className={cn("text-sm font-bold", textoTitulo)}>Turnos anteriores</h3>
              <span className={cn("text-xs", textoSecundario)}>
                {turnosCerrados.length} cerrados
              </span>
            </div>
            {turnosCerrados.length === 0 ? (
              <p className={cn("text-xs", textoSecundario)}>No hay turnos archivados.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
                {turnosCerrados.slice(0, 5).map((turno) => (
                  <TurnoItem key={turno.id} turno={turno} />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        /* Turno ABIERTO: Tablero en tiempo real con arqueo, entradas/salidas y botón de arqueo */
        <div className="flex flex-col gap-6">
          {/* Tarjeta Superior: Estado del Turno y KPIs */}
          <div className={cn(tarjetaClass, "flex flex-col gap-5 p-5 lg:p-6")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <LockKeyholeOpen className="size-6" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className={cn("text-lg font-bold", textoTitulo)}>
                      Turno {turnoActivo.codigo}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Abierto
                    </span>
                  </div>
                  <p className={cn("text-xs", textoSecundario)}>
                    Responsable: <strong>{turnoActivo.cajero}</strong> · Abierto hace{" "}
                    <strong>{formatTranscurrido(turnoActivo.abiertoEn)}</strong> ({formatHora(turnoActivo.abiertoEn)})
                  </p>
                </div>
              </div>

              {/* Botones de acción del turno: Entradas, Salidas y Arqueo/Cierre */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  id="caja-btn-entrada"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAbrirMovimiento("ingreso")}
                  leftIcon={<ArrowDownCircle className="size-4" />}
                  className={botonSecundarioClass}
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
                  className={botonSecundarioClass}
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
                  className="bg-[#4C0107] text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900"
                >
                  Arqueo y Cierre
                </Button>
              </div>
            </div>

            {/* Grid de Métricas Financieras del Turno Actual */}
            {resumen && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                <MetricCard
                  label="Fondo Inicial"
                  valor={formatToCurrency(turnoActivo.montoInicial)}
                  sub={turnoActivo.notaApertura || "Efectivo de apertura"}
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
            )}
          </div>

          {/* Registro en vivo de movimientos del turno */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section
              className={cn(panelClass, "flex flex-col gap-4 p-5")}
              aria-label="Movimientos del turno de caja"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <h3 className={cn("text-base font-bold", textoTitulo)}>
                    Movimientos del turno
                  </h3>
                  <p className={cn("text-xs", textoSecundario)}>
                    Cobros de cuentas, entradas de sencillo y egresos registrados.
                  </p>
                </div>
                <span className={cn("rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold dark:bg-stone-800", textoSecundario)}>
                  {turnoActivo.movimientos.length} operaciones
                </span>
              </div>

              {turnoActivo.movimientos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-stone-700">
                  <Coins className="size-6 text-slate-400 dark:text-stone-500" />
                  <p className={cn("text-sm font-semibold", textoTitulo)}>Sin movimientos aún</p>
                  <p className={cn("text-xs", textoSecundario)}>
                    Al cobrar cuentas o registrar entradas/salidas se listarán en tiempo real.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
                  {[...turnoActivo.movimientos]
                    .reverse()
                    .map((mov) => (
                      <MovimientoItem key={mov.id} movimiento={mov} />
                    ))}
                </ul>
              )}
            </section>

            {/* Turnos Cerrados Archivados */}
            <section className={cn(panelClass, "flex flex-col gap-4 p-5")} aria-label="Turnos anteriores">
              <h3 className={cn("text-sm font-bold", textoTitulo)}>Turnos archivados</h3>
              {turnosCerrados.length === 0 ? (
                <p className={cn("text-xs", textoSecundario)}>No hay turnos previos registrados.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
                  {turnosCerrados.slice(0, 4).map((turno) => (
                    <TurnoItem key={turno.id} turno={turno} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
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
        "flex flex-col gap-1 rounded-2xl border p-3.5 transition-colors",
        destacado
          ? "border-[#4C0107]/30 bg-[#EDE5E6]/40 dark:border-[#E7B7BC]/30 dark:bg-stone-800/80"
          : "border-slate-100 bg-slate-50/70 dark:border-stone-800 dark:bg-stone-900"
      )}
    >
      <span className={textoEtiqueta}>{label}</span>
      <span
        className={cn(
          "text-lg font-bold tabular-nums tracking-tight",
          destacado ? textoAcento : textoTitulo
        )}
      >
        {valor}
      </span>
      {sub && <span className={cn("truncate text-[11px]", textoSecundario)}>{sub}</span>}
    </div>
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
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", colorIcono)}>
          <Icono className="size-4" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className={cn("truncate font-semibold", textoTitulo)}>
            {movimiento.concepto}
          </span>
          <span className={cn("text-xs", textoSecundario)}>
            {formatHora(movimiento.registradoEn)} · {METODO_PAGO_LABELS[movimiento.metodoPago]} · Por{" "}
            {movimiento.registradoPor}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <span
          className={cn(
            "font-bold tabular-nums",
            esVenta || esIngreso ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {signo} {formatToCurrency(movimiento.monto)}
        </span>
        {movimiento.referencia && (
          <span className={cn("text-[11px] font-mono", textoSecundario)}>
            {movimiento.referencia}
          </span>
        )}
      </div>
    </li>
  )
}

function TurnoItem({ turno }: { turno: TurnoCaja }) {
  const arqueo = turno.arqueo
  const resultadoConf = arqueo ? RESULTADO_ARQUEO_CONFIG[arqueo.resultado] : null

  return (
    <li className="flex flex-col gap-1 py-3 text-xs">
      <div className="flex items-center justify-between">
        <span className={cn("font-bold text-sm", textoTitulo)}>{turno.codigo}</span>
        {arqueo && resultadoConf && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", resultadoConf.badge)}>
            {RESULTADO_ARQUEO_LABELS[arqueo.resultado]}
          </span>
        )}
      </div>
      <div className={cn("flex items-center justify-between", textoSecundario)}>
        <span>{formatFechaHora(turno.abiertoEn)}</span>
        <span>Cajero: {turno.cajero}</span>
      </div>
      {arqueo && (
        <div className="flex items-center justify-between pt-1">
          <span className={textoSecundario}>Arqueo contado:</span>
          <span className={cn("font-semibold tabular-nums", textoTitulo)}>
            {formatToCurrency(arqueo.efectivoContado)}
          </span>
        </div>
      )}
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-14: Cobro y Cierre de Cuentas por Mesa                  */
/* -------------------------------------------------------------------------- */

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
  if (cargando) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRecargar} />

  return (
    <div className="flex flex-col gap-6">
      {/* Banner de Estado de Caja si está cerrada */}
      {!hayCajaAbierta && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <LockKeyhole className="size-5 shrink-0" />
            <div className="flex flex-col text-xs sm:text-sm">
              <span className="font-bold">No hay un turno de caja abierto</span>
              <span>Debes abrir la caja antes de registrar cobros y emitir comprobantes internos.</span>
            </div>
          </div>
        </div>
      )}

      {/* Resumen Superior */}
      <div className={cn(tarjetaClass, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
        <div className="flex flex-col gap-0.5">
          <h2 className={cn("text-base font-bold", textoTitulo)}>
            Consumos pendientes por mesa
          </h2>
          <p className={cn("text-xs", textoSecundario)}>
            {cuentas.length} {cuentas.length === 1 ? "mesa con orden activa" : "mesas con órdenes activas"} listas para liquidar.
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-xs", textoSecundario)}>Total por cobrar:</span>
          <span className={cn("text-2xl font-bold tabular-nums", textoAcento)}>
            {formatToCurrency(totalPendiente)}
          </span>
        </div>
      </div>

      {/* Grid de Mesas con Cuentas Consolidadas */}
      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-stone-700">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
            <Utensils className="size-6" />
          </span>
          <p className={cn("text-base font-bold", textoTitulo)}>Todas las mesas al día</p>
          <p className={cn("max-w-sm text-xs", textoSecundario)}>
            No hay comandas pendientes de cobro en este momento. Las nuevas comandas enviadas desde el POS aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cuentas.map((cuenta) => (
            <CuentaMesaCard
              key={cuenta.mesaId}
              cuenta={cuenta}
              puedeCobrar={puedeCobrar && hayCajaAbierta}
              onCobrar={() => onCobrarCuenta(cuenta)}
            />
          ))}
        </div>
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
  return (
    <div
      className={cn(
        tarjetaClass,
        "flex flex-col justify-between gap-4 p-5 hover:border-[#4C0107]/40 dark:hover:border-stone-600 transition-all shadow-xs"
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Cabecera de la Mesa */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold", textoTitulo)}>{cuenta.mesaNombre}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-stone-800 dark:text-stone-300">
                {cuenta.area}
              </span>
            </div>
            <span className={cn("text-xs", textoSecundario)}>
              Mozo: <strong>{cuenta.mozo}</strong> · Abierta hace {formatTranscurrido(cuenta.abiertaEn)}
            </span>
          </div>

          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-500/20 dark:text-purple-300">
            {cuenta.comandas.length} {cuenta.comandas.length === 1 ? "comanda" : "comandas"}
          </span>
        </div>

        {/* Consumo consolidado (RF-14) */}
        <div className="flex flex-col gap-1.5">
          <span className={textoEtiqueta}>Consumo consolidado</span>
          <ul className="flex flex-col divide-y divide-slate-100 text-xs dark:divide-stone-800">
            {cuenta.items.map((item) => (
              <li key={`${item.productoId}-${item.precioUnitario}`} className="flex justify-between py-1.5">
                <span className={cn("truncate font-medium", textoTitulo)}>
                  {item.cantidad} × {item.nombre}
                </span>
                <span className={cn("font-semibold tabular-nums shrink-0", textoTitulo)}>
                  {formatToCurrency(item.cantidad * item.precioUnitario)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pie con Total y Botón de Cobro */}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold uppercase", textoSecundario)}>Total a cobrar</span>
          <span className={cn("text-2xl font-bold tabular-nums", textoAcento)}>
            {formatToCurrency(cuenta.total)}
          </span>
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
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                   RF-15: Historial y Auditoría de Comandas                 */
/* -------------------------------------------------------------------------- */

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
  if (cargando) return <TransaccionesSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRecargar} />

  const totalComandas = (conteo.emitida ?? 0) + (conteo.cobrada ?? 0) + (conteo.anulada ?? 0)

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs Rápidos de Auditoría */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Comandas Totales" valor={String(totalComandas)} sub="Registro inmutable" />
        <MetricCard label="Cobradas" valor={formatToCurrency(montoCobrado)} sub={`${conteo.cobrada ?? 0} tickets`} />
        <MetricCard label="Pendientes" valor={String(conteo.emitida ?? 0)} sub="En consumo" destacado />
        <MetricCard label="Anuladas" valor={formatToCurrency(montoAnulado)} sub={`${conteo.anulada ?? 0} registradas`} />
      </div>

      {/* Panel de Filtros y Búsqueda */}
      <section className={cn(panelClass, "flex flex-col gap-4 p-5")} aria-label="Historial de comandas">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Buscador de Comandas */}
          <div className="relative flex-1">
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

          {/* Chips de filtro por estado (RF-15) */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {(["todas", "emitida", "cobrada", "anulada"] as FiltroEstadoComanda[]).map((est) => {
              const activo = estado === est
              const total = est === "todas" ? totalComandas : conteo[est] ?? 0
              return (
                <button
                  key={est}
                  type="button"
                  onClick={() => setEstado(est)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
                    opcionClass(activo)
                  )}
                >
                  <span className="capitalize">
                    {est === "todas" ? "Todas" : ESTADO_COMANDA_LABELS[est]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums",
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
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-stone-700">
            <SearchX className="size-6 text-slate-400 dark:text-stone-500" />
            <p className={cn("text-sm font-semibold", textoTitulo)}>No se encontraron comandas</p>
            <p className={cn("text-xs", textoSecundario)}>
              Intenta cambiar los términos de búsqueda o el filtro de estado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="pb-3 font-semibold">Comanda</th>
                  <th className="pb-3 font-semibold">Mesa</th>
                  <th className="pb-3 font-semibold">Mozo</th>
                  <th className="pb-3 font-semibold">Fecha / Hora</th>
                  <th className="pb-3 font-semibold">Productos</th>
                  <th className="pb-3 font-semibold text-right">Total</th>
                  <th className="pb-3 font-semibold text-center">Estado</th>
                  <th className="pb-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-stone-800/80">
                {comandas.map((comanda) => {
                  const conf = ESTADO_COMANDA_CONFIG[comanda.estado]
                  return (
                    <tr
                      key={comanda.codigo}
                      className="hover:bg-slate-100/50 dark:hover:bg-stone-900/60 transition-colors"
                    >
                      <td className="py-3 font-bold text-slate-900 dark:text-stone-100">
                        {comanda.codigo}
                      </td>
                      <td className="py-3 text-slate-700 dark:text-stone-300">
                        {comanda.mesaNombre}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-stone-400">
                        {comanda.mozo}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-stone-400">
                        {formatFechaHora(comanda.emitidaEn)}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-stone-400 max-w-xs truncate">
                        {comanda.items.map((i) => `${i.cantidad} ${i.nombre}`).join(", ")}
                      </td>
                      <td className="py-3 text-right font-bold tabular-nums text-slate-900 dark:text-stone-100">
                        {formatToCurrency(comanda.total)}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                            conf.badge
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", conf.dot)} />
                          {ESTADO_COMANDA_LABELS[comanda.estado]}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onVerDetalle(comanda)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 dark:text-stone-300 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                          >
                            Auditoría
                          </button>
                          {comanda.estado === "emitida" && puedeAnular && (
                            <button
                              type="button"
                              onClick={() => onAnularDirecto(comanda)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15 transition-colors cursor-pointer"
                            >
                              Anular
                            </button>
                          )}
                          {comanda.estado === "cobrada" && comanda.comprobante && (
                            <button
                              type="button"
                              onClick={() => onVerComprobante(comanda.comprobante!)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/15 transition-colors cursor-pointer"
                            >
                              Ticket
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
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
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl dark:bg-stone-800" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl dark:bg-stone-800" />
    </div>
  )
}
