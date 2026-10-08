"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChefHat, CircleCheck, Printer, Sparkles, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/utils/cn"
import { formatToCurrency } from "@/shared/utils/formatters"

import { useCobro } from "../hooks"
import {
  BILLETES_SUGERIDOS,
  METODO_PAGO_ICONS,
  OPCIONES_ENDULZANTE,
  OPCIONES_LECHE,
  OPCIONES_TEMPERATURA,
  opcionClass,
} from "../components"
import {
  METODO_PAGO_LABELS,
  TIPO_PEDIDO_LABELS,
  crearCobroFormSchema,
  metodoPagoSchema,
  type CobroFormValues,
  type ComandaDespachada,
  type ItemCarrito,
  type MetodoPago,
  type ModificadoresProducto,
  type ProductoPos,
  type TipoPedido,
  type TotalesCarrito,
} from "../schema"

/* -------------------------------------------------------------------------- */
/*                               Modal de Cobro                               */
/* -------------------------------------------------------------------------- */

interface CobroFormProps {
  items: ItemCarrito[]
  totales: TotalesCarrito
  tipoPedido: TipoPedido
  mesa: string
  onClose: () => void
  onVentaCompletada: () => void
}

/**
 * Modal de cobro del POS implementado con React Hook Form y Zod Resolver.
 * Permite registrar ventas en efectivo, tarjeta o transferencias digitales (Yape/Plin).
 */
