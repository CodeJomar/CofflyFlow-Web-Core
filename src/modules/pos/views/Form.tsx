"use client"

import * as React from "react"
import { Check, ChefHat, CircleCheck, Plus, Trash2, X } from "lucide-react"

import type { CobroResultadoDto, MetodoPago } from "@/dtos/caja"
import { METODOS_PAGO } from "@/dtos/caja"
import type { GrupoModificadorDto } from "@/dtos/menu"
import type { PedidoCreadoDto } from "@/dtos/pedidos"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/utils/cn"
import {
  aCentimos,
  desdeCentimos,
  dineroDesdeTexto,
  formatearCentimos,
  formatearDinero,
  repartirCentimos,
} from "@/shared/utils/dinero"

import { useCobro, type ConfiguracionItem } from "../hooks"
import { BILLETES_SUGERIDOS, METODO_PAGO_ICONS, opcionClass } from "../components"
import {
  MAX_LINEAS_PAGO,
  MAX_NOTA_PREPARACION,
  METODO_PAGO_LABELS,
  errorDeSeleccion,
  grupoExcluyente,
  grupoObligatorio,
  precioUnitarioCentimos,
  type ProductoPos,
  type SeleccionModificador,
} from "../schema"

/* -------------------------------------------------------------------------- */
/*                        Marco común de los modales del POS                   */
/* -------------------------------------------------------------------------- */

