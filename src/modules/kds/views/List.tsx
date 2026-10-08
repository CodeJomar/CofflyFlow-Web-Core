"use client"

import * as React from "react"
import { CheckCheck, Clock, Eye, RefreshCw, Undo2, UtensilsCrossed, Wifi, WifiOff } from "lucide-react"

import type { ItemKdsDto, TarjetaKdsDto } from "@/dtos/kds"
import type { EstadoItemKds } from "@/dtos/pedidos"
import { useCan } from "@/modules/auth"
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
import { ACCION, MODULO } from "@/shared/constants/permisos"
import { useAhora } from "@/shared/hooks/use-ahora"
import { cn } from "@/shared/utils/cn"

import { useTableroKds } from "../hooks"
import { ESTADO_COMANDA_CONFIG, ESTADO_ITEM_CONFIG, FILTRO_CONFIG, urgenciaClass } from "../components"
import {
  COMANDAS_POR_PAGINA,
  codigoComanda,
  destinoComanda,
  minutosDesde,
  textoMinutos,
  textoModificadores,
  TIPO_PEDIDO_LABELS,
  type FiltroEstadoKds,
} from "../schema"
import DetalleComandaModal from "./Form"

/* -------------------------------------------------------------------------- */
/*                          Vista principal del KDS                            */
/* -------------------------------------------------------------------------- */