export default function CobroForm({
  items,
  totales,
  tipoPedido,
  mesa,
  onClose,
  onVentaCompletada,
}: CobroFormProps) {
  const { cobrar, isSubmitting, error, setError, venta } = useCobro()
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()

  const formSchema = React.useMemo(() => crearCobroFormSchema(totales.total), [totales.total])

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CobroFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoPedido,
      mesa: tipoPedido === "mesa" ? mesa : undefined,
      cliente: "",
      metodoPago: "efectivo",
      montoRecibido: "",
    },
  })

  const metodoPago = useWatch({ control, name: "metodoPago" })
  const montoRecibido = useWatch({ control, name: "montoRecibido" })
  const montoNum =
    montoRecibido === "" || montoRecibido === undefined ? undefined : Number(montoRecibido)
  const vueltoEstimado =
    montoNum !== undefined && !Number.isNaN(montoNum) ? Math.max(montoNum - totales.total, 0) : 0

  const cerrar = React.useCallback(() => {
    if (isSubmitting) return
    if (venta) onVentaCompletada()
    else onClose()
  }, [isSubmitting, venta, onClose, onVentaCompletada])

  // Cierre con Escape y foco inicial dentro del modal
  React.useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [cerrar])

  const onSubmit = async (values: CobroFormValues) => {
    setError(null)
    const monto =
      values.metodoPago === "efectivo" && values.montoRecibido !== undefined && values.montoRecibido !== ""
        ? Number(values.montoRecibido)
        : undefined

    await cobrar({
      tipoPedido: values.tipoPedido,
      mesa: values.tipoPedido === "mesa" ? values.mesa || mesa : undefined,
      cliente: values.cliente?.trim() || undefined,
      metodoPago: values.metodoPago,
      montoRecibido: monto,
      total: totales.total,
      items: items.map((i) => ({
        productoId: i.producto.id,
        cantidad: i.cantidad,
        precio: i.producto.precio + (i.modificadores?.precioExtra ?? 0),
      })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={cerrar}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <h2 id={tituloId} className="text-lg font-bold text-slate-900 dark:text-stone-100">
              {venta ? "Venta registrada" : "Cobrar pedido"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-stone-400">
              {TIPO_PEDIDO_LABELS[tipoPedido]}
              {tipoPedido === "mesa" && mesa ? ` · ${mesa}` : ""} · {totales.unidades}{" "}
              {totales.unidades === 1 ? "producto" : "productos"}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {venta ? (
          <VentaExitosa
            codigo={venta.codigo}
            total={venta.total}
            vuelto={venta.vuelto}
            metodoPago={venta.metodoPago}
            onNuevaVenta={onVentaCompletada}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex flex-col gap-5 overflow-y-auto p-5">
              {/* Total a cobrar */}
              <div className="flex items-center justify-between rounded-2xl bg-[#4C0107] p-4 text-white dark:bg-stone-800">
                <span className="text-sm font-medium text-white/80 dark:text-stone-300">Total a cobrar</span>
                <span className="text-2xl font-bold tabular-nums dark:text-stone-100">
                  {formatToCurrency(totales.total)}
                </span>
              </div>

              {/* Cliente */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="pos-cliente"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
                >
                  Cliente <span className="font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <Input
                  id="pos-cliente"
                  {...register("cliente")}
                  placeholder="Nombre para el pedido"
                  maxLength={60}
                  autoComplete="off"
                  className="h-11 rounded-xl"
                />
                {errors.cliente && (
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.cliente.message}
                  </span>
                )}
              </div>

              {/* Método de pago */}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">
                  Método de pago
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {metodoPagoSchema.options.map((metodo) => {
                    const Icono = METODO_PAGO_ICONS[metodo]
                    const activo = metodoPago === metodo
                    return (
                      <button
                        key={metodo}
                        id={`pos-metodo-${metodo}`}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => {
                          setValue("metodoPago", metodo, { shouldValidate: true })
                          setError(null)
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition-colors cursor-pointer",
                          opcionClass(activo)
                        )}
                      >
                        <Icono className="size-5" />
                        {METODO_PAGO_LABELS[metodo]}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {/* Efectivo: monto recibido y vuelto */}
              {metodoPago === "efectivo" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="pos-monto"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
                    >
                      Monto recibido
                    </label>
                    <Input
                      id="pos-monto"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.10"
                      {...register("montoRecibido")}
                      placeholder="0.00"
                      className="h-11 rounded-xl tabular-nums"
                    />
                    {errors.montoRecibido && (
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        {errors.montoRecibido.message}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setValue("montoRecibido", totales.total.toFixed(2), { shouldValidate: true })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer",
                        opcionClass(false)
                      )}
                    >
                      Exacto
                    </button>
                    {BILLETES_SUGERIDOS.filter((b) => b >= totales.total).map((billete) => (
                      <button
                        key={billete}
                        type="button"
                        onClick={() =>
                          setValue("montoRecibido", String(billete), { shouldValidate: true })
                        }
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
                    <span className="text-slate-600 dark:text-stone-300">Vuelto</span>
                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatToCurrency(vueltoEstimado)}
                    </span>
                  </div>
                </div>
              )}

              {errors.mesa && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300"
                >
                  {errors.mesa.message}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300"
                >
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-100 p-5 dark:border-stone-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                id="pos-confirmar-cobro"
                type="submit"
                size="sm"
                loading={isSubmitting}
                className="flex-[2]"
              >
                Confirmar {formatToCurrency(totales.total)}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function VentaExitosa({
  codigo,
  total,
  vuelto,
  metodoPago,
  onNuevaVenta,
}: {
  codigo: string
  total: number
  vuelto: number
  metodoPago: MetodoPago
  onNuevaVenta: () => void
}) {
  const filas = [
    { label: "Pedido", valor: codigo },
    { label: "Método de pago", valor: METODO_PAGO_LABELS[metodoPago] },
    { label: "Total cobrado", valor: formatToCurrency(total) },
    ...(metodoPago === "efectivo" ? [{ label: "Vuelto", valor: formatToCurrency(vuelto) }] : []),
  ]

  return (
    <div className="flex flex-col gap-5 p-5" aria-live="polite">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 animate-in zoom-in-50 duration-300 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CircleCheck className="size-7" />
        </span>
        <p className="text-sm text-slate-600 dark:text-stone-300">
          El pedido <span className="font-bold text-slate-900 dark:text-stone-100">{codigo}</span> fue cobrado y enviado a cocina.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 dark:divide-stone-800 dark:border-stone-800">
        {filas.map((fila) => (
          <li key={fila.label} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-slate-600 dark:text-stone-400">{fila.label}</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">{fila.valor}</span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          leftIcon={<Printer className="size-4" />}
          className="flex-1"
        >
          Imprimir
        </Button>
        <Button id="pos-nueva-venta" type="button" size="sm" onClick={onNuevaVenta} className="flex-[2]">
          Nueva venta
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*            RF-05: Modal de Toma y Personalización de Comandas              */
/* -------------------------------------------------------------------------- */

interface PersonalizarProductoModalProps {
  producto: ProductoPos
  modificadoresIniciales?: ModificadoresProducto
  onClose: () => void
  onConfirmar: (modificadores: ModificadoresProducto) => void
}

export function PersonalizarProductoModal({
  producto,
  modificadoresIniciales,
  onClose,
  onConfirmar,
}: PersonalizarProductoModalProps) {
  const [leche, setLeche] = React.useState<ModificadoresProducto["tipoLeche"]>(
    modificadoresIniciales?.tipoLeche ?? "Entera"
  )
  const [endulzante, setEndulzante] = React.useState<ModificadoresProducto["endulzante"]>(
    modificadoresIniciales?.endulzante ?? "Sin azúcar"
  )
  const [temperatura, setTemperatura] = React.useState<ModificadoresProducto["temperatura"]>(
    modificadoresIniciales?.temperatura ?? "Caliente"
  )
  const [notas, setNotas] = React.useState(modificadoresIniciales?.notas ?? "")

  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()

  const opcionLeche = OPCIONES_LECHE.find((l) => l.valor === leche)
  const precioExtraLeche = opcionLeche?.precioExtra ?? 0
  const precioFinalUnitario = producto.precio + precioExtraLeche

  React.useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirmar({
      tipoLeche: leche,
      endulzante,
      temperatura,
      notas: notas.trim() || undefined,
      precioExtra: precioExtraLeche,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-[#E7B7BC]">
                <Sparkles className="size-4" />
              </span>
              <h2 id={tituloId} className="text-lg font-bold text-slate-900 dark:text-stone-100">
                Personalizar Comanda
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-stone-400">
              {producto.nombre} · Base {formatToCurrency(producto.precio)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Contenido del formulario */}
        <form onSubmit={handleGuardar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-5 overflow-y-auto p-5">
            {/* Tipo de Leche */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">
                Tipo de Leche
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {OPCIONES_LECHE.map((op) => {
                  const activa = leche === op.valor
                  return (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setLeche(op.valor)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-2.5 text-xs font-semibold transition-colors cursor-pointer",
                        opcionClass(activa)
                      )}
                    >
                      <span>{op.valor}</span>
                      {op.precioExtra > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                            activa
                              ? "bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                          )}
                        >
                          +{formatToCurrency(op.precioExtra)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Endulzante */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">
                Endulzante
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {OPCIONES_ENDULZANTE.map((endul) => {
                  const activa = endulzante === endul
                  return (
                    <button
                      key={endul}
                      type="button"
                      onClick={() => setEndulzante(endul)}
                      className={cn(
                        "flex items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-colors cursor-pointer text-center",
                        opcionClass(activa)
                      )}
                    >
                      {endul}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Temperatura */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">
                Temperatura
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {OPCIONES_TEMPERATURA.map((temp) => {
                  const activa = temperatura === temp
                  return (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => setTemperatura(temp)}
                      className={cn(
                        "flex items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-colors cursor-pointer text-center",
                        opcionClass(activa)
                      )}
                    >
                      {temp}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notas de preparación adicionales */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="pos-notas-preparacion"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
              >
                Notas de preparación <span className="font-normal normal-case tracking-normal">(opcional)</span>
              </label>
              <Input
                id="pos-notas-preparacion"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Poco dulce, sin canela, servir en taza grande..."
                maxLength={100}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Resumen de subtotal en tiempo real */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-100 p-4 dark:bg-stone-800">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-stone-400">Subtotal con modificadores</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-stone-100">
                  {leche} · {endulzante} · {temperatura}
                </span>
              </div>
              <span className="text-xl font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">
                {formatToCurrency(precioFinalUnitario)}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 border-t border-slate-100 p-5 dark:border-stone-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="flex-[2]" leftIcon={<Check className="size-4" />}>
              Agregar a comanda ({formatToCurrency(precioFinalUnitario)})
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*            RF-06: Feedback Modal de Comanda Despachada a Cocina            */
/* -------------------------------------------------------------------------- */

interface ComandaDespachadaModalProps {
  comanda: ComandaDespachada
  onClose: () => void
}

export function ComandaDespachadaModal({ comanda, onClose }: ComandaDespachadaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 animate-in zoom-in-50 duration-300 dark:bg-emerald-500/20 dark:text-emerald-400">
            <ChefHat className="size-7" />
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-stone-100">
            ¡Comanda enviada a cocina!
          </h2>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            La orden fue despachada y la mesa ha pasado a estado <strong>Ocupada</strong>.
          </p>
        </div>

        <ul className="my-4 flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 text-xs dark:divide-stone-800 dark:border-stone-800">
          <li className="flex items-center justify-between py-2.5">
            <span className="text-slate-500 dark:text-stone-400">N° Comanda</span>
            <span className="font-bold text-slate-900 dark:text-stone-100">{comanda.codigoComanda}</span>
          </li>
          <li className="flex items-center justify-between py-2.5">
            <span className="text-slate-500 dark:text-stone-400">Mesa</span>
            <span className="font-semibold text-slate-900 dark:text-stone-100">{comanda.mesa}</span>
          </li>
          <li className="flex items-center justify-between py-2.5">
            <span className="text-slate-500 dark:text-stone-400">Mozo emisor</span>
            <span className="font-semibold text-slate-900 dark:text-stone-100">{comanda.mozoEmisor}</span>
          </li>
          <li className="flex items-center justify-between py-2.5">
            <span className="text-slate-500 dark:text-stone-400">Hora de envío</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">
              {comanda.horaEnvio}
            </span>
          </li>
          <li className="flex items-center justify-between py-2.5">
            <span className="text-slate-500 dark:text-stone-400">Total productos</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">
              {comanda.itemsTotal} u.
            </span>
          </li>
        </ul>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="size-4" />}
            className="flex-1"
          >
            Imprimir
          </Button>
          <Button type="button" size="sm" onClick={onClose} className="flex-[2]">
            Continuar
          </Button>
        </div>
      </div>
    </div>
  )
}
