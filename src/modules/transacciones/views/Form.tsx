"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  Calculator,
  LockKeyhole,
  Printer,
  Unlock,
  X,
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/utils/cn"
import { formatToCurrency } from "@/shared/utils/formatters"

import { useCobroCuenta } from "../hooks"
import {
  ACCION_AUDITORIA_CONFIG,
  BILLETES_SUGERIDOS,
  ESTADO_COMANDA_CONFIG,
  METODO_PAGO_AYUDA,
  METODO_PAGO_ICONS,
  RESULTADO_ARQUEO_CONFIG,
  botonPeligroClass,
  botonSecundarioClass,
  formatFechaHora,
  formatHora,
  formatTranscurrido,
  mensajeErrorClass,
  opcionClass,
  tarjetaClass,
  textoAcento,
  textoCuerpo,
  textoEtiqueta,
  textoSecundario,
  textoTitulo,
} from "../components"
import {
  ACCION_AUDITORIA_LABELS,
  DENOMINACIONES,
  ESTADO_COMANDA_LABELS,
  METODO_PAGO_LABELS,
  RESULTADO_ARQUEO_LABELS,
  TIPO_MOVIMIENTO_LABELS,
  anulacionSchema,
  aperturaCajaSchema,
  calcularEfectivoContado,
  crearCierreCajaSchema,
  crearCobroCuentaSchema,
  crearMovimientoSchema,
  desglosarIgv,
  metodoPagoSchema,
  obtenerResultadoArqueo,
  redondear,
  tipoMovimientoSchema,
  type AnulacionValues,
  type AperturaCajaValues,
  type CierreCajaValues,
  type CobroCuentaValues,
  type Comanda,
  type ComprobanteInterno,
  type CuentaMesa,
  type MovimientoValues,
  type ResumenTurno,
  type TipoMovimiento,
  type TurnoCaja,
} from "../schema"

const errorMensaje = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto)

/* -------------------------------------------------------------------------- */
/*                              Estructura de modal                           */
/* -------------------------------------------------------------------------- */

function ModalShell({
  titulo,
  subtitulo,
  icono,
  ancho = "max-w-md",
  bloqueado = false,
  onClose,
  children,
}: {
  titulo: string
  subtitulo?: React.ReactNode
  icono?: React.ReactNode
  ancho?: string
  bloqueado?: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()

  // Cierre con Escape y foco inicial dentro del modal
  React.useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bloqueado) onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, bloqueado])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={() => !bloqueado && onClose()}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900",
          ancho
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex items-start gap-3">
            {icono && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-[#E7B7BC]">
                {icono}
              </span>
            )}
            <div className="flex flex-col gap-0.5">
              <h2 id={tituloId} className={cn("text-lg font-bold", textoTitulo)}>
                {titulo}
              </h2>
              {subtitulo && <p className={cn("text-xs", textoSecundario)}>{subtitulo}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={bloqueado}
            aria-label="Cerrar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CampoError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null
  return <span className="text-xs font-medium text-red-600 dark:text-red-400">{mensaje}</span>
}

