"use client"

import * as React from "react"
import {
  ChefHat,
  Clock,
  X,
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"

import { ESTADO_COMANDA_CONFIG, urgenciaClass } from "../components"
import type { ComandaKds } from "../schema"

/* -------------------------------------------------------------------------- */
/*              Modal de detalle de comanda (vista de solo lectura)             */
/* -------------------------------------------------------------------------- */

interface DetalleComandaModalProps {
  comanda: ComandaKds
  onClose: () => void
}

export default function DetalleComandaModal({
  comanda,
  onClose,
}: DetalleComandaModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()
  const config = ESTADO_COMANDA_CONFIG[comanda.estado]
  const Icono = config.icon

  React.useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const filas = [
    { label: "Código", valor: comanda.codigo },
    { label: "Mesa / Destino", valor: comanda.mesa },
    { label: "Mozo", valor: comanda.mozo },
    { label: "Tipo", valor: comanda.tipoPedido === "mesa" ? "En mesa" : "Para llevar" },
    { label: "Tiempo", valor: comanda.tiempoTranscurrido },
    { label: "Total productos", valor: `${comanda.items.reduce((a, i) => a + i.cantidad, 0)} u.` },
  ]

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
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-[#E7B7BC]">
                <ChefHat className="size-4" />
              </span>
              <h2
                id={tituloId}
                className="text-lg font-bold text-slate-900 dark:text-stone-100"
              >
                Detalle de Comanda
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  config.badge
                )}
              >
                <Icono className="size-3" />
                {config.label}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold tabular-nums",
                  urgenciaClass(comanda.minutosTranscurridos)
                )}
              >
                <Clock className="size-3" />
                {comanda.tiempoTranscurrido}
              </span>
            </div>
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

        {/* Datos de la comanda */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4 dark:divide-stone-800 dark:border-stone-800">
            {filas.map((fila) => (
              <li
                key={fila.label}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-slate-500 dark:text-stone-400">{fila.label}</span>
                <span className="font-semibold text-slate-900 dark:text-stone-100">
                  {fila.valor}
                </span>
              </li>
            ))}
          </ul>

          {/* Lista de productos */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">
              Productos
            </span>
            <ul className="flex flex-col gap-2 rounded-2xl border border-slate-100 px-4 py-3 dark:border-stone-800">
              {comanda.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-stone-200">
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">
                        {item.cantidad}x
                      </span>{" "}
                      {item.nombre}
                    </span>
                  </div>
                  {item.modificadores && (
                    <span className="text-[11px] text-slate-400 dark:text-stone-500 pl-5">
                      {item.modificadores}
                    </span>
                  )}
                  {item.notas && (
                    <span className="text-[11px] italic text-amber-600 dark:text-amber-400 pl-5">
                      📝 {item.notas}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-100 p-5 dark:border-stone-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
