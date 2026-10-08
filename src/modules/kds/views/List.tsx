"use client"

import * as React from "react"
import {
  Clock,
  Eye,
  RefreshCw,
  ShieldAlert,
  Undo2,
  UtensilsCrossed,
  CheckCircle2,
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination"
import { cn } from "@/shared/utils/cn"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import { useComandasKds } from "../hooks"
import {
  ESTADO_COMANDA_CONFIG,
  FILTRO_CONFIG,
  urgenciaClass,
} from "../components"
import type {
  ComandaKds,
  FiltroEstadoKds,
} from "../schema"
import DetalleComandaModal from "./Form"

const ITEMS_POR_PAGINA = 8

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

  const [pagina, setPagina] = React.useState(1)
  const [comandaDetalle, setComandaDetalle] = React.useState<ComandaKds | null>(null)

  // Resetear a la primera página al cambiar de filtro
  const handleCambioFiltro = React.useCallback(
    (nuevoFiltro: FiltroEstadoKds) => {
      setFiltro(nuevoFiltro)
      setPagina(1)
    },
    [setFiltro]
  )

  const totalPaginas = Math.ceil(comandas.length / ITEMS_POR_PAGINA)
  const paginaValida = Math.min(Math.max(1, pagina), Math.max(1, totalPaginas))

  const comandasPaginadas = React.useMemo(() => {
    const inicio = (paginaValida - 1) * ITEMS_POR_PAGINA
    return comandas.slice(inicio, inicio + ITEMS_POR_PAGINA)
  }, [comandas, paginaValida])

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Encabezado Responsivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4C0107]/10 dark:bg-[#EDE5E6]/10 px-2.5 py-0.5 text-xs font-semibold text-[#4C0107] dark:text-[#E7B7BC]">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Terminal KDS
            </span>
            <span className="text-xs text-slate-400 dark:text-stone-500">·</span>
            <span className="text-xs font-medium text-slate-500 dark:text-stone-400">
              {contadores.todas} {contadores.todas === 1 ? "comanda registrada" : "comandas registradas"}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-stone-100">
            Monitor de Cocina y Barra
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-stone-400">
            Flujo en tiempo real para preparación, tiempos de espera y entrega ágil de pedidos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={recargar}
            disabled={isLoading}
            className="rounded-xl h-10 px-4 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer shadow-xs"
          >
            <RefreshCw className={cn("mr-2 size-4", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Barra de filtros por estado con envoltorio flexible responsivo */}
      <FiltroEstados filtro={filtro} setFiltro={handleCambioFiltro} contadores={contadores} />

      {/* Grid de comandas con altura simétrica y botones alineados */}
      {isLoading ? (
        <KdsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : comandas.length === 0 ? (
        <EmptyState filtro={filtro} onReset={() => handleCambioFiltro("todas")} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 items-stretch">
            {comandasPaginadas.map((comanda) => (
              <ComandaCard
                key={comanda.id}
                comanda={comanda}
                onAvanzar={avanzar}
                onRetroceder={retroceder}
                onVerDetalle={setComandaDetalle}
              />
            ))}
          </div>

          {/* Paginación si hay más de una página para evitar scroll excesivo */}
          {totalPaginas > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 dark:text-stone-400">
                Mostrando {(paginaValida - 1) * ITEMS_POR_PAGINA + 1} -{" "}
                {Math.min(paginaValida * ITEMS_POR_PAGINA, comandas.length)} de {comandas.length} comandas
              </span>

              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={paginaValida <= 1}
                      className={cn(
                        "cursor-pointer",
                        paginaValida <= 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPaginas }).map((_, i) => {
                    const num = i + 1
                    return (
                      <PaginationItem key={num}>
                        <PaginationLink
                          isActive={paginaValida === num}
                          onClick={() => setPagina(num)}
                          className="cursor-pointer"
                        >
                          {num}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaValida >= totalPaginas}
                      className={cn(
                        "cursor-pointer",
                        paginaValida >= totalPaginas && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle de comanda */}
      {comandaDetalle && (
        <DetalleComandaModal
          comanda={comandaDetalle}
          onClose={() => setComandaDetalle(null)}
        />
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
    <div className="flex flex-wrap items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-100/70 dark:bg-stone-900/60 border border-slate-200/60 dark:border-stone-800">
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
              "flex items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer min-h-[36px]",
              activo
                ? "bg-[#4C0107] text-white shadow-xs dark:bg-stone-100 dark:text-stone-900 font-bold"
                : "bg-white/80 dark:bg-stone-800/80 text-slate-600 dark:text-stone-300 hover:text-slate-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-800 border border-slate-200/50 dark:border-stone-700/50"
            )}
          >
            <Icono className="size-3.5 shrink-0" />
            <span>{label}</span>
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-bold",
                activo
                  ? "bg-white/20 text-white dark:bg-stone-900/30 dark:text-stone-900"
                  : "bg-slate-100 text-slate-600 dark:bg-stone-700 dark:text-stone-300"
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
  onVerDetalle,
}: {
  comanda: ComandaKds
  onAvanzar: (id: string) => void
  onRetroceder: (id: string) => void
  onVerDetalle?: (comanda: ComandaKds) => void
}) {
  const config = ESTADO_COMANDA_CONFIG[comanda.estado]
  const Icono = config.icon
  const esEntregada = comanda.estado === "entregada"

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all duration-200 dark:bg-stone-900 overflow-hidden justify-between",
        config.border,
        esEntregada && "opacity-75 dark:opacity-65"
      )}
    >
      {/* Cabecera uniforme (shrink-0) */}
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold tracking-tight text-slate-900 dark:text-stone-100 text-sm sm:text-base truncate">
              {comanda.codigo}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0",
                config.badge
              )}
            >
              <Icono className="size-3" />
              {config.label}
            </span>
          </div>

          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold tabular-nums shrink-0 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-stone-800",
              urgenciaClass(comanda.minutosTranscurridos)
            )}
          >
            <Clock className="size-3.5" />
            {comanda.tiempoTranscurrido}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-slate-700 dark:text-stone-200 truncate">
              {comanda.mesa}
            </span>
            <span>·</span>
            <span className="truncate">{comanda.mozo}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="rounded-md bg-slate-200/60 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-stone-300">
              {comanda.tipoPedido === "mesa" ? "Salón" : "Llevar"}
            </span>
            {onVerDetalle && (
              <button
                type="button"
                onClick={() => onVerDetalle(comanda)}
                title="Ver detalle completo"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-stone-200 hover:bg-slate-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <Eye className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items de la comanda (flex-1 para absorber espacio y empujar el footer) */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto max-h-[220px] sm:max-h-[260px] no-scrollbar">
        <ul className="flex flex-col gap-2.5">
          {comanda.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-start gap-2 text-sm leading-tight">
                <span className="inline-flex min-w-[22px] h-5 items-center justify-center rounded bg-[#4C0107]/10 text-[#4C0107] dark:bg-stone-800 dark:text-stone-200 text-xs font-bold tabular-nums shrink-0">
                  {item.cantidad}x
                </span>
                <span className="font-medium text-slate-800 dark:text-stone-200 text-xs sm:text-sm">
                  {item.nombre}
                </span>
              </div>
              {item.modificadores && (
                <span className="text-[11px] text-slate-500 dark:text-stone-400 pl-7 leading-tight">
                  {item.modificadores}
                </span>
              )}
              {item.notas && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-md px-2 py-0.5 ml-7 w-fit">
                  <span>📝 {item.notas}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Contenedor de Botones (mt-auto shrink-0) - ALINEADOS A LA MISMA ALTURA */}
      <div className="mt-auto shrink-0 border-t border-slate-100 bg-slate-50/40 p-3.5 dark:border-stone-800 dark:bg-stone-950/20 min-h-[58px] flex items-center">
        {esEntregada ? (
          <div className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-slate-500 dark:text-stone-400">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Comanda finalizada y despachada</span>
          </div>
        ) : (
          <div className="flex w-full items-center gap-2">
            {comanda.estado !== "pendiente" && (
              <button
                type="button"
                onClick={() => onRetroceder(comanda.id)}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 shrink-0"
              >
                <Undo2 className="size-3.5" />
                <span>Regresar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onAvanzar(comanda.id)}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer truncate",
                config.actionClass
              )}
            >
              <Icono className="size-4 shrink-0" />
              <span className="truncate">{config.actionLabel}</span>
            </button>
          </div>
        )}
      </div>
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
        className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer"
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
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col h-64 rounded-2xl border border-slate-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 justify-between"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24 rounded-md dark:bg-stone-800" />
            <Skeleton className="h-5 w-16 rounded-full dark:bg-stone-800" />
          </div>
          <div className="space-y-2 my-auto">
            <Skeleton className="h-4 w-3/4 rounded dark:bg-stone-800" />
            <Skeleton className="h-4 w-1/2 rounded dark:bg-stone-800" />
            <Skeleton className="h-4 w-2/3 rounded dark:bg-stone-800" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl dark:bg-stone-800 mt-auto" />
        </div>
      ))}
    </div>
  )
}