function ModalMarco({
  titulo,
  subtitulo,
  onClose,
  cerrarDeshabilitado = false,
  ancho = "max-w-md",
  children,
}: {
  titulo: string
  subtitulo?: string
  onClose: () => void
  cerrarDeshabilitado?: boolean
  ancho?: string
  children: React.ReactNode
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()

  // Cierre con Escape y foco inicial dentro del modal
  React.useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cerrarDeshabilitado) onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, cerrarDeshabilitado])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={() => !cerrarDeshabilitado && onClose()}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none dark:border-stone-800 dark:bg-stone-900",
          ancho,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <h2 id={tituloId} className="text-lg font-bold text-slate-900 dark:text-stone-100">
              {titulo}
            </h2>
            {subtitulo && <p className="text-xs text-slate-500 dark:text-stone-400">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={cerrarDeshabilitado}
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

const etiquetaCampo = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"

/* -------------------------------------------------------------------------- */
/*                               Modal de Cobro                               */
/* -------------------------------------------------------------------------- */

/** Pedido que se puede cobrar (los importes son `Dinero`). */
export interface PedidoACobrar {
  id_pedido: string
  /** Texto para identificarlo: "A1B2C3D4 · Mesa 3". */
  etiqueta: string
  total: string
  saldo_pendiente: string
}

interface LineaPago {
  id: string
  metodo: MetodoPago
  /** Lo que se aplica al pedido (texto del campo). */
  monto: string
  /** Solo efectivo: lo que entrega el cliente, para calcular el vuelto (no se envía a la API). */
  recibido: string
}

const nuevaLinea = (monto: string, metodo: MetodoPago = "efectivo"): LineaPago => ({
  id: crypto.randomUUID(),
  metodo,
  monto,
  recibido: "",
})

interface CobroModalProps {
  pedidos: PedidoACobrar[]
  onClose: () => void
  /** Se llama al cerrar si se registró al menos un pago, para refrescar mesas y pedidos. */
  onCobrado: (resultado: CobroResultadoDto) => void
}

/**
 * Cobro de un pedido. Admite pago mixto (varias líneas con distinto método) y pago parcial (cada comensal paga lo
 * suyo): el pedido queda pagado cuando lo cobrado cubre su total. El monto lo valida la API contra el saldo.
 */
export function CobroModal({ pedidos, onClose, onCobrado }: CobroModalProps) {
  const [idPedido, setIdPedido] = React.useState(pedidos[0]?.id_pedido ?? "")
  const pedido = pedidos.find((p) => p.id_pedido === idPedido) ?? pedidos[0]
  const saldoInicial = pedido ? aCentimos(pedido.saldo_pendiente) : 0
  // Saldo vigente: el de la lista al abrir y, tras cada pago, el que informa la API.
  const [saldoBase, setSaldoBase] = React.useState(saldoInicial)

  const [lineas, setLineas] = React.useState<LineaPago[]>(() => [nuevaLinea(desdeCentimos(saldoInicial))])
  const [resultado, setResultado] = React.useState<CobroResultadoDto | null>(null)
  const [mensaje, setMensaje] = React.useState<string | null>(null)
  const { cobrar, isSubmitting } = useCobro()

  const saldo = saldoBase
  const total = pedido ? aCentimos(pedido.total) : 0

  const montos = lineas.map((l) => dineroDesdeTexto(l.monto))
  const aplicado = montos.reduce((suma, m) => suma + (m ? aCentimos(m) : 0), 0)
  const restante = saldo - aplicado

  const cambiarLinea = (id: string, cambios: Partial<LineaPago>) => {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...cambios } : l)))
    setMensaje(null)
  }

  const reiniciarLineas = (saldoCentimos: number) => {
    setLineas([nuevaLinea(desdeCentimos(saldoCentimos))])
    setMensaje(null)
  }

  const cambiarPedido = (id: string) => {
    const siguiente = pedidos.find((p) => p.id_pedido === id)
    setIdPedido(id)
    if (siguiente) {
      setSaldoBase(aCentimos(siguiente.saldo_pendiente))
      reiniciarLineas(aCentimos(siguiente.saldo_pendiente))
    }
  }

  const validar = (): string | null => {
    if (lineas.some((l) => !dineroDesdeTexto(l.monto) || aCentimos(dineroDesdeTexto(l.monto)) <= 0)) {
      return "Cada pago necesita un monto mayor a cero (ej: 12.50)."
    }
    if (aplicado > saldo) return `Lo cobrado (${formatearCentimos(aplicado)}) supera el saldo (${formatearCentimos(saldo)}).`
    return null
  }

  const confirmar = async () => {
    if (!pedido) return
    const error = validar()
    if (error) return setMensaje(error)

    const respuesta = await cobrar(
      pedido.id_pedido,
      lineas.map((l) => ({ metodo_pago: l.metodo, monto: dineroDesdeTexto(l.monto) as string })),
    )
    if (!respuesta) return // el toast ya explicó el motivo (caja cerrada, saldo, permisos...)
    setResultado(respuesta)
    setSaldoBase(aCentimos(respuesta.saldo_pendiente))
    setMensaje(null)
  }

  const cerrar = () => {
    if (resultado) onCobrado(resultado)
    onClose()
  }

  const registrarOtroPago = () => {
    if (!resultado) return
    setResultado(null)
    // El saldo ya descontó lo pagado: se parte de él.
    setLineas([nuevaLinea(desdeCentimos(saldoBase))])
  }

  if (!pedido) return null

  // Si ya se pagó algo, el saldo del selector es el de la respuesta.
  const completo = resultado?.estado_pago === "pagado"

  return (
    <ModalMarco
      titulo={completo ? "Pedido pagado" : resultado ? "Pago registrado" : "Cobrar pedido"}
      subtitulo={pedido.etiqueta}
      onClose={cerrar}
      cerrarDeshabilitado={isSubmitting}
    >
      {resultado ? (
        <ResultadoCobro resultado={resultado} completo={completo} onOtroPago={registrarOtroPago} onCerrar={cerrar} />
      ) : (
        <>
          <div className="flex flex-col gap-5 overflow-y-auto p-5">
            {pedidos.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pos-pedido-cobro" className={etiquetaCampo}>
                  Pedido a cobrar
                </label>
                <select
                  id="pos-pedido-cobro"
                  value={pedido.id_pedido}
                  onChange={(e) => cambiarPedido(e.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:[color-scheme:dark]"
                >
                  {pedidos.map((p) => (
                    <option key={p.id_pedido} value={p.id_pedido}>
                      {p.etiqueta} · saldo {formatearDinero(p.saldo_pendiente)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Total y saldo */}
            <div className="flex items-center justify-between rounded-2xl bg-[#4C0107] p-4 text-white dark:bg-stone-800">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white/80 dark:text-stone-300">Saldo por cobrar</span>
                {saldo < total && (
                  <span className="text-[11px] text-white/70 dark:text-stone-400">
                    Total {formatearCentimos(total)} · ya pagado {formatearCentimos(total - saldo)}
                  </span>
                )}
              </div>
              <span className="text-2xl font-bold tabular-nums dark:text-stone-100">{formatearCentimos(saldo)}</span>
            </div>

            {/* Atajos para dividir la cuenta entre comensales */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={etiquetaCampo}>Pagar una parte</span>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLineas([nuevaLinea(desdeCentimos(repartirCentimos(saldo, n)[0]))])}
                  className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer", opcionClass(false))}
                >
                  1/{n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => reiniciarLineas(saldo)}
                className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer", opcionClass(false))}
              >
                Todo
              </button>
            </div>

            {/* Líneas de pago: cada una con su método y monto (pago mixto) */}
            <div className="flex flex-col gap-3">
              {lineas.map((linea, indice) => {
                const monto = montos[indice]
                const vuelto =
                  linea.metodo === "efectivo" && dineroDesdeTexto(linea.recibido) && monto
                    ? Math.max(aCentimos(dineroDesdeTexto(linea.recibido)) - aCentimos(monto), 0)
                    : null
                return (
                  <div
                    key={linea.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-stone-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className={etiquetaCampo}>Pago {lineas.length > 1 ? indice + 1 : ""}</span>
                      {lineas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLineas((prev) => prev.filter((l) => l.id !== linea.id))}
                          aria-label="Quitar este pago"
                          className="flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {METODOS_PAGO.map((metodo) => {
                        const Icono = METODO_PAGO_ICONS[metodo]
                        const activo = linea.metodo === metodo
                        return (
                          <button
                            key={metodo}
                            type="button"
                            aria-pressed={activo}
                            onClick={() => cambiarLinea(linea.id, { metodo })}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition-colors cursor-pointer",
                              opcionClass(activo),
                            )}
                          >
                            <Icono className="size-4" />
                            {METODO_PAGO_LABELS[metodo]}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`pos-monto-${linea.id}`} className={etiquetaCampo}>
                        Monto a cobrar
                      </label>
                      <Input
                        id={`pos-monto-${linea.id}`}
                        inputMode="decimal"
                        value={linea.monto}
                        onChange={(e) => cambiarLinea(linea.id, { monto: e.target.value })}
                        placeholder="0.00"
                        className="h-11 rounded-xl tabular-nums"
                      />
                    </div>

                    {linea.metodo === "efectivo" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {BILLETES_SUGERIDOS.filter((b) => !monto || b * 100 >= aCentimos(monto)).map((billete) => (
                            <button
                              key={billete}
                              type="button"
                              onClick={() => cambiarLinea(linea.id, { recibido: String(billete) })}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors cursor-pointer",
                                opcionClass(aCentimos(dineroDesdeTexto(linea.recibido)) === billete * 100),
                              )}
                            >
                              S/ {billete}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            inputMode="decimal"
                            value={linea.recibido}
                            onChange={(e) => cambiarLinea(linea.id, { recibido: e.target.value })}
                            placeholder="Recibido del cliente"
                            aria-label="Efectivo recibido del cliente"
                            className="h-10 flex-1 rounded-xl tabular-nums"
                          />
                          <div className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm dark:bg-stone-800">
                            <span className="text-slate-600 dark:text-stone-300">Vuelto</span>
                            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                              {formatearCentimos(vuelto ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {lineas.length < MAX_LINEAS_PAGO && restante > 0 && (
                <button
                  type="button"
                  onClick={() => setLineas((prev) => [...prev, nuevaLinea(desdeCentimos(restante), "tarjeta")])}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-xs font-semibold text-slate-600 transition-colors hover:border-[#4C0107]/40 hover:text-[#4C0107] dark:border-stone-700 dark:text-stone-300 cursor-pointer"
                >
                  <Plus className="size-4" /> Agregar otro método de pago ({formatearCentimos(restante)} restante)
                </button>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-stone-800">
              <span className="text-slate-600 dark:text-stone-300">Se cobra ahora</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-stone-100">{formatearCentimos(aplicado)}</span>
            </div>
            {aplicado > 0 && aplicado < saldo && (
              <p className="text-xs text-slate-500 dark:text-stone-400">
                Quedarán {formatearCentimos(restante)} por cobrar: el pedido seguirá abierto hasta cubrir el total.
              </p>
            )}

            {mensaje && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300"
              >
                {mensaje}
              </p>
            )}
          </div>

          <div className="flex gap-2 border-t border-slate-100 p-5 dark:border-stone-800">
            <Button type="button" variant="outline" size="sm" onClick={cerrar} disabled={isSubmitting} className="flex-1">
              Cancelar
            </Button>
            <Button id="pos-confirmar-cobro" type="button" size="sm" loading={isSubmitting} onClick={() => void confirmar()} className="flex-[2]">
              Confirmar {formatearCentimos(aplicado)}
            </Button>
          </div>
        </>
      )}
    </ModalMarco>
  )
}

function ResultadoCobro({
  resultado,
  completo,
  onOtroPago,
  onCerrar,
}: {
  resultado: CobroResultadoDto
  completo: boolean
  onOtroPago: () => void
  onCerrar: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
        <CircleCheck className="size-10" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-bold text-slate-900 dark:text-stone-100">
          {completo ? "Cobro completado" : "Pago parcial registrado"}
        </p>
        <p className="text-sm text-slate-500 dark:text-stone-400">
          Cobrado {formatearDinero(resultado.total_pagado)} de {formatearDinero(resultado.total_pedido)}
        </p>
      </div>

      <ul className="flex w-full flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 text-sm dark:divide-stone-800 dark:border-stone-800">
        {resultado.transacciones.map((t) => (
          <li key={t.id_transaccion_caja} className="flex items-center justify-between py-2.5">
            <span className="text-slate-600 dark:text-stone-300">{METODO_PAGO_LABELS[t.metodo_pago]}</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">{formatearDinero(t.monto)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between py-2.5">
          <span className="text-slate-500 dark:text-stone-400">IGV incluido (18%)</span>
          <span className="tabular-nums text-slate-700 dark:text-stone-200">{formatearDinero(resultado.desglose.igv_18)}</span>
        </li>
        {!completo && (
          <li className="flex items-center justify-between py-2.5">
            <span className="font-semibold text-amber-700 dark:text-amber-400">Saldo pendiente</span>
            <span className="font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {formatearDinero(resultado.saldo_pendiente)}
            </span>
          </li>
        )}
      </ul>

      <div className="flex w-full gap-2">
        {!completo && (
          <Button type="button" variant="outline" size="sm" onClick={onOtroPago} className="flex-1">
            Registrar otro pago
          </Button>
        )}
        <Button type="button" size="sm" onClick={onCerrar} className="flex-1">
          {completo ? "Listo" : "Cerrar"}
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*              Modal de personalización: modificadores y notas                */
/* -------------------------------------------------------------------------- */

interface PersonalizarProductoModalProps {
  producto: ProductoPos
  onClose: () => void
  onConfirmar: (configuracion: ConfiguracionItem) => void
}

/** Opciones que ofrece el propio producto (grupos que asignó el propietario) más una nota libre para cocina. */
export function PersonalizarProductoModal({ producto, onClose, onConfirmar }: PersonalizarProductoModalProps) {
  const grupos = [...producto.grupos_modificadores].sort((a, b) => a.orden_visual - b.orden_visual)
  // opciones elegidas por grupo (ids)
  const [elegidas, setElegidas] = React.useState<Record<string, string[]>>({})
  const [notas, setNotas] = React.useState("")
  const [intento, setIntento] = React.useState(false)

  const seleccion = (grupo: GrupoModificadorDto) => elegidas[grupo.id_grupo] ?? []

  const alternar = (grupo: GrupoModificadorDto, idOpcion: string) => {
    setElegidas((prev) => {
      const actuales = prev[grupo.id_grupo] ?? []
      if (actuales.includes(idOpcion)) {
        // Un grupo obligatorio excluyente no se "des-elige": se cambia de opción.
        if (grupoExcluyente(grupo) && grupoObligatorio(grupo)) return prev
        return { ...prev, [grupo.id_grupo]: actuales.filter((id) => id !== idOpcion) }
      }
      if (grupoExcluyente(grupo)) return { ...prev, [grupo.id_grupo]: [idOpcion] }
      if (grupo.seleccion_maxima > 0 && actuales.length >= grupo.seleccion_maxima) return prev
      return { ...prev, [grupo.id_grupo]: [...actuales, idOpcion] }
    })
  }

  const modificadores: SeleccionModificador[] = grupos.flatMap((grupo) =>
    seleccion(grupo).flatMap((id) => {
      const opcion = grupo.opciones.find((o) => o.id_opcion === id)
      return opcion
        ? [{ id_grupo: grupo.id_grupo, grupo: grupo.nombre, id_opcion: opcion.id_opcion, opcion: opcion.nombre, price_delta: opcion.price_delta }]
        : []
    }),
  )

  const errores = grupos.map((g) => errorDeSeleccion(g, seleccion(g).length))
  const valido = errores.every((e) => e === null)
  const unitario = precioUnitarioCentimos({ producto, modificadores })

  return (
    <ModalMarco titulo={producto.nombre} subtitulo="Personaliza el producto y agrega notas para cocina" onClose={onClose}>
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        {grupos.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-stone-400">Este producto no tiene opciones: puedes agregar una nota de preparación.</p>
        )}

        {grupos.map((grupo, indice) => (
          <fieldset key={grupo.id_grupo} className="flex flex-col gap-2">
            <legend className={cn(etiquetaCampo, "mb-2")}>
              {grupo.nombre}{" "}
              <span className="font-normal normal-case tracking-normal">
                {grupoObligatorio(grupo) ? "(obligatorio)" : grupoExcluyente(grupo) ? "(opcional, elige una)" : `(opcional, hasta ${grupo.seleccion_maxima || grupo.opciones.length})`}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {[...grupo.opciones]
                .sort((a, b) => a.orden_visual - b.orden_visual)
                .map((opcion) => {
                  const activa = seleccion(grupo).includes(opcion.id_opcion)
                  const delta = aCentimos(opcion.price_delta)
                  return (
                    <button
                      key={opcion.id_opcion}
                      type="button"
                      aria-pressed={activa}
                      disabled={!opcion.disponible}
                      onClick={() => alternar(grupo, opcion.id_opcion)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                        opcionClass(activa),
                      )}
                    >
                      {activa && <Check className="size-3.5" />}
                      {opcion.nombre}
                      {!opcion.disponible ? (
                        <span className="text-[10px] font-medium">Agotado</span>
                      ) : (
                        delta !== 0 && (
                          <span className="text-[10px] font-medium opacity-80">
                            {delta > 0 ? "+" : "-"}
                            {formatearCentimos(Math.abs(delta))}
                          </span>
                        )
                      )}
                    </button>
                  )
                })}
            </div>
            {intento && errores[indice] && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">{errores[indice]}</span>
            )}
          </fieldset>
        ))}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="pos-notas" className={etiquetaCampo}>
            Nota de preparación <span className="font-normal normal-case tracking-normal">(opcional)</span>
          </label>
          <textarea
            id="pos-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={MAX_NOTA_PREPARACION}
            rows={3}
            placeholder="Ej: sin azúcar, bien caliente…"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-400/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-stone-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 p-5 dark:border-stone-800">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 dark:text-stone-400">Precio por unidad</span>
          <span className="text-lg font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">{formatearCentimos(unitario)}</span>
        </div>
        <Button
          id="pos-agregar-personalizado"
          type="button"
          size="sm"
          className="ml-auto flex-1"
          onClick={() => {
            setIntento(true)
            if (valido) onConfirmar({ modificadores, notas: notas.trim() || undefined })
          }}
        >
          Agregar a la comanda
        </Button>
      </div>
    </ModalMarco>
  )
}

/* -------------------------------------------------------------------------- */
/*                Aviso al enviar la comanda a cocina / barra                  */
/* -------------------------------------------------------------------------- */

interface ComandaDespachadaModalProps {
  pedido: PedidoCreadoDto
  /** "Mesa 3" o "Para llevar". */
  destino: string
  onClose: () => void
}

export function ComandaDespachadaModal({ pedido, destino, onClose }: ComandaDespachadaModalProps) {
  const unidades = pedido.detalles.reduce((suma, d) => suma + d.cantidad, 0)
  const hora = new Date(pedido.fecha_creacion).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })

  return (
    <ModalMarco titulo="Comanda enviada" subtitulo="La cocina y la barra ya la están viendo" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          <ChefHat className="size-10" />
        </span>
        <ul className="flex w-full flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 text-sm dark:divide-stone-800 dark:border-stone-800">
          {[
            { label: "Comanda", valor: pedido.id_pedido.slice(0, 8).toUpperCase() },
            { label: "Destino", valor: destino },
            { label: "Hora", valor: hora },
            { label: "Productos", valor: `${unidades} u.` },
            { label: "Total", valor: formatearDinero(pedido.total_calculado) },
          ].map((fila) => (
            <li key={fila.label} className="flex items-center justify-between py-2.5">
              <span className="text-slate-500 dark:text-stone-400">{fila.label}</span>
              <span className="font-semibold text-slate-900 dark:text-stone-100">{fila.valor}</span>
            </li>
          ))}
        </ul>
        <Button id="pos-comanda-listo" type="button" size="sm" onClick={onClose} className="w-full">
          Listo
        </Button>
      </div>
    </ModalMarco>
  )
}
