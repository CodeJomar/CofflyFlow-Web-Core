"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowDownCircle, ArrowUpCircle, Ban, Calculator, LockKeyhole, Printer, Undo2, Unlock, X } from "lucide-react"

import type { MetodoPago, TipoMovimientoManual, TurnoActualDto, TurnoCajaDto } from "@/dtos/caja"
import type { ComprobanteDto } from "@/dtos/pedidos"
import { useSession } from "@/modules/auth"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useClaveIdempotencia } from "@/shared/hooks/use-clave-idempotencia"
import { cn } from "@/shared/utils/cn"
import { aCentimos, desdeCentimos, dineroDesdeTexto, formatearCentimos, formatearDinero } from "@/shared/utils/dinero"

import {
  ESTADO_PEDIDO_CONFIG,
  EVENTO_PAGO_CONFIG,
  RESULTADO_ARQUEO_CONFIG,
  botonPeligroClass,
  botonSecundarioClass,
  formatFechaHora,
  formatHora,
  formatTranscurrido,
  opcionClass,
  tarjetaClass,
  textoAcento,
  textoCuerpo,
  textoEtiqueta,
  textoSecundario,
  textoTitulo,
} from "../components"
import {
  DENOMINACIONES,
  ESTADO_PEDIDO_LABELS,
  METODO_PAGO_LABELS,
  RESULTADO_ARQUEO_LABELS,
  TIPO_MOVIMIENTO_LABELS,
  TIPOS_MOVIMIENTO_MANUAL,
  anulacionSchema,
  aperturaCajaSchema,
  calcularContadoCentimos,
  codigoPedido,
  crearCierreCajaSchema,
  crearDevolucionSchema,
  crearMovimientoSchema,
  obtenerResultadoArqueo,
  type AnulacionValues,
  type AperturaCajaValues,
  type CierreCajaValues,
  type DevolucionValues,
  type MovimientoValues,
  type ResumenTurno,
  type TurnoArchivado,
} from "../schema"

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
/*                         Apertura de turno de caja                          */
/* -------------------------------------------------------------------------- */

const FONDOS_SUGERIDOS = [100, 150, 200, 300] as const

