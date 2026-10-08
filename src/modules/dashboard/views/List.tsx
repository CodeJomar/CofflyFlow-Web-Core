"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, ClipboardList, Coins, Grid2X2, ReceiptText, RefreshCw, Wallet } from "lucide-react"

import type { DashboardResumenDto } from "@/dtos/dashboard"
import { ESTADOS_PEDIDO } from "@/dtos/pedidos"
import { useCan } from "@/modules/auth"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyContent, EmptyDescription } from "@/shared/components/ui/empty"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { ACCION, MODULO } from "@/shared/constants/permisos"
import { cn } from "@/shared/utils/cn"
import { formatToCurrency } from "@/shared/utils/formatters"

import { useDashboard } from "../hooks"
import { ESTADO_PEDIDO_CLASS, panelClass } from "../components"
import {
  DASHBOARD_REFRESH_MS,
  ESTADO_PEDIDO_LABELS,
  METODO_PAGO_LABELS,
  PERIODO_LABELS,
  periodoDashboardSchema,
  type DashboardKpi,
  type PeriodoDashboard,
  type TipoKpi,
} from "../schema"

const KPI_ICONS: Record<TipoKpi, React.ReactNode> = {
  ventas: <Coins className="size-4" />,
  pedidos: <ClipboardList className="size-4" />,
  mesas: <Grid2X2 className="size-4" />,
  ticket: <ReceiptText className="size-4" />,
}

const DETALLE_PERIODO: Record<PeriodoDashboard, string> = {
  hoy: "Hoy",
  semana: "Últimos 7 días",
  mes: "Últimos 30 días",
}

/** Arma las tarjetas de KPI a partir del resumen de la API (las ventas ya son netas de devoluciones). */
function armarKpis(data: DashboardResumenDto): DashboardKpi[] {
  const { kpis, pedidos, salon_en_vivo: salon } = data
  return [
    {
      id: "ventas",
      titulo: "Ventas netas",
      valor: formatToCurrency(kpis.ventas_totales),
      detalle: `Devoluciones ${formatToCurrency(kpis.devoluciones)}`,
    },
    {
      id: "pedidos",
      titulo: "Pedidos activos",
      valor: String(pedidos.activos.total),
      detalle: `${pedidos.activos.pendientes} pend. · ${pedidos.activos.en_preparacion} prep. · ${pedidos.activos.listos_sin_cobrar} listos`,
    },
    {
      id: "mesas",
      titulo: "Mesas ocupadas",
      valor: salon.porcentaje_ocupacion,
      detalle: `${salon.ocupadas} de ${salon.total_mesas} mesas`,
    },
    {
      id: "ticket",
      titulo: "Ticket promedio",
      valor: formatToCurrency(kpis.ticket_promedio),
      detalle: `${kpis.pedidos_atendidos} pedidos atendidos`,
    },
  ]
}