export default function KdsView() {
  const { puede } = useCan()
  // Ver el tablero lo exige la ruta (layout del workspace); aquí solo se decide si se puede despachar.
  const puedeDespachar = puede({ modulo: MODULO.KDS, accion: ACCION.DESPACHAR })

  const {
    tarjetas,
    isLoading,
    error,
    enVivo,
    recargar,
    filtro,
    setFiltro,
    contadores,
    procesando,
    cambiarItem,
    marcarTodoListo,
  } = useTableroKds()

  // Los minutos transcurridos se recalculan en el navegador cada medio minuto.
  const ahora = useAhora(30_000)

  const [pagina, setPagina] = React.useState(1)
  const [idDetalle, setIdDetalle] = React.useState<string | null>(null)
  // El detalle se busca en la lista viva: si el pedido sale de la cola, el modal se cierra solo.
  const detalle = idDetalle ? (tarjetas.find((t) => t.id_pedido === idDetalle) ?? null) : null

  const handleCambioFiltro = React.useCallback(
    (nuevoFiltro: FiltroEstadoKds) => {
      setFiltro(nuevoFiltro)
      setPagina(1)
    },
    [setFiltro],
  )

  const totalPaginas = Math.ceil(tarjetas.length / COMANDAS_POR_PAGINA)
  const paginaValida = Math.min(Math.max(1, pagina), Math.max(1, totalPaginas))

  const tarjetasPaginadas = React.useMemo(() => {
    const inicio = (paginaValida - 1) * COMANDAS_POR_PAGINA
    return tarjetas.slice(inicio, inicio + COMANDAS_POR_PAGINA)
  }, [tarjetas, paginaValida])

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Encabezado Responsivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-stone-100">Cocina y Barra</h1>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4C0107]/10 dark:bg-[#EDE5E6]/10 px-2.5 py-0.5 text-xs font-semibold text-[#4C0107] dark:text-[#EDE5E6]">
              {enVivo ? <Wifi className="size-3.5 text-emerald-600" /> : <WifiOff className="size-3.5 text-amber-600" />}
              {enVivo ? "En vivo" : "Actualización periódica"}
            </span>
            <span className="text-xs text-slate-400 dark:text-stone-500">·</span>
            <span className="text-xs font-medium text-slate-500 dark:text-stone-400">
              {contadores.todas} {contadores.todas === 1 ? "comanda en cola" : "comandas en cola"}
            </span>
          </div>
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

      {/* Barra de filtros por estado */}
      <FiltroEstados filtro={filtro} setFiltro={handleCambioFiltro} contadores={contadores} />

      {isLoading ? (
        <KdsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : tarjetas.length === 0 ? (
        <EmptyState filtro={filtro} onReset={() => handleCambioFiltro("todas")} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 items-stretch">
            {tarjetasPaginadas.map((tarjeta) => (
              <ComandaCard
                key={tarjeta.id_pedido}
                tarjeta={tarjeta}
                ahora={ahora}
                puedeDespachar={puedeDespachar}
                procesando={procesando}
                onCambiarItem={cambiarItem}
                onMarcarTodoListo={marcarTodoListo}
                onVerDetalle={() => setIdDetalle(tarjeta.id_pedido)}
              />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 dark:text-stone-400">
                Mostrando {(paginaValida - 1) * COMANDAS_POR_PAGINA + 1} -{" "}
                {Math.min(paginaValida * COMANDAS_POR_PAGINA, tarjetas.length)} de {tarjetas.length} comandas
              </span>

              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={paginaValida <= 1}
                      className={cn("cursor-pointer", paginaValida <= 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPaginas }).map((_, i) => {
                    const num = i + 1
                    return (
                      <PaginationItem key={num}>
                        <PaginationLink isActive={paginaValida === num} onClick={() => setPagina(num)} className="cursor-pointer">
                          {num}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaValida >= totalPaginas}
                      className={cn("cursor-pointer", paginaValida >= totalPaginas && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {detalle && <DetalleComandaModal tarjeta={detalle} ahora={ahora} onClose={() => setIdDetalle(null)} />}
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
  const opciones: FiltroEstadoKds[] = ["todas", "pendiente", "en_preparacion"]

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
                : "bg-white/80 dark:bg-stone-800/80 text-slate-600 dark:text-stone-300 hover:text-slate-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-800",
            )}
          >
            <Icono className="size-3.5 shrink-0" />
            <span>{label}</span>
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-bold",
                activo
                  ? "bg-white/20 text-white dark:bg-stone-900/30 dark:text-stone-900"
                  : "bg-slate-100 text-slate-600 dark:bg-stone-700 dark:text-stone-300",
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

interface ComandaCardProps {
  tarjeta: TarjetaKdsDto
  ahora: number
  puedeDespachar: boolean
  procesando: ReadonlySet<string>
  onCambiarItem: (idItem: string, estado: EstadoItemKds) => Promise<boolean>
  onMarcarTodoListo: (tarjeta: TarjetaKdsDto) => Promise<boolean>
  onVerDetalle: () => void
}

function ComandaCard({
  tarjeta,
  ahora,
  puedeDespachar,
  procesando,
  onCambiarItem,
  onMarcarTodoListo,
  onVerDetalle,
}: ComandaCardProps) {
  const estado = tarjeta.estado === "pendiente" || tarjeta.estado === "en_preparacion" ? tarjeta.estado : "pendiente"
  const config = ESTADO_COMANDA_CONFIG[estado]
  const Icono = config.icon
  const minutos = minutosDesde(tarjeta.fecha_creacion, ahora)
  const faltan = tarjeta.items.filter((i) => i.estado_kds !== "despachado").length
  const ocupada = tarjeta.items.some((i) => procesando.has(i.id_pedido_detalle))

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all duration-200 dark:bg-stone-900 overflow-hidden",
        config.border,
      )}
    >
      {/* Cabecera uniforme (shrink-0) */}
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold tracking-tight text-slate-900 dark:text-stone-100 text-sm sm:text-base truncate">
              {codigoComanda(tarjeta)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0",
                config.badge,
              )}
            >
              <Icono className="size-3" />
              {config.label}
            </span>
          </div>

          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold tabular-nums shrink-0 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-stone-800",
              urgenciaClass(minutos),
            )}
          >
            <Clock className="size-3.5" />
            {textoMinutos(minutos)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-stone-400">
          <span className="font-medium text-slate-700 dark:text-stone-200 truncate">{destinoComanda(tarjeta)}</span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="rounded-md bg-slate-200/60 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-stone-300">
              {TIPO_PEDIDO_LABELS[tarjeta.tipo_pedido]}
            </span>
            <button
              type="button"
              onClick={onVerDetalle}
              title="Ver detalle completo"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-stone-200 hover:bg-slate-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <Eye className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Productos de la comanda (flex-1 para absorber espacio y empujar el footer) */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto max-h-[260px] sm:max-h-[320px] no-scrollbar">
        <ul className="flex flex-col gap-3">
          {tarjeta.items.map((item) => (
            <ItemFila
              key={item.id_pedido_detalle}
              item={item}
              puedeDespachar={puedeDespachar}
              deshabilitado={procesando.has(item.id_pedido_detalle)}
              onCambiar={onCambiarItem}
            />
          ))}
        </ul>
      </div>

      {/* Pie: una acción para terminar todo el pedido */}
      <div className="mt-auto shrink-0 border-t border-slate-100 bg-slate-50/40 p-3.5 dark:border-stone-800 dark:bg-stone-950/20 min-h-[58px] flex items-center">
        {puedeDespachar ? (
          <button
            type="button"
            onClick={() => void onMarcarTodoListo(tarjeta)}
            disabled={ocupada || faltan === 0}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400"
          >
            <CheckCheck className="size-4 shrink-0" />
            <span className="truncate">{faltan === 0 ? "Todo listo" : `Marcar todo listo (${faltan})`}</span>
          </button>
        ) : (
          <span className="w-full text-center text-xs font-medium text-slate-500 dark:text-stone-400">
            {faltan === 0 ? "Todo listo" : `${faltan} por preparar`}
          </span>
        )}
      </div>
    </div>
  )
}

function ItemFila({
  item,
  puedeDespachar,
  deshabilitado,
  onCambiar,
}: {
  item: ItemKdsDto
  puedeDespachar: boolean
  deshabilitado: boolean
  onCambiar: (idItem: string, estado: EstadoItemKds) => Promise<boolean>
}) {
  const estado = ESTADO_ITEM_CONFIG[item.estado_kds]
  const Icono = estado.icon
  const modificadores = textoModificadores(item)

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 text-sm leading-tight min-w-0">
          <span className="inline-flex min-w-[22px] h-5 items-center justify-center rounded bg-[#4C0107]/10 text-[#4C0107] dark:bg-stone-800 dark:text-stone-200 text-xs font-bold px-1 shrink-0">
            {item.cantidad}x
          </span>
          <span
            className={cn(
              "font-medium text-slate-800 dark:text-stone-200 text-xs sm:text-sm",
              item.completado && "text-slate-400 line-through dark:text-stone-500",
            )}
          >
            {item.nombre_producto}
          </span>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", estado.chip)}>
          <Icono className="size-3" />
          {estado.label}
        </span>
      </div>

      {modificadores && <span className="text-[11px] text-slate-500 dark:text-stone-400 pl-7 leading-tight">{modificadores}</span>}
      {item.notas_preparacion && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-1.5 py-0.5 w-fit ml-7">
          📝 {item.notas_preparacion}
        </span>
      )}

      {puedeDespachar && (
        <div className="flex flex-wrap items-center gap-1.5 pl-7">
          {item.estado_kds === "cola" && (
            <AccionItem texto="Preparar" disabled={deshabilitado} onClick={() => void onCambiar(item.id_pedido_detalle, "preparando")} />
          )}
          {item.estado_kds !== "despachado" && (
            <AccionItem texto="Listo" fuerte disabled={deshabilitado} onClick={() => void onCambiar(item.id_pedido_detalle, "despachado")} />
          )}
          {item.estado_kds === "preparando" && (
            <AccionItem
              texto="Regresar"
              icono={<Undo2 className="size-3" />}
              disabled={deshabilitado}
              onClick={() => void onCambiar(item.id_pedido_detalle, "cola")}
            />
          )}
          {item.estado_kds === "despachado" && (
            <AccionItem
              texto="Rehacer"
              icono={<Undo2 className="size-3" />}
              disabled={deshabilitado}
              onClick={() => void onCambiar(item.id_pedido_detalle, "preparando")}
            />
          )}
        </div>
      )}
    </li>
  )
}

function AccionItem({
  texto,
  icono,
  fuerte = false,
  disabled,
  onClick,
}: {
  texto: string
  icono?: React.ReactNode
  fuerte?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        fuerte
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
      )}
    >
      {icono}
      {texto}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Estados especiales                             */
/* -------------------------------------------------------------------------- */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-800">
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-800">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-[#E7B7BC]">
        <UtensilsCrossed className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-stone-100">Sin comandas</h2>
        <p className="max-w-sm text-sm text-slate-500 dark:text-stone-400">
          {filtro === "todas" ? "No hay comandas en la cola en este momento." : "No hay comandas con el estado seleccionado."}
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
