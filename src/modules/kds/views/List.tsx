"use client"

import * as React from "react"
import {
  ChefHat,
  Clock,
  RefreshCw,
  ShieldAlert,
  Undo2,
  UtensilsCrossed,
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/utils/cn"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import { useComandasKds } from "../hooks"
import {
  ESTADO_COMANDA_CONFIG,
  FILTRO_CONFIG,
  panelClass,
  urgenciaClass,
} from "../components"
import type {
  ComandaKds,
  EstadoComanda,
  FiltroEstadoKds,
} from "../schema"

/* -------------------------------------------------------------------------- */
/*                          Vista principal del KDS                            */
/* -------------------------------------------------------------------------- */

export default function KdsView() {
  const { rol } = useWorkspaceLayout()

  if (!tienePermiso(rol, PERMISO.READ_KDS)) return <AccesoRestringido rol={ROL_LABELS[rol]} />

  return <KdsContent />
}

function KdsContent() {
  const {
    comandas,
    isLoading,
    error,
    recargar,
    filtro,
    setFiltro,
    contadores,
    avanzar,
    retroceder,
  } = useComandasKds()

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-stone-100">
            KDS - Comandas en Cocina
          </h1>
          <p className="text-sm text-slate-500 dark:text-stone-400">
            Gestión de órdenes en tiempo real para preparación.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={recargar}
          disabled={isLoading}
          className="self-start sm:self-auto rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <RefreshCw className={cn("mr-1.5 size-4", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Barra de filtros por estado */}
      <FiltroEstados filtro={filtro} setFiltro={setFiltro} contadores={contadores} />

      {/* Grid de comandas */}
      {isLoading ? (
        <KdsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : comandas.length === 0 ? (
        <EmptyState filtro={filtro} onReset={() => setFiltro("todas")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {comandas.map((comanda) => (
            <ComandaCard
              key={comanda.id}
              comanda={comanda}
              onAvanzar={avanzar}
              onRetroceder={retroceder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                           Barra de filtros                                  */
/* -------------------------------------------------------------------------- */

function FiltroEstados({
  filtro,
  setFiltro,
  contadores,
}: {
  filtro: FiltroEstadoKds
  setFiltro: (f: FiltroEstadoKds) => void
  contadores: Record<FiltroEstadoKds, number>
}) {
  const opciones: FiltroEstadoKds[] = ["todas", "pendiente", "en_preparacion", "lista", "entregada"]

  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((opcion) => {
        const { icon: Icono, label } = FILTRO_CONFIG[opcion]
        const activo = filtro === opcion
        return (
          <button
            key={opcion}
            type="button"
            onClick={() => setFiltro(opcion)}
            aria-pressed={activo}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              activo
                ? "border-[#4C0107] bg-[#4C0107] text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#4C0107]/40 hover:text-[#4C0107] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-stone-100"
            )}
          >
            <Icono className="size-3.5" />
            {label}
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                activo
                  ? "bg-white/20 text-white dark:bg-stone-900/30 dark:text-stone-900"
                  : "bg-slate-100 text-slate-500 dark:bg-stone-800 dark:text-stone-400"
              )}
            >
              {contadores[opcion]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                           Tarjeta de Comanda                                */
/* -------------------------------------------------------------------------- */

function ComandaCard({
  comanda,
  onAvanzar,
  onRetroceder,
}: {
  comanda: ComandaKds
  onAvanzar: (id: string) => void
  onRetroceder: (id: string) => void
}) {
  const config = ESTADO_COMANDA_CONFIG[comanda.estado]
  const Icono = config.icon
  const esEntregada = comanda.estado === "entregada"

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-white shadow-sm transition-all dark:bg-stone-900",
        config.border,
        esEntregada && "opacity-60"
      )}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-stone-800">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-stone-100 truncate">
              {comanda.codigo}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                config.badge
              )}
            >
              <Icono className="size-3" />
              {config.label}
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-stone-400 truncate">
            {comanda.mesa} · {comanda.mozo}
          </span>
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-semibold tabular-nums shrink-0", urgenciaClass(comanda.minutosTranscurridos))}>
          <Clock className="size-3.5" />
          {comanda.tiempoTranscurrido}
        </div>
      </div>

      {/* Items */}
      <ul className="flex flex-col gap-1 px-4 py-3">
        {comanda.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5">
            <div className="flex items-start justify-between gap-2 text-sm">
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

      {/* Acciones */}
      {!esEntregada && (
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3 dark:border-stone-800">
          {comanda.estado !== "pendiente" && (
            <button
              type="button"
              onClick={() => onRetroceder(comanda.id)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Undo2 className="size-3.5" />
              Regresar
            </button>
          )}
          <button
            type="button"
            onClick={() => onAvanzar(comanda.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              config.actionClass
            )}
          >
            {config.actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Estados especiales                             */
/* -------------------------------------------------------------------------- */

function AccesoRestringido({ rol }: { rol: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-[#E7B7BC]">
        <ShieldAlert className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-slate-900 dark:text-stone-100">Acceso restringido</h1>
        <p className="max-w-sm text-sm text-slate-500 dark:text-stone-400">
          Tu rol actual{" "}
          <span className="font-semibold text-slate-700 dark:text-stone-200">{rol}</span> no tiene
          acceso al KDS.
        </p>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <p className="text-sm text-slate-600 dark:text-stone-300">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        <RefreshCw className="mr-1 size-4" /> Reintentar
      </Button>
    </div>
  )
}

function EmptyState({ filtro, onReset }: { filtro: FiltroEstadoKds; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-[#E7B7BC]">
        <UtensilsCrossed className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-stone-100">
          Sin comandas
        </h2>
        <p className="max-w-sm text-sm text-slate-500 dark:text-stone-400">
          {filtro === "todas"
            ? "No hay comandas activas en este momento."
            : "No hay comandas con el estado seleccionado."}
        </p>
      </div>
      {filtro !== "todas" && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-[#4C0107] underline hover:text-[#4C0107]/70 cursor-pointer dark:text-[#E7B7BC] dark:hover:text-[#E7B7BC]/70"
        >
          Limpiar filtro
        </button>
      )}
    </div>
  )
}

function KdsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-2xl dark:bg-stone-800" />
      ))}
    </div>
  )
}