export default function DashboardView() {
  const { periodo, cambiarPeriodo, data, actualizadoEn, isLoading, isRefreshing, error, recargar } = useDashboard()
  const { puede } = useCan()
  const puedeVerTransacciones = puede({ modulo: MODULO.TRANSACTIONS, accion: ACCION.LEER })

  return (
    <div className="flex flex-col gap-6 pb-2">
      {/* Header del módulo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-stone-100">
            Panel de control
          </h1>
          <IndicadorEnVivo actualizadoEn={actualizadoEn ?? undefined} isRefreshing={isRefreshing} />
        </div>

        <Tabs
          value={periodo}
          onValueChange={(value) => {
            const parsed = periodoDashboardSchema.safeParse(value)
            if (parsed.success) cambiarPeriodo(parsed.data)
          }}
          className="w-auto"
        >
          <TabsList className="h-9 p-1 border-none shadow-none bg-[#EDE5E6]/50 dark:bg-stone-800">
            {periodoDashboardSchema.options.map((p) => (
              <TabsTrigger
                key={p}
                value={p}
                className="h-7 px-4 text-xs text-slate-600 dark:text-stone-300"
              >
                {PERIODO_LABELS[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        <div
          className={cn(
            "grid grid-cols-12 gap-4 lg:gap-5 transition-opacity",
            isLoading && "opacity-60 pointer-events-none"
          )}
          aria-busy={isLoading}
        >
          {/* Fila 1: KPIs principales (4 métricas x 3 columnas = 12 cols) */}
          {armarKpis(data).map((kpi) => (
            <div key={kpi.id} className="col-span-12 sm:col-span-6 xl:col-span-3">
              <KpiCard kpi={kpi} />
            </div>
          ))}

          {/* Fila 2: Distribución de pagos (8 cols) + Estado de caja (4 cols) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col">
            <DistribucionPagos data={data} periodo={periodo} className="h-full" />
          </div>
          <div className="col-span-12 xl:col-span-4 flex flex-col">
            <CajaResumen caja={data.caja_actual} enlace={puedeVerTransacciones} className="h-full" />
          </div>

          {/* Fila 3: Pedidos del periodo (8 cols) + Top productos (4 cols) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col">
            <PedidosDelPeriodo data={data} enlace={puedeVerTransacciones} className="h-full" />
          </div>
          <div className="col-span-12 xl:col-span-4 flex flex-col">
            <ProductosTop productos={data.top_productos} className="h-full" />
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   KPIs                                     */
/* -------------------------------------------------------------------------- */

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const destacado = kpi.id === "pedidos"

  return (
    <div className={cn(panelClass, "flex h-28 flex-col justify-between p-3.5")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">
          {kpi.titulo}
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
          {KPI_ICONS[kpi.id]}
        </span>
      </div>

      <span
        className={cn(
          "text-2xl sm:text-3xl font-bold tracking-tight tabular-nums",
          destacado ? "text-[#4C0107] dark:text-[#E7B7BC]" : "text-slate-900 dark:text-stone-100"
        )}
      >
        {kpi.valor}
      </span>

      <span className="truncate text-xs text-slate-500 dark:text-stone-400">{kpi.detalle}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                            Distribución de pagos                           */
/* -------------------------------------------------------------------------- */

function DistribucionPagos({
  data,
  periodo,
  className,
}: {
  data: DashboardResumenDto
  periodo: PeriodoDashboard
  className?: string
}) {
  const pagos = data.distribucion_pagos

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader title="Ventas por método de pago" subtitle={`Periodo: ${DETALLE_PERIODO[periodo]}`} />

      {pagos.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-stone-400">
          Aún no hay cobros en este periodo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pagos.map((pago) => (
            <li key={pago.metodo} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-900 dark:text-stone-100">
                  {METODO_PAGO_LABELS[pago.metodo]}
                  <span className="ml-2 font-normal text-slate-500 dark:text-stone-400">
                    {pago.cobros} {pago.cobros === 1 ? "cobro" : "cobros"}
                  </span>
                </span>
                <span className="tabular-nums text-slate-700 dark:text-stone-200">
                  {formatToCurrency(pago.monto)} · {pago.porcentaje}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-stone-800">
                <div
                  className="h-full rounded-full bg-[#4C0107] transition-all dark:bg-[#E7B7BC]"
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(pago.porcentaje) || 0))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Caja                                     */
/* -------------------------------------------------------------------------- */

function CajaResumen({
  caja,
  enlace,
  className,
}: {
  caja: DashboardResumenDto["caja_actual"]
  enlace: boolean
  className?: string
}) {
  const abierta = caja?.abierta === true

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader
        title="Estado de caja"
        subtitle={caja?.abierta ? `Apertura ${caja.desde} · ${caja.abierta_por}` : undefined}
        action={
          caja ? (
            <Badge
              variant="estado"
              className={cn(
                abierta
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-300"
              )}
            >
              {abierta ? "Abierta" : "Cerrada"}
            </Badge>
          ) : undefined
        }
      />

      {!caja ? (
        <p className="py-6 text-center text-xs text-slate-500 dark:text-stone-400">
          Tu cargo no tiene acceso al detalle de caja.
        </p>
      ) : !caja.abierta ? (
        <p className="py-6 text-center text-xs text-slate-500 dark:text-stone-400">No hay un turno de caja abierto.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-[#4C0107] p-3 text-white dark:bg-stone-800">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
              <Wallet className="size-4.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-white/75 dark:text-stone-400">Efectivo esperado en caja</span>
              <span className="text-xl font-bold tabular-nums dark:text-stone-100">
                {formatToCurrency(caja.efectivo_esperado)}
              </span>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
            <li className="flex items-center justify-between py-2 text-xs">
              <span className="text-slate-600 dark:text-stone-400">Monto inicial</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">
                {formatToCurrency(caja.monto_inicial)}
              </span>
            </li>
          </ul>
        </>
      )}

      {enlace && (
        <Link
          href="/transacciones/cajas"
          className="mt-auto inline-flex items-center gap-1 self-start pt-1 text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC]"
        >
          Gestionar cajas <ChevronRight className="size-3.5" />
        </Link>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                             Pedidos del periodo                            */
/* -------------------------------------------------------------------------- */

function PedidosDelPeriodo({
  data,
  enlace,
  className,
}: {
  data: DashboardResumenDto
  enlace: boolean
  className?: string
}) {
  const { del_periodo: porEstado, activos } = data.pedidos
  const total = ESTADOS_PEDIDO.reduce((suma, estado) => suma + (porEstado[estado] ?? 0), 0)

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader
        title="Pedidos del periodo"
        subtitle={`${total} ${total === 1 ? "pedido" : "pedidos"} · preparación promedio ${data.kpis.tiempo_promedio_preparacion_minutos} min`}
        action={
          enlace ? (
            <Link
              href="/transacciones/pedidos"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC]"
            >
              Ver todos <ChevronRight className="size-3.5" />
            </Link>
          ) : undefined
        }
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ESTADOS_PEDIDO.map((estado) => (
          <li
            key={estado}
            className="flex flex-col items-start gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
          >
            <Badge variant="estado" className={ESTADO_PEDIDO_CLASS[estado]}>
              {ESTADO_PEDIDO_LABELS[estado]}
            </Badge>
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-stone-100">
              {porEstado[estado] ?? 0}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-auto border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-stone-800/80 dark:text-stone-400">
        Ahora mismo: {activos.pendientes} pendientes, {activos.en_preparacion} en preparación y{" "}
        {activos.listos_sin_cobrar} listos sin cobrar.
      </p>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                           Productos más vendidos                           */
/* -------------------------------------------------------------------------- */

const PRODUCTOS_POR_PAGINA = 5

function ProductosTop({
  productos,
  className,
}: {
  productos: DashboardResumenDto["top_productos"]
  className?: string
}) {
  const visibles = productos.slice(0, PRODUCTOS_POR_PAGINA)
  const maxUnidades = Math.max(...visibles.map((p) => p.unidades_vendidas), 1)

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader title="Más vendidos" subtitle="Ranking de ventas" />

      {visibles.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500 dark:text-stone-400">Aún no hay ventas en este periodo.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {visibles.map((producto, index) => (
            <li key={producto.id_producto} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EDE5E6] text-[11px] font-bold text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
                    {index + 1}
                  </span>
                  <span className="truncate text-xs font-semibold text-slate-900 dark:text-stone-100">
                    {producto.nombre}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-stone-100">
                    {producto.unidades_vendidas} u.
                  </span>
                  <span className="text-[10px] tabular-nums text-slate-500 dark:text-stone-400">
                    {formatToCurrency(producto.total_recaudado)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-stone-800">
                <div
                  className="h-full rounded-full bg-[#4C0107] transition-all dark:bg-[#E7B7BC]"
                  style={{ width: `${(producto.unidades_vendidas / maxUnidades) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Auxiliares                                 */
/* -------------------------------------------------------------------------- */

function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-stone-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-stone-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function IndicadorEnVivo({
  actualizadoEn,
  isRefreshing,
}: {
  actualizadoEn?: string
  isRefreshing: boolean
}) {
  const hora = actualizadoEn
    ? new Date(actualizadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-stone-400" aria-live="polite">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-semibold text-emerald-700 dark:text-emerald-400">En vivo</span>
      <span>·</span>
      <span>
        {isRefreshing
          ? "Actualizando…"
          : hora
            ? `Actualizado ${hora}`
            : "Conectando…"}
      </span>
      <span className="hidden sm:inline">· cada {DASHBOARD_REFRESH_MS / 1000} s</span>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty>
      <EmptyDescription>{message}</EmptyDescription>
      <EmptyContent>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-4" />}
          className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-5" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="col-span-12 sm:col-span-6 xl:col-span-3">
          <Skeleton className="h-28 rounded-2xl dark:bg-stone-800" />
        </div>
      ))}
      <div className="col-span-12 xl:col-span-8">
        <Skeleton className="h-72 rounded-2xl dark:bg-stone-800" />
      </div>
      <div className="col-span-12 xl:col-span-4">
        <Skeleton className="h-72 rounded-2xl dark:bg-stone-800" />
      </div>
      <div className="col-span-12 xl:col-span-8">
        <Skeleton className="h-64 rounded-2xl dark:bg-stone-800" />
      </div>
      <div className="col-span-12 xl:col-span-4">
        <Skeleton className="h-64 rounded-2xl dark:bg-stone-800" />
      </div>
    </div>
  )
}