export function AperturaCajaForm({
  ultimoTurno,
  puedeAbrir,
  onAbrir,
}: {
  ultimoTurno?: TurnoArchivado
  puedeAbrir: boolean
  onAbrir: (montoInicial: string) => Promise<boolean>
}) {
  const sesion = useSession()
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AperturaCajaValues>({
    resolver: zodResolver(aperturaCajaSchema),
    defaultValues: { montoInicial: "" },
  })

  const monto = useWatch({ control, name: "montoInicial" })

  const onSubmit = async (values: AperturaCajaValues) => {
    const dinero = dineroDesdeTexto(String(values.montoInicial))
    if (dinero) await onAbrir(dinero)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      data-sin-desborde
      className={cn(
        tarjetaClass,
        "flex min-h-0 flex-col gap-4 overflow-hidden p-4 lg:gap-5 lg:p-6 [@media(max-height:760px)]:gap-3"
      )}
      aria-label="Apertura de turno de caja"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#4C0107] text-white dark:bg-[#E7B7BC] dark:text-stone-900">
          <Unlock className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className={cn("text-lg font-bold", textoTitulo)}>Apertura de caja</h2>
          <p className={cn("text-sm [@media(max-height:760px)]:hidden", textoSecundario)}>
            Registra el fondo inicial en efectivo para comenzar a cobrar cuentas.
          </p>
        </div>
      </div>

      {/* En pantallas muy bajas se omite: el último turno también figura en "Turnos anteriores" */}
      <div className="grid grid-cols-2 gap-2 text-xs sm:gap-3 sm:text-sm [@media(max-height:680px)]:hidden">
        <div className="min-w-0 rounded-xl bg-slate-100/70 px-3 py-2 sm:px-4 sm:py-3 dark:bg-stone-800">
          <span className={cn("block text-xs", textoSecundario)}>Cajero responsable</span>
          <span className={cn("block truncate font-semibold", textoTitulo)}>{sesion.nombre}</span>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-100/70 px-3 py-2 sm:px-4 sm:py-3 dark:bg-stone-800">
          <span className={cn("block text-xs", textoSecundario)}>Último turno</span>
          <span className={cn("block truncate font-semibold", textoTitulo)}>
            {ultimoTurno
              ? `${formatFechaHora(ultimoTurno.desde)} · ${formatearCentimos(ultimoTurno.ventasCentimos)}`
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
          className="h-11 rounded-xl text-base tabular-nums sm:h-12"
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
        <p className={cn("text-center text-xs", textoSecundario)}>Tu cargo no tiene permiso para abrir la caja.</p>
      )}
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*                       Entradas y salidas de efectivo                       */
/* -------------------------------------------------------------------------- */

export function MovimientoCajaForm({
  tipoInicial,
  efectivoDisponibleCentimos,
  onClose,
  onRegistrar,
}: {
  tipoInicial: TipoMovimientoManual
  efectivoDisponibleCentimos: number
  onClose: () => void
  onRegistrar: (tipo: TipoMovimientoManual, concepto: string, monto: string) => Promise<boolean>
}) {
  const schema = React.useMemo(() => crearMovimientoSchema(efectivoDisponibleCentimos), [efectivoDisponibleCentimos])
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
    const dinero = dineroDesdeTexto(String(values.monto))
    if (!dinero) return
    if (await onRegistrar(values.tipo, values.concepto.trim(), dinero)) onClose()
  }

  return (
    <ModalShell
      titulo="Movimiento de caja"
      subtitulo={`Efectivo disponible: ${formatearCentimos(efectivoDisponibleCentimos)}`}
      icono={tipo === "ingreso_manual" ? <ArrowDownCircle className="size-5" /> : <ArrowUpCircle className="size-5" />}
      bloqueado={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
            {TIPOS_MOVIMIENTO_MANUAL.map((opcion) => {
              const Icono = opcion === "ingreso_manual" ? ArrowDownCircle : ArrowUpCircle
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
              Motivo
            </label>
            <Input
              id="caja-movimiento-concepto"
              placeholder={tipo === "ingreso_manual" ? "Ej. Reposición de sencillo" : "Ej. Compra de insumos"}
              maxLength={255}
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
            Registrar {tipo === "ingreso_manual" ? "entrada" : "salida"}
          </Button>
        </PieAcciones>
      </form>
    </ModalShell>
  )
}

/* -------------------------------------------------------------------------- */
/*                      Arqueo y cierre del turno de caja                     */
/* -------------------------------------------------------------------------- */

export function CierreCajaForm({
  turno,
  resumen,
  onClose,
  onCerrar,
}: {
  turno: TurnoActualDto["turno"]
  resumen: ResumenTurno
  onClose: () => void
  onCerrar: (montoFinalReal: string, observaciones?: string) => Promise<TurnoCajaDto | null>
}) {
  const [turnoCerrado, setTurnoCerrado] = React.useState<TurnoCajaDto | null>(null)
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
  const contado = calcularContadoCentimos(conteo ?? {})
  const diferencia = contado - resumen.efectivoEsperado
  const resultado = obtenerResultadoArqueo(diferencia)
  const resultadoConf = RESULTADO_ARQUEO_CONFIG[resultado]

  const onSubmit = async (values: CierreCajaValues) => {
    const cerrado = await onCerrar(desdeCentimos(calcularContadoCentimos(values.conteo)), values.observaciones?.trim() || undefined)
    if (cerrado) setTurnoCerrado(cerrado)
  }

  if (turnoCerrado) {
    const resultadoFinal = obtenerResultadoArqueo(aCentimos(turnoCerrado.diferencia))
    const conf = RESULTADO_ARQUEO_CONFIG[resultadoFinal]
    return (
      <ModalShell titulo="Caja cerrada" subtitulo={turnoCerrado.id_turno_caja.slice(0, 8).toUpperCase()} icono={<LockKeyhole className="size-5" />} onClose={onClose}>
        <div className="flex flex-col gap-5 overflow-y-auto p-5" aria-live="polite">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", conf.badge)}>
              {RESULTADO_ARQUEO_LABELS[resultadoFinal]}
            </span>
            {turnoCerrado.fecha_cierre && (
              <p className={cn("text-sm", textoCuerpo)}>
                El turno se cerró a las {formatHora(turnoCerrado.fecha_cierre)} tras{" "}
                {formatTranscurrido(turnoCerrado.fecha_apertura, turnoCerrado.fecha_cierre)} de operación.
              </p>
            )}
          </div>
          <ResumenFilas
            filas={[
              { label: "Efectivo esperado", valor: formatearDinero(turnoCerrado.monto_final_calculado) },
              { label: "Efectivo contado", valor: formatearDinero(turnoCerrado.monto_final_real) },
              { label: "Diferencia", valor: formatearDinero(turnoCerrado.diferencia), className: conf.texto },
              { label: "Ventas totales", valor: formatearCentimos(resumen.ventasTotales) },
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
      subtitulo={`Abierto hace ${formatTranscurrido(turno.fecha_apertura)} por ${turno.abierto_por}`}
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
                      <span className={cn("font-semibold", textoTitulo)}>S/ {d.centimos < 100 ? (d.centimos / 100).toFixed(2) : d.centimos / 100}</span>
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
                      {formatearCentimos(cantidad * d.centimos)}
                    </span>
                  </label>
                )
              })}
            </div>
            <CampoError mensaje={(errors.conteo as { message?: string } | undefined)?.message} />
          </fieldset>

          {/* Cálculo automático de diferencias */}
          <div className="flex flex-col gap-3">
            <span className={textoEtiqueta}>Resumen del turno</span>
            <ResumenFilas
              filas={[
                { label: "Fondo inicial", valor: formatearDinero(turno.monto_inicial) },
                { label: "Ventas en efectivo", valor: formatearCentimos(resumen.ventasEfectivo) },
                { label: "Entradas de dinero", valor: `+ ${formatearCentimos(resumen.ingresos)}` },
                { label: "Salidas de dinero", valor: `- ${formatearCentimos(resumen.retiros)}` },
                { label: "Devoluciones", valor: `- ${formatearCentimos(resumen.devoluciones)}` },
              ]}
            />
            <ResumenFilas
              filas={[
                { label: "Tarjeta (no se cuenta)", valor: formatearCentimos(resumen.ventasTarjeta) },
                { label: "Digitales (no se cuentan)", valor: formatearCentimos(resumen.ventasDigitales) },
              ]}
            />

            <div className="flex flex-col gap-2 rounded-2xl bg-slate-100 p-4 dark:bg-stone-800">
              <div className="flex items-center justify-between text-sm">
                <span className={textoCuerpo}>Esperado en caja</span>
                <span className={cn("font-semibold tabular-nums", textoTitulo)}>
                  {formatearCentimos(resumen.efectivoEsperado)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={textoCuerpo}>Contado</span>
                <span className={cn("font-semibold tabular-nums", textoTitulo)}>{formatearCentimos(contado)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-stone-700">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", resultadoConf.badge)}>
                  {RESULTADO_ARQUEO_LABELS[resultado]}
                </span>
                <span className={cn("text-xl font-bold tabular-nums", resultadoConf.texto)} aria-live="polite">
                  {diferencia > 0 ? "+" : ""}
                  {formatearCentimos(diferencia)}
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
                maxLength={255}
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
            Cerrar caja con {formatearCentimos(contado)}
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
/*              Comprobante interno del pedido (ticket, pagos, devoluciones)   */
/* -------------------------------------------------------------------------- */

export type CobroDevolvible = ComprobanteDto["pagos"][number] & { devolvibleCentimos: number }

/** Cuánto se puede devolver aún de cada cobro: lo cobrado menos lo ya devuelto de ese mismo cobro. */
export function cobrosDevolvibles(comprobante: ComprobanteDto): CobroDevolvible[] {
  return comprobante.pagos.map((pago) => {
    const devuelto = comprobante.devoluciones
      .filter((d) => d.id_transaccion_origen === pago.id_transaccion)
      .reduce((acc, d) => acc + aCentimos(d.monto), 0)
    return { ...pago, devolvibleCentimos: Math.max(0, aCentimos(pago.monto) - devuelto) }
  })
}

export function ComprobanteModal({
  comprobante,
  puedeDevolver,
  puedeAnular,
  onClose,
  onDevolver,
  onAnular,
}: {
  comprobante: ComprobanteDto
  puedeDevolver: boolean
  puedeAnular: boolean
  onClose: () => void
  onDevolver: (cobro: CobroDevolvible) => void
  onAnular: () => void
}) {
  const cobros = cobrosDevolvibles(comprobante)
  const estadoConf = ESTADO_PEDIDO_CONFIG[comprobante.estado]
  const sinPagos = comprobante.pagos.length === 0
  const lugar = comprobante.tipo_pedido === "salon" && comprobante.mesa_numero ? `Mesa ${comprobante.mesa_numero}` : "Para llevar"

  return (
    <ModalShell
      titulo={`Pedido ${comprobante.numero}`}
      subtitulo={`${lugar} · ${formatFechaHora(comprobante.fecha)}`}
      icono={<Printer className="size-5" />}
      ancho="max-w-xl"
      onClose={onClose}
    >
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", estadoConf.badge)}>
            <span className={cn("size-1.5 rounded-full", estadoConf.dot)} />
            {ESTADO_PEDIDO_LABELS[comprobante.estado]}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-stone-800 dark:text-stone-200">
            Pago: {comprobante.estado_pago.replace("_", " ")}
          </span>
        </div>

        {/* Ticket en papel: se mantiene claro también en modo oscuro para simular la impresión */}
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5 font-mono text-xs text-slate-800 shadow-inner dark:border-stone-600 dark:bg-stone-100 dark:text-stone-900">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-sm font-bold tracking-wide">COFFY FLOW</span>
            <span>Comprobante interno de consumo</span>
            <span className="font-bold">{comprobante.numero}</span>
          </div>
          <ul className="flex flex-col gap-1 border-y border-dashed border-slate-300 py-2 dark:border-stone-400">
            {comprobante.items.map((item, i) => (
              <li key={`${item.producto}-${i}`} className="flex flex-col">
                <span className="flex justify-between gap-2">
                  <span className="truncate">
                    {item.cantidad} x {item.producto}
                  </span>
                  <span className="tabular-nums">{formatearDinero(item.subtotal)}</span>
                </span>
                {item.modificadores.length > 0 && (
                  <span className="pl-3 text-[10px] opacity-70">{item.modificadores.map((m) => m.opcion).join(", ")}</span>
                )}
                {item.notas_preparacion && <span className="pl-3 text-[10px] italic opacity-70">{item.notas_preparacion}</span>}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-0.5">
            <FilaTicket label="Op. gravada" valor={formatearDinero(comprobante.desglose.base_imponible)} />
            <FilaTicket label="IGV 18%" valor={formatearDinero(comprobante.desglose.igv_18)} />
            {aCentimos(comprobante.descuento) > 0 && (
              <FilaTicket label="Descuento" valor={`- ${formatearDinero(comprobante.descuento)}`} />
            )}
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatearDinero(comprobante.total)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-dashed border-slate-300 pt-2 dark:border-stone-400">
            <FilaTicket label="Pagado" valor={formatearDinero(comprobante.total_pagado)} />
            {aCentimos(comprobante.total_devuelto) > 0 && (
              <FilaTicket label="Devuelto" valor={`- ${formatearDinero(comprobante.total_devuelto)}`} />
            )}
            <FilaTicket label="Saldo pendiente" valor={formatearDinero(comprobante.saldo_pendiente)} />
          </div>
          <p className="text-center text-[10px]">{comprobante.aviso}</p>
        </div>

        {/* Cobros y devoluciones */}
        <div className="flex flex-col gap-3">
          <span className={textoEtiqueta}>Cobros y devoluciones</span>
          {sinPagos ? (
            <p className={cn("text-sm", textoSecundario)}>Este pedido todavía no tiene cobros.</p>
          ) : (
            <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-5 dark:border-stone-700">
              {[
                ...cobros.map((c) => ({ tipo: "pago" as const, fecha: c.fecha, c })),
                ...comprobante.devoluciones.map((d) => ({ tipo: "devolucion" as const, fecha: d.fecha, d })),
              ]
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .map((evento) => {
                  const conf = EVENTO_PAGO_CONFIG[evento.tipo]
                  const Icono = conf.icon
                  const esPago = evento.tipo === "pago"
                  const dato = esPago ? evento.c : evento.d
                  return (
                    <li key={dato.id_transaccion} className="relative">
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
                            {esPago ? "Cobro" : "Devolución"} · {METODO_PAGO_LABELS[dato.metodo_pago as MetodoPago]}
                          </span>
                          <span className={cn("text-sm font-bold tabular-nums", esPago ? textoTitulo : "text-red-600 dark:text-red-400")}>
                            {esPago ? "" : "- "}
                            {formatearDinero(dato.monto)}
                          </span>
                        </div>
                        <span className={cn("text-[11px]", textoSecundario)}>
                          {formatFechaHora(dato.fecha)} · {dato.registrado_por}
                        </span>
                        {!esPago && <span className={cn("text-xs", textoCuerpo)}>Motivo: {evento.d.motivo}</span>}
                        {esPago && puedeDevolver && evento.c.devolvibleCentimos > 0 && (
                          <button
                            type="button"
                            onClick={() => onDevolver(evento.c)}
                            className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15"
                          >
                            <Undo2 className="size-3.5" /> Devolver (hasta {formatearCentimos(evento.c.devolvibleCentimos)})
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
            </ol>
          )}
        </div>
      </div>

      <PieAcciones>
        {puedeAnular && comprobante.estado !== "anulado" && comprobante.estado !== "pagado" && sinPagos && (
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
        <Button id="comprobante-cerrar" type="button" size="sm" onClick={onClose} className="flex-1">
          Cerrar
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
/*                            Devolución de un cobro                          */
/* -------------------------------------------------------------------------- */

export function DevolucionForm({
  cobro,
  codigo,
  onClose,
  onDevolver,
}: {
  cobro: CobroDevolvible
  codigo: string
  onClose: () => void
  onDevolver: (payload: { id_transaccion_origen: string; monto: string; motivo: string }, clave: string) => Promise<boolean>
}) {
  const schema = React.useMemo(() => crearDevolucionSchema(cobro.devolvibleCentimos), [cobro.devolvibleCentimos])
  const { obtener, reiniciar } = useClaveIdempotencia()
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DevolucionValues>({
    resolver: zodResolver(schema),
    defaultValues: { monto: desdeCentimos(cobro.devolvibleCentimos), motivo: "" },
  })

  const onSubmit = async (values: DevolucionValues) => {
    const monto = dineroDesdeTexto(String(values.monto))
    if (!monto) return
    const payload = { id_transaccion_origen: cobro.id_transaccion, monto, motivo: values.motivo.trim() }
    // Misma clave mientras el contenido no cambie: un doble toque o un reintento no devuelve dos veces
    const ok = await onDevolver(payload, obtener(JSON.stringify(payload)))
    if (ok) {
      reiniciar()
      onClose()
    }
  }

  return (
    <ModalShell
      titulo={`Devolver cobro · ${codigo}`}
      subtitulo={`${METODO_PAGO_LABELS[cobro.metodo_pago]} · cobrado ${formatearDinero(cobro.monto)}`}
      icono={<Undo2 className="size-5" />}
      bloqueado={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            La devolución no borra el cobro: queda registrada en el libro de caja con tu usuario, la fecha y el motivo, y
            resta de las ventas del turno.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="devolucion-monto" className={textoEtiqueta}>
              Monto a devolver
            </label>
            <Input
              id="devolucion-monto"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.10"
              state={errors.monto ? "error" : "default"}
              className="h-11 rounded-xl tabular-nums"
              {...register("monto")}
            />
            <button
              type="button"
              onClick={() => setValue("monto", desdeCentimos(cobro.devolvibleCentimos), { shouldValidate: true })}
              className={cn("w-fit cursor-pointer text-xs font-semibold hover:underline", textoAcento)}
            >
              Devolver todo ({formatearCentimos(cobro.devolvibleCentimos)})
            </button>
            <CampoError mensaje={errors.monto?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="devolucion-motivo" className={textoEtiqueta}>
              Motivo
            </label>
            <Input
              id="devolucion-motivo"
              placeholder="Ej. Producto en mal estado"
              maxLength={255}
              autoComplete="off"
              state={errors.motivo ? "error" : "default"}
              className="h-11 rounded-xl"
              {...register("motivo")}
            />
            <CampoError mensaje={errors.motivo?.message} />
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
            Volver
          </Button>
          <Button
            id="devolucion-confirmar"
            type="submit"
            size="sm"
            loading={isSubmitting}
            leftIcon={<Undo2 className="size-4" />}
            className={cn("flex-[2]", botonPeligroClass)}
          >
            Confirmar devolución
          </Button>
        </PieAcciones>
      </form>
    </ModalShell>
  )
}

/* -------------------------------------------------------------------------- */
/*                         Anulación auditada de un pedido                    */
/* -------------------------------------------------------------------------- */

export function AnularPedidoForm({
  idPedido,
  detalle,
  onClose,
  onAnular,
}: {
  idPedido: string
  detalle: string
  onClose: () => void
  onAnular: (idPedido: string, motivo: string) => Promise<boolean>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AnulacionValues>({
    resolver: zodResolver(anulacionSchema),
    defaultValues: { motivo: "" },
  })

  const onSubmit = async (values: AnulacionValues) => {
    if (await onAnular(idPedido, values.motivo.trim())) onClose()
  }

  return (
    <ModalShell
      titulo={`Anular ${codigoPedido(idPedido)}`}
      subtitulo={detalle}
      icono={<Ban className="size-5" />}
      bloqueado={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            El pedido no se elimina: quedará registrado como <strong>anulado</strong> con tu usuario, la fecha y el
            motivo, y dejará de aparecer en cocina.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pedido-motivo-anulacion" className={textoEtiqueta}>
              Motivo de la anulación
            </label>
            <Input
              id="pedido-motivo-anulacion"
              placeholder="Ej. Pedido duplicado por error"
              maxLength={255}
              autoComplete="off"
              state={errors.motivo ? "error" : "default"}
              className="h-11 rounded-xl"
              {...register("motivo")}
            />
            <CampoError mensaje={errors.motivo?.message} />
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
            Volver
          </Button>
          <Button
            id="pedido-confirmar-anulacion"
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