function PieAcciones({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 border-t border-slate-100 p-5 dark:border-stone-800">{children}</div>
}

/* -------------------------------------------------------------------------- */
/*                    RF-13: Apertura de turno de caja                        */
/* -------------------------------------------------------------------------- */

const FONDOS_SUGERIDOS = [100, 150, 200, 300] as const

export function AperturaCajaForm({
  cajero,
  ultimoTurno,
  puedeAbrir,
  onAbrir,
}: {
  cajero: string
  ultimoTurno?: TurnoCaja
  puedeAbrir: boolean
  onAbrir: (montoInicial: number, nota?: string) => Promise<unknown>
}) {
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AperturaCajaValues>({
    resolver: zodResolver(aperturaCajaSchema),
    defaultValues: { montoInicial: "", notaApertura: "" },
  })

  const monto = useWatch({ control, name: "montoInicial" })

  const onSubmit = async (values: AperturaCajaValues) => {
    setErrorGeneral(null)
    try {
      await onAbrir(Number(values.montoInicial), values.notaApertura?.trim() || undefined)
    } catch (e) {
      setErrorGeneral(errorMensaje(e, "No se pudo abrir la caja."))
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn(tarjetaClass, "flex flex-col gap-5 p-5 lg:p-6")}
      aria-label="Apertura de turno de caja"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#4C0107] text-white dark:bg-[#E7B7BC] dark:text-stone-900">
          <Unlock className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className={cn("text-lg font-bold", textoTitulo)}>Apertura de caja</h2>
          <p className={cn("text-sm", textoSecundario)}>
            Registra el fondo inicial en efectivo para comenzar a cobrar cuentas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-100/70 px-4 py-3 dark:bg-stone-800">
          <span className={cn("block text-xs", textoSecundario)}>Cajero responsable</span>
          <span className={cn("font-semibold", textoTitulo)}>{cajero}</span>
        </div>
        <div className="rounded-xl bg-slate-100/70 px-4 py-3 dark:bg-stone-800">
          <span className={cn("block text-xs", textoSecundario)}>Último cierre</span>
          <span className={cn("font-semibold", textoTitulo)}>
            {ultimoTurno?.cerradoEn
              ? `${formatFechaHora(ultimoTurno.cerradoEn)} · ${formatToCurrency(ultimoTurno.arqueo?.efectivoContado ?? 0)}`
              : "Sin registros"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="caja-monto-inicial" className={textoEtiqueta}>
          Monto inicial en efectivo
        </label>
        <Input
          id="caja-monto-inicial"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.10"
          placeholder="0.00"
          disabled={!puedeAbrir}
          state={errors.montoInicial ? "error" : "default"}
          className="h-12 rounded-xl text-base tabular-nums"
          {...register("montoInicial")}
        />
        <CampoError mensaje={errors.montoInicial?.message} />
        <div className="flex flex-wrap gap-2 pt-1">
          {FONDOS_SUGERIDOS.map((fondo) => (
            <button
              key={fondo}
              type="button"
              disabled={!puedeAbrir}
              onClick={() => setValue("montoInicial", String(fondo), { shouldValidate: true })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                opcionClass(Number(monto) === fondo)
              )}
            >
              S/ {fondo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="caja-nota-apertura" className={textoEtiqueta}>
          Nota de apertura <span className="font-normal normal-case tracking-normal">(opcional)</span>
        </label>
        <Input
          id="caja-nota-apertura"
          placeholder="Ej. Fondo entregado por administración"
          maxLength={120}
          autoComplete="off"
          disabled={!puedeAbrir}
          className="h-11 rounded-xl"
          {...register("notaApertura")}
        />
        <CampoError mensaje={errors.notaApertura?.message} />
      </div>

      {errorGeneral && (
        <p role="alert" className={mensajeErrorClass}>
          {errorGeneral}
        </p>
      )}

      <Button
        id="caja-abrir-turno"
        type="submit"
        loading={isSubmitting}
        disabled={!puedeAbrir}
        leftIcon={<Unlock className="size-4" />}
        className="w-full"
      >
        Abrir turno de caja
      </Button>
      {!puedeAbrir && (
        <p className={cn("text-center text-xs", textoSecundario)}>
          Tu rol no tiene permiso para abrir la caja.
        </p>
      )}
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*                  RF-13: Entradas y salidas de dinero                       */
/* -------------------------------------------------------------------------- */

export function MovimientoCajaForm({
  tipoInicial,
  efectivoDisponible,
  onClose,
  onRegistrar,
}: {
  tipoInicial: TipoMovimiento
  efectivoDisponible: number
  onClose: () => void
  onRegistrar: (tipo: TipoMovimiento, concepto: string, monto: number) => Promise<unknown>
}) {
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null)
  const schema = React.useMemo(() => crearMovimientoSchema(efectivoDisponible), [efectivoDisponible])
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MovimientoValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: tipoInicial, concepto: "", monto: "" },
  })
  const tipo = useWatch({ control, name: "tipo" })

  const onSubmit = async (values: MovimientoValues) => {
    setErrorGeneral(null)
    try {
      await onRegistrar(values.tipo, values.concepto.trim(), Number(values.monto))
      onClose()
    } catch (e) {
      setErrorGeneral(errorMensaje(e, "No se pudo registrar el movimiento."))
    }
  }

  return (
    <ModalShell
      titulo="Movimiento de caja"
      subtitulo={`Efectivo disponible: ${formatToCurrency(efectivoDisponible)}`}
      icono={tipo === "ingreso" ? <ArrowDownCircle className="size-5" /> : <ArrowUpCircle className="size-5" />}
      bloqueado={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
            {tipoMovimientoSchema.options.map((opcion) => {
              const Icono = opcion === "ingreso" ? ArrowDownCircle : ArrowUpCircle
              const activo = tipo === opcion
              return (
                <button
                  key={opcion}
                  id={`caja-movimiento-${opcion}`}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setValue("tipo", opcion, { shouldValidate: true })}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-full border text-xs font-semibold transition-colors cursor-pointer",
                    opcionClass(activo)
                  )}
                >
                  <Icono className="size-4" />
                  {TIPO_MOVIMIENTO_LABELS[opcion]}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="caja-movimiento-concepto" className={textoEtiqueta}>
              Concepto
            </label>
            <Input
              id="caja-movimiento-concepto"
              placeholder={tipo === "ingreso" ? "Ej. Reposición de sencillo" : "Ej. Compra de insumos"}
              maxLength={80}
              autoComplete="off"
              state={errors.concepto ? "error" : "default"}
              className="h-11 rounded-xl"
              {...register("concepto")}
            />
            <CampoError mensaje={errors.concepto?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="caja-movimiento-monto" className={textoEtiqueta}>
              Monto (efectivo)
            </label>
            <Input
              id="caja-movimiento-monto"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.10"
              placeholder="0.00"
              state={errors.monto ? "error" : "default"}
              className="h-11 rounded-xl tabular-nums"
              {...register("monto")}
            />
            <CampoError mensaje={errors.monto?.message} />
          </div>

          {errorGeneral && (
            <p role="alert" className={mensajeErrorClass}>
              {errorGeneral}
            </p>
          )}
        </div>

        <PieAcciones>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn("flex-1", botonSecundarioClass)}
          >
            Cancelar
          </Button>
          <Button id="caja-movimiento-guardar" type="submit" size="sm" loading={isSubmitting} className="flex-[2]">
            Registrar {tipo === "ingreso" ? "entrada" : "salida"}
          </Button>
        </PieAcciones>
      </form>
    </ModalShell>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-13: Arqueo y cierre del turno de caja                   */
/* -------------------------------------------------------------------------- */

export function CierreCajaForm({
  turno,
  resumen,
  onClose,
  onCerrar,
}: {
  turno: TurnoCaja
  resumen: ResumenTurno
  onClose: () => void
  onCerrar: (conteo: Record<string, number>, observaciones?: string) => Promise<TurnoCaja>
}) {
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null)
  const [turnoCerrado, setTurnoCerrado] = React.useState<TurnoCaja | null>(null)
  const schema = React.useMemo(() => crearCierreCajaSchema(resumen.efectivoEsperado), [resumen.efectivoEsperado])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CierreCajaValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      conteo: Object.fromEntries(DENOMINACIONES.map((d) => [d.clave, ""])),
      observaciones: "",
    },
  })

  const conteo = useWatch({ control, name: "conteo" })
  const contado = calcularEfectivoContado(conteo ?? {})
  const diferencia = redondear(contado - resumen.efectivoEsperado)
  const resultado = obtenerResultadoArqueo(diferencia)
  const resultadoConf = RESULTADO_ARQUEO_CONFIG[resultado]

  const onSubmit = async (values: CierreCajaValues) => {
    setErrorGeneral(null)
    try {
      const conteoNumerico = Object.fromEntries(
        DENOMINACIONES.map((d) => [d.clave, Number(values.conteo[d.clave]) || 0])
      )
      const cerrado = await onCerrar(conteoNumerico, values.observaciones?.trim() || undefined)
      setTurnoCerrado(cerrado)
    } catch (e) {
      setErrorGeneral(errorMensaje(e, "No se pudo cerrar la caja."))
    }
  }

  if (turnoCerrado?.arqueo) {
    const conf = RESULTADO_ARQUEO_CONFIG[turnoCerrado.arqueo.resultado]
    return (
      <ModalShell titulo="Caja cerrada" subtitulo={turnoCerrado.codigo} icono={<LockKeyhole className="size-5" />} onClose={onClose}>
        <div className="flex flex-col gap-5 overflow-y-auto p-5" aria-live="polite">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", conf.badge)}>
              {RESULTADO_ARQUEO_LABELS[turnoCerrado.arqueo.resultado]}
            </span>
            <p className={cn("text-sm", textoCuerpo)}>
              El turno se cerró a las {formatHora(turnoCerrado.cerradoEn!)} tras{" "}
              {formatTranscurrido(turnoCerrado.abiertoEn, turnoCerrado.cerradoEn!)} de operación.
            </p>
          </div>
          <ResumenFilas
            filas={[
              { label: "Efectivo esperado", valor: formatToCurrency(turnoCerrado.arqueo.efectivoEsperado) },
              { label: "Efectivo contado", valor: formatToCurrency(turnoCerrado.arqueo.efectivoContado) },
              {
                label: "Diferencia",
                valor: formatToCurrency(turnoCerrado.arqueo.diferencia),
                className: conf.texto,
              },
              { label: "Ventas totales", valor: formatToCurrency(resumen.ventasTotales) },
            ]}
          />
        </div>
        <PieAcciones>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="size-4" />}
            className={cn("flex-1", botonSecundarioClass)}
          >
            Imprimir
          </Button>
          <Button type="button" size="sm" onClick={onClose} className="flex-[2]">
            Finalizar
          </Button>
        </PieAcciones>
      </ModalShell>
    )
  }

  return (
    <ModalShell
      titulo="Arqueo y cierre de caja"
      subtitulo={`${turno.codigo} · Abierto hace ${formatTranscurrido(turno.abiertoEn)}`}
      icono={<Calculator className="size-5" />}
      ancho="max-w-3xl"
      bloqueado={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_280px]">
          {/* Conteo físico por denominación */}
          <fieldset className="flex flex-col gap-3">
            <legend className={cn("mb-3", textoEtiqueta)}>Conteo de efectivo</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DENOMINACIONES.map((d) => {
                const cantidad = Number(conteo?.[d.clave]) || 0
                return (
                  <label
                    key={d.clave}
                    htmlFor={`caja-conteo-${d.clave}`}
                    className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-stone-700 dark:bg-stone-950/60"
                  >
                    <span className="flex items-center justify-between text-xs">
                      <span className={cn("font-semibold", textoTitulo)}>
                        S/ {d.valor < 1 ? d.valor.toFixed(2) : d.valor}
                      </span>
                      <span className={cn("capitalize", textoSecundario)}>{d.tipo}</span>
                    </span>
                    <input
                      id={`caja-conteo-${d.clave}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="0"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm tabular-nums text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-600 focus:bg-white dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-300"
                      {...register(`conteo.${d.clave}`)}
                    />
                    <span className={cn("text-right text-[11px] tabular-nums", textoSecundario)}>
                      {formatToCurrency(cantidad * d.valor)}
                    </span>
                  </label>
                )
              })}
            </div>
            <CampoError mensaje={errors.conteo?.message} />
          </fieldset>

          {/* Cálculo automático de diferencias */}
          <div className="flex flex-col gap-3">
            <span className={textoEtiqueta}>Resumen del turno</span>
            <ResumenFilas
              filas={[
                { label: "Fondo inicial", valor: formatToCurrency(turno.montoInicial) },
                { label: "Ventas en efectivo", valor: formatToCurrency(resumen.ventasEfectivo) },
                { label: "Entradas de dinero", valor: `+ ${formatToCurrency(resumen.ingresos)}` },
                { label: "Salidas de dinero", valor: `- ${formatToCurrency(resumen.egresos)}` },
              ]}
            />
            <ResumenFilas
              filas={[
                { label: "Tarjeta (no se cuenta)", valor: formatToCurrency(resumen.ventasTarjeta) },
                { label: "Billetera (no se cuenta)", valor: formatToCurrency(resumen.ventasBilletera) },
              ]}
            />

            <div className="flex flex-col gap-2 rounded-2xl bg-slate-100 p-4 dark:bg-stone-800">
              <div className="flex items-center justify-between text-sm">
                <span className={textoCuerpo}>Esperado en caja</span>
                <span className={cn("font-semibold tabular-nums", textoTitulo)}>
                  {formatToCurrency(resumen.efectivoEsperado)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={textoCuerpo}>Contado</span>
                <span className={cn("font-semibold tabular-nums", textoTitulo)}>{formatToCurrency(contado)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-stone-700">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", resultadoConf.badge)}>
                  {RESULTADO_ARQUEO_LABELS[resultado]}
                </span>
                <span className={cn("text-xl font-bold tabular-nums", resultadoConf.texto)} aria-live="polite">
                  {diferencia > 0 ? "+" : ""}
                  {formatToCurrency(diferencia)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="caja-observaciones" className={textoEtiqueta}>
                Observaciones{" "}
                {diferencia === 0 && <span className="font-normal normal-case tracking-normal">(opcional)</span>}
              </label>
              <textarea
                id="caja-observaciones"
                rows={3}
                maxLength={160}
                placeholder={diferencia === 0 ? "Notas del cierre" : "Explica el motivo de la diferencia"}
                className={cn(
                  "w-full resize-none rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20",
                  "dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:bg-stone-900 dark:focus:ring-white/10",
                  errors.observaciones
                    ? "border-red-500"
                    : "border-slate-300 focus:border-slate-600 dark:border-stone-700 dark:focus:border-stone-300"
                )}
                {...register("observaciones")}
              />
              <CampoError mensaje={errors.observaciones?.message} />
            </div>

            {errorGeneral && (
              <p role="alert" className={mensajeErrorClass}>
                {errorGeneral}
              </p>
            )}
          </div>
        </div>

        <PieAcciones>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn("flex-1", botonSecundarioClass)}
          >
            Cancelar
          </Button>
          <Button
            id="caja-confirmar-cierre"
            type="submit"
            size="sm"
            loading={isSubmitting}
            leftIcon={<LockKeyhole className="size-4" />}
            className="flex-[2]"
          >
            Cerrar caja con {formatToCurrency(contado)}
          </Button>
        </PieAcciones>
      </form>
    </ModalShell>
  )
}

function ResumenFilas({ filas }: { filas: { label: string; valor: string; className?: string }[] }) {
  return (
    <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 dark:divide-stone-800 dark:border-stone-800">
      {filas.map((fila) => (
        <li key={fila.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className={textoSecundario}>{fila.label}</span>
          <span className={cn("font-semibold tabular-nums", fila.className ?? textoTitulo)}>{fila.valor}</span>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/*               RF-14: Cobro y cierre de la cuenta de una mesa               */
/* -------------------------------------------------------------------------- */

export function CobroCuentaForm({
  cuenta,
  onClose,
  onCobrado,
}: {
  cuenta: CuentaMesa
  onClose: () => void
  onCobrado: (comprobante: ComprobanteInterno) => void
}) {
  const { cobrar, isSubmitting, error, setError } = useCobroCuenta()
  const schema = React.useMemo(() => crearCobroCuentaSchema(cuenta.total), [cuenta.total])
  const { subtotal, igv, total } = desglosarIgv(cuenta.total)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CobroCuentaValues>({
    resolver: zodResolver(schema),
    defaultValues: { metodoPago: "efectivo", montoRecibido: "", referenciaPago: "" },
  })

  const metodoPago = useWatch({ control, name: "metodoPago" })
  const montoRecibido = useWatch({ control, name: "montoRecibido" })
  const montoNum = montoRecibido === "" || montoRecibido === undefined ? undefined : Number(montoRecibido)
  const vuelto = montoNum !== undefined && !Number.isNaN(montoNum) ? Math.max(montoNum - total, 0) : 0

  const onSubmit = async (values: CobroCuentaValues) => {
    const comprobante = await cobrar({
      mesaId: cuenta.mesaId,
      metodoPago: values.metodoPago,
      montoRecibido: values.metodoPago === "efectivo" ? Number(values.montoRecibido) : undefined,
      referenciaPago: values.metodoPago !== "efectivo" ? values.referenciaPago?.trim() || undefined : undefined,
    })
    if (comprobante) onCobrado(comprobante)
  }

  return (
    <ModalShell
      titulo={`Cobrar ${cuenta.mesaNombre}`}
      subtitulo={`${cuenta.area} · Mozo: ${cuenta.mozo} · ${cuenta.comandas.length} ${cuenta.comandas.length === 1 ? "comanda" : "comandas"
        }`}
      ancho="max-w-2xl"
      bloqueado={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          {/* Consumos consolidados */}
          <div className="flex flex-col gap-3">
            <span className={textoEtiqueta}>Consumo consolidado</span>
            <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 dark:divide-stone-800 dark:border-stone-800">
              {cuenta.items.map((item) => (
                <li key={`${item.productoId}-${item.precioUnitario}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="flex min-w-0 flex-col">
                    <span className={cn("truncate font-medium", textoTitulo)}>{item.nombre}</span>
                    <span className={cn("text-xs tabular-nums", textoSecundario)}>
                      {item.cantidad} × {formatToCurrency(item.precioUnitario)}
                    </span>
                  </div>
                  <span className={cn("font-semibold tabular-nums", textoTitulo)}>
                    {formatToCurrency(item.cantidad * item.precioUnitario)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              {cuenta.comandas.map((codigo) => (
                <span
                  key={codigo}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-stone-800 dark:text-stone-200"
                >
                  {codigo}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-3 text-xs dark:border-stone-800">
              <div className="flex justify-between">
                <span className={textoSecundario}>Subtotal base</span>
                <span className={cn("font-medium tabular-nums", textoTitulo)}>{formatToCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className={textoSecundario}>IGV (18%)</span>
                <span className={cn("font-medium tabular-nums", textoTitulo)}>{formatToCurrency(igv)}</span>
              </div>
            </div>
          </div>

          {/* Pago */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl bg-[#4C0107] p-4 text-white dark:bg-stone-800">
              <span className="text-sm font-medium text-white/80 dark:text-stone-300">Total a cobrar</span>
              <span className="text-2xl font-bold tabular-nums text-white dark:text-stone-100">
                {formatToCurrency(total)}
              </span>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className={cn("mb-2", textoEtiqueta)}>Método de pago</legend>
              <div className="grid grid-cols-3 gap-2">
                {metodoPagoSchema.options.map((metodo) => {
                  const Icono = METODO_PAGO_ICONS[metodo]
                  const activo = metodoPago === metodo
                  return (
                    <button
                      key={metodo}
                      id={`cobro-metodo-${metodo}`}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => {
                        setValue("metodoPago", metodo, { shouldValidate: true })
                        setError(null)
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition-colors cursor-pointer",
                        opcionClass(activo)
                      )}
                    >
                      <Icono className="size-5" />
                      {METODO_PAGO_LABELS[metodo]}
                      <span className={cn("text-[10px] font-medium", activo ? "opacity-80" : textoSecundario)}>
                        {METODO_PAGO_AYUDA[metodo]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {metodoPago === "efectivo" ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cobro-monto-recibido" className={textoEtiqueta}>
                    Monto recibido
                  </label>
                  <Input
                    id="cobro-monto-recibido"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.10"
                    placeholder="0.00"
                    state={errors.montoRecibido ? "error" : "default"}
                    className="h-11 rounded-xl tabular-nums"
                    {...register("montoRecibido")}
                  />
                  <CampoError mensaje={errors.montoRecibido?.message} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setValue("montoRecibido", total.toFixed(2), { shouldValidate: true })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer",
                      opcionClass(montoNum === total)
                    )}
                  >
                    Exacto
                  </button>
                  {BILLETES_SUGERIDOS.filter((b) => b > total).map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setValue("montoRecibido", String(billete), { shouldValidate: true })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors cursor-pointer",
                        opcionClass(montoNum === billete)
                      )}
                    >
                      S/ {billete}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-stone-800">
                  <span className={textoCuerpo}>Vuelto</span>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatToCurrency(vuelto)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cobro-referencia" className={textoEtiqueta}>
                  N° de operación <span className="font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <Input
                  id="cobro-referencia"
                  placeholder={metodoPago === "tarjeta" ? "Ej. Voucher 004512" : "Ej. Operación 87451236"}
                  maxLength={30}
                  autoComplete="off"
                  className="h-11 rounded-xl"
                  {...register("referenciaPago")}
                />
                <CampoError mensaje={errors.referenciaPago?.message} />
              </div>
            )}

            {error && (
              <p role="alert" className={mensajeErrorClass}>
                {error}
              </p>
            )}
          </div>
        </div>

        <PieAcciones>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn("flex-1", botonSecundarioClass)}
          >
            Cancelar
          </Button>
          <Button id="cobro-confirmar" type="submit" size="sm" loading={isSubmitting} className="flex-[2]">
            Cobrar y liberar mesa · {formatToCurrency(total)}
          </Button>
        </PieAcciones>
      </form>
    </ModalShell>
  )
}

/* -------------------------------------------------------------------------- */
/*                         Comprobante interno (ticket)                       */
/* -------------------------------------------------------------------------- */

export function ComprobanteModal({
  comprobante,
  esReimpresion,
  onClose,
}: {
  comprobante: ComprobanteInterno
  esReimpresion: boolean
  onClose: () => void
}) {
  return (
    <ModalShell
      titulo={esReimpresion ? "Reimpresión de comprobante" : "Comprobante emitido"}
      subtitulo={`${comprobante.mesaNombre} · ${formatFechaHora(comprobante.emitidoEn)}`}
      icono={<Printer className="size-5" />}
      onClose={onClose}
    >
      <div className="overflow-y-auto p-5">
        {/* Ticket en papel: se mantiene claro también en modo oscuro para simular la impresión */}
        <div className="relative flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5 font-mono text-xs text-slate-800 shadow-inner dark:border-stone-600 dark:bg-stone-100 dark:text-stone-900">
          {esReimpresion && (
            <span className="absolute right-3 top-3 rounded-md border border-red-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-600">
              Copia N° {comprobante.reimpresiones}
            </span>
          )}
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-sm font-bold tracking-wide">COFFY FLOW</span>
            <span>Comprobante interno de consumo</span>
            <span className="font-bold">{comprobante.codigo}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-y border-dashed border-slate-300 py-2 dark:border-stone-400">
            <FilaTicket label="Fecha" valor={formatFechaHora(comprobante.emitidoEn)} />
            <FilaTicket label="Mesa" valor={comprobante.mesaNombre} />
            <FilaTicket label="Mozo" valor={comprobante.mozo} />
            <FilaTicket label="Cajero" valor={comprobante.cajero} />
            <FilaTicket label="Turno" valor={comprobante.turnoCodigo} />
            <FilaTicket label="Comandas" valor={comprobante.comandas.join(", ")} />
          </div>
          <ul className="flex flex-col gap-1">
            {comprobante.items.map((item) => (
              <li key={`${item.productoId}-${item.precioUnitario}`} className="flex justify-between gap-2">
                <span className="truncate">
                  {item.cantidad} x {item.nombre}
                </span>
                <span className="tabular-nums">{formatToCurrency(item.cantidad * item.precioUnitario)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-0.5 border-t border-dashed border-slate-300 pt-2 dark:border-stone-400">
            <FilaTicket label="Op. gravada" valor={formatToCurrency(comprobante.subtotal)} />
            <FilaTicket label="IGV 18%" valor={formatToCurrency(comprobante.igv)} />
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatToCurrency(comprobante.total)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-dashed border-slate-300 pt-2 dark:border-stone-400">
            <FilaTicket label="Pago" valor={METODO_PAGO_LABELS[comprobante.metodoPago]} />
            {comprobante.referenciaPago && <FilaTicket label="Operación" valor={comprobante.referenciaPago} />}
            {comprobante.metodoPago === "efectivo" && (
              <>
                <FilaTicket label="Recibido" valor={formatToCurrency(comprobante.montoRecibido)} />
                <FilaTicket label="Vuelto" valor={formatToCurrency(comprobante.vuelto)} />
              </>
            )}
          </div>
          <p className="text-center text-[10px]">Documento interno sin valor tributario · ¡Gracias por su visita!</p>
        </div>
      </div>
      <PieAcciones>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          leftIcon={<Printer className="size-4" />}
          className={cn("flex-1", botonSecundarioClass)}
        >
          Imprimir
        </Button>
        <Button id="comprobante-cerrar" type="button" size="sm" onClick={onClose} className="flex-[2]">
          Listo
        </Button>
      </PieAcciones>
    </ModalShell>
  )
}

function FilaTicket({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="truncate text-right tabular-nums">{valor}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-15: Detalle y auditoría de una comanda                  */
/* -------------------------------------------------------------------------- */

export function DetalleComandaModal({
  comanda,
  puedeAnular,
  reimprimiendo,
  onClose,
  onAnular,
  onReimprimir,
}: {
  comanda: Comanda
  puedeAnular: boolean
  reimprimiendo: boolean
  onClose: () => void
  onAnular: () => void
  onReimprimir: () => void
}) {
  const estadoConf = ESTADO_COMANDA_CONFIG[comanda.estado]
  return (
    <ModalShell
      titulo={`Comanda ${comanda.codigo}`}
      subtitulo={`${comanda.mesaNombre} · ${comanda.mozo} · ${formatFechaHora(comanda.emitidaEn)}`}
      ancho="max-w-xl"
      onClose={onClose}
    >
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", estadoConf.badge)}>
            <span className={cn("size-1.5 rounded-full", estadoConf.dot)} />
            {ESTADO_COMANDA_LABELS[comanda.estado]}
          </span>
          {comanda.comprobante && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-stone-800 dark:text-stone-200">
              {comanda.comprobante}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className={textoEtiqueta}>Productos</span>
          <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 dark:divide-stone-800 dark:border-stone-800">
            {comanda.items.map((item) => (
              <li key={`${item.productoId}-${item.precioUnitario}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className={cn(textoTitulo, comanda.estado === "anulada" && "line-through opacity-70")}>
                  {item.cantidad} × {item.nombre}
                </span>
                <span className={cn("font-semibold tabular-nums", textoTitulo)}>
                  {formatToCurrency(item.cantidad * item.precioUnitario)}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between py-2.5 text-sm">
              <span className={cn("font-bold", textoTitulo)}>Total</span>
              <span className={cn("text-base font-bold tabular-nums", textoAcento)}>{formatToCurrency(comanda.total)}</span>
            </li>
          </ul>
        </div>

        {/* Bitácora inmutable */}
        <div className="flex flex-col gap-3">
          <span className={textoEtiqueta}>Auditoría</span>
          <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-5 dark:border-stone-700">
            {comanda.auditoria.map((evento) => {
              const conf = ACCION_AUDITORIA_CONFIG[evento.accion]
              const Icono = conf.icon
              return (
                <li key={evento.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[31px] flex size-5 items-center justify-center rounded-full ring-4 ring-white dark:ring-stone-900",
                      conf.className
                    )}
                  >
                    <Icono className="size-3" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cn("text-sm font-semibold", textoTitulo)}>
                        {ACCION_AUDITORIA_LABELS[evento.accion]}
                      </span>
                      <span className={cn("text-[11px] tabular-nums", textoSecundario)}>
                        {formatFechaHora(evento.fecha)}
                      </span>
                    </div>
                    <span className={cn("text-xs", textoSecundario)}>Por {evento.usuario}</span>
                    {evento.detalle && <span className={cn("text-xs", textoCuerpo)}>{evento.detalle}</span>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <PieAcciones>
        {comanda.estado === "emitida" && puedeAnular && (
          <Button
            type="button"
            size="sm"
            onClick={onAnular}
            leftIcon={<Ban className="size-4" />}
            className={cn("flex-1", botonPeligroClass)}
          >
            Anular
          </Button>
        )}
        {comanda.estado === "cobrada" && comanda.comprobante && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReimprimir}
            loading={reimprimiendo}
            leftIcon={<Printer className="size-4" />}
            className={cn("flex-1", botonSecundarioClass)}
          >
            Reimprimir
          </Button>
        )}
        <Button type="button" size="sm" onClick={onClose} className="flex-1">
          Cerrar
        </Button>
      </PieAcciones>
    </ModalShell>
  )
}

/* -------------------------------------------------------------------------- */
/*                      RF-15: Anulación auditada de comanda                  */
/* -------------------------------------------------------------------------- */

export function AnularComandaForm({
  comanda,
  onClose,
  onAnular,
}: {
  comanda: Comanda
  onClose: () => void
  onAnular: (codigo: string, motivo: string) => Promise<unknown>
}) {
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AnulacionValues>({
    resolver: zodResolver(anulacionSchema),
    defaultValues: { motivo: "" },
  })

  const onSubmit = async (values: AnulacionValues) => {
    setErrorGeneral(null)
    try {
      await onAnular(comanda.codigo, values.motivo.trim())
      onClose()
    } catch (e) {
      setErrorGeneral(errorMensaje(e, "No se pudo anular la comanda."))
    }
  }

  return (
    <ModalShell
      titulo={`Anular ${comanda.codigo}`}
      subtitulo={`${comanda.mesaNombre} · ${formatToCurrency(comanda.total)}`}
      icono={<Ban className="size-5" />}
      bloqueado={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            La comanda no se elimina: quedará registrada como <strong>anulada</strong> con tu usuario, la fecha y el
            motivo, y se descontará de la cuenta de la mesa.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="comanda-motivo-anulacion" className={textoEtiqueta}>
              Motivo de la anulación
            </label>
            <Input
              id="comanda-motivo-anulacion"
              placeholder="Ej. Pedido duplicado por error"
              maxLength={120}
              autoComplete="off"
              state={errors.motivo ? "error" : "default"}
              className="h-11 rounded-xl"
              {...register("motivo")}
            />
            <CampoError mensaje={errors.motivo?.message} />
          </div>
          {errorGeneral && (
            <p role="alert" className={mensajeErrorClass}>
              {errorGeneral}
            </p>
          )}
        </div>
        <PieAcciones>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn("flex-1", botonSecundarioClass)}
          >
            Volver
          </Button>
          <Button
            id="comanda-confirmar-anulacion"
            type="submit"
            size="sm"
            loading={isSubmitting}
            leftIcon={<Ban className="size-4" />}
            className={cn("flex-[2]", botonPeligroClass)}
          >
            Confirmar anulación
          </Button>
        </PieAcciones>
      </form>
    </ModalShell>
  )
}
