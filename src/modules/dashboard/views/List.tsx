"use client"

import * as React from "react"
import Link from "next/link"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Coins,
  Grid2X2,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from "lucide-react"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"
import { Badge } from "@/shared/components/ui/badge"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/components/ui/empty"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Button } from "@/shared/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination"
import { cn } from "@/shared/utils/cn"
import { formatToCurrency } from "@/shared/utils/formatters"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import { useDashboard } from "../hooks"
import { ESTADO_PEDIDO_CONFIG, ventasChartConfig } from "../components"
import {
  DASHBOARD_REFRESH_MS,
  PERIODO_LABELS,
  periodoDashboardSchema,
  type DashboardKpi,
  type DashboardResumen,
  type EstadoCaja,
  type PedidoReciente,
  type ProductoTop,
  type TipoKpi,
} from "../schema"

const KPI_ICONS: Record<TipoKpi, React.ReactNode> = {
  ventas: <Coins className="size-4" />,
  pedidos: <ClipboardList className="size-4" />,
  mesas: <Grid2X2 className="size-4" />,
  ticket: <ReceiptText className="size-4" />,
}

// Superficie base de los paneles del dashboard (claro / oscuro)
const panelClass =
  "rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-stone-800 dark:bg-stone-950/40 transition-colors"

export default function DashboardView() {
  const { rol } = useWorkspaceLayout()
  const puedeVer = tienePermiso(rol, PERMISO.READ_DASHBOARD)

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} />

  return <DashboardContenido />
}

function DashboardContenido() {
  const { periodo, cambiarPeriodo, data, isLoading, isRefreshing, error, recargar } = useDashboard()

  return (
    <div className="flex flex-col gap-6 pb-2">
      {/* Header del módulo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-stone-100">
            Panel de control
          </h1>
          <IndicadorEnVivo actualizadoEn={data?.actualizadoEn} isRefreshing={isRefreshing} />
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

      {error ? (
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
          {/* Fila 1: KPIs Principales (4 métricas x 3 columnas = 12 cols) */}
          <KpiGrid kpis={data.kpis} />

          {/* Fila 2: Analítica de Ventas (8 cols) + Estado de Caja (4 cols) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col">
            <VentasChart data={data} className="h-full" />
          </div>
          <div className="col-span-12 xl:col-span-4 flex flex-col">
            <CajaResumen caja={data.caja} className="h-full" />
          </div>

          {/* Fila 3: Flujo Operativo de Pedidos (8 cols) + Top Productos (4 cols) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col">
            <PedidosRecientes pedidos={data.pedidosRecientes} className="h-full" />
          </div>
          <div className="col-span-12 xl:col-span-4 flex flex-col">
            <ProductosTop productos={data.productosTop} className="h-full" />
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   KPIs                                     */
/* -------------------------------------------------------------------------- */

function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <>
      {kpis.map((kpi) => (
        <div key={kpi.id} className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KpiCard kpi={kpi} />
        </div>
      ))}
    </>
  )
}

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const esPositiva = (kpi.variacion ?? 0) >= 0
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

      <div className="flex items-center gap-1.5 text-xs">
        {kpi.variacion !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              esPositiva
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {esPositiva ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(kpi.variacion).toFixed(1)}%
          </span>
        )}
        <span className="truncate text-slate-500 dark:text-stone-400">{kpi.detalle}</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Gráfico ventas                               */
/* -------------------------------------------------------------------------- */

function VentasChart({ data, className }: { data: DashboardResumen; className?: string }) {
  const titulo = data.periodo === "hoy" ? "Ventas por hora" : data.periodo === "semana" ? "Ventas por día" : "Ventas por semana"

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader title={titulo} subtitle={`Periodo: ${PERIODO_LABELS[data.periodo]}`} />

      <ChartContainer config={ventasChartConfig} className="aspect-auto h-52 sm:h-56 w-full">
        <AreaChart data={data.ventas} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-ventas)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-ventas)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="tramo" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => `S/ ${value}`}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {ventasChartConfig[name as keyof typeof ventasChartConfig]?.label ?? name}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {name === "ventas" ? formatToCurrency(Number(value)) : value}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="ventas"
            type="monotone"
            fill="url(#fillVentas)"
            stroke="var(--color-ventas)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Caja                                     */
/* -------------------------------------------------------------------------- */

function CajaResumen({ caja, className }: { caja: EstadoCaja; className?: string }) {
  const total = caja.montoInicial + caja.efectivo + caja.digital
  const filas = [
    { label: "Monto inicial", valor: caja.montoInicial },
    { label: "Ventas en efectivo", valor: caja.efectivo },
    { label: "Ventas digitales", valor: caja.digital },
  ]

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader
        title="Estado de caja"
        subtitle={`Apertura ${caja.apertura} · ${caja.responsable}`}
        action={
          <Badge
            variant="estado"
            className={cn(
              caja.abierta
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-300"
            )}
          >
            {caja.abierta ? "Abierta" : "Cerrada"}
          </Badge>
        }
      />

      <div className="flex items-center gap-3 rounded-xl bg-[#4C0107] p-3 text-white dark:bg-stone-800">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
          <Wallet className="size-4.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-white/75 dark:text-stone-400">Total en caja</span>
          <span className="text-xl font-bold tabular-nums dark:text-stone-100">{formatToCurrency(total)}</span>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
        {filas.map((fila) => (
          <li key={fila.label} className="flex items-center justify-between py-2 text-xs">
            <span className="text-slate-600 dark:text-stone-400">{fila.label}</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">
              {formatToCurrency(fila.valor)}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/transacciones/cajas"
        className="mt-auto inline-flex items-center gap-1 self-start pt-1 text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC]"
      >
        Gestionar cajas <ChevronRight className="size-3.5" />
      </Link>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                             Pedidos recientes                              */
/* -------------------------------------------------------------------------- */

const PEDIDOS_POR_PAGINA = 3

function PedidosRecientes({ pedidos, className }: { pedidos: PedidoReciente[]; className?: string }) {
  const [paginaActual, setPaginaActual] = React.useState(1)
  const totalPaginas = Math.max(1, Math.ceil(pedidos.length / PEDIDOS_POR_PAGINA))
  const paginaSegura = Math.min(paginaActual, totalPaginas)

  const pedidosPaginados = React.useMemo(() => {
    const inicio = (paginaSegura - 1) * PEDIDOS_POR_PAGINA
    return pedidos.slice(inicio, inicio + PEDIDOS_POR_PAGINA)
  }, [pedidos, paginaSegura])

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader
        title="Pedidos recientes"
        subtitle="Últimos movimientos del local"
        action={
          <Link
            href="/transacciones/pedidos"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC]"
          >
            Ver todos <ChevronRight className="size-3.5" />
          </Link>
        }
      />

      <div className="overflow-x-auto no-scrollbar">
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="h-auto px-0 pb-2 text-xs font-semibold">Pedido</TableHead>
              <TableHead className="h-auto px-0 pb-2 text-xs font-semibold">Mesa</TableHead>
              <TableHead className="h-auto px-0 pb-2 text-xs font-semibold">Cliente</TableHead>
              <TableHead className="h-auto px-0 pb-2 text-xs font-semibold">Estado</TableHead>
              <TableHead className="h-auto px-0 pb-2 text-right text-xs font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidosPaginados.map((pedido) => {
              const estado = ESTADO_PEDIDO_CONFIG[pedido.estado]
              return (
                <TableRow
                  key={pedido.id}
                  className="text-slate-700 hover:bg-transparent dark:text-stone-300"
                >
                  <TableCell className="px-0 py-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-stone-100">{pedido.codigo}</span>
                      <span className="text-[11px] text-slate-500 dark:text-stone-500">{pedido.hora}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-0 py-2 text-xs">{pedido.mesa}</TableCell>
                  <TableCell className="px-0 py-2 text-xs">{pedido.cliente}</TableCell>
                  <TableCell className="px-0 py-2">
                    <Badge variant="estado" className={estado.className}>{estado.label}</Badge>
                  </TableCell>
                  <TableCell className="px-0 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-stone-100">
                    {formatToCurrency(pedido.total)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-stone-800/80 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-500 dark:text-stone-400">
          Mostrando {pedidosPaginados.length > 0 ? (paginaSegura - 1) * PEDIDOS_POR_PAGINA + 1 : 0}–
          {Math.min(paginaSegura * PEDIDOS_POR_PAGINA, pedidos.length)} de {pedidos.length}
        </span>

        {totalPaginas > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura === 1}
                  className={paginaSegura === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <PaginationItem key={num}>
                  <PaginationLink
                    isActive={paginaSegura === num}
                    onClick={() => setPaginaActual(num)}
                    className="cursor-pointer"
                  >
                    {num}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura === totalPaginas}
                  className={paginaSegura === totalPaginas ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                           Productos más vendidos                           */
/* -------------------------------------------------------------------------- */

const PRODUCTOS_POR_PAGINA = 3

function ProductosTop({ productos, className }: { productos: ProductoTop[]; className?: string }) {
  const [paginaActual, setPaginaActual] = React.useState(1)
  const totalPaginas = Math.max(1, Math.ceil(productos.length / PRODUCTOS_POR_PAGINA))
  const paginaSegura = Math.min(paginaActual, totalPaginas)

  const productosPaginados = React.useMemo(() => {
    const inicio = (paginaSegura - 1) * PRODUCTOS_POR_PAGINA
    return productos.slice(inicio, inicio + PRODUCTOS_POR_PAGINA)
  }, [productos, paginaSegura])

  const maxUnidades = Math.max(...productos.map((p) => p.unidades), 1)

  return (
    <section className={cn(panelClass, "flex flex-col gap-3 p-4 lg:p-5", className)}>
      <PanelHeader title="Más vendidos" subtitle="Ranking de ventas" />

      <ol className="flex flex-col gap-2.5">
        {productosPaginados.map((producto, index) => {
          const ranking = (paginaSegura - 1) * PRODUCTOS_POR_PAGINA + index + 1
          return (
            <li key={producto.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EDE5E6] text-[11px] font-bold text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
                    {ranking}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-900 dark:text-stone-100">{producto.nombre}</span>
                    <span className="truncate text-[10px] text-slate-500 dark:text-stone-400">{producto.categoria}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-stone-100">{producto.unidades} u.</span>
                  <span className="text-[10px] tabular-nums text-slate-500 dark:text-stone-400">
                    {formatToCurrency(producto.ingresos)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-stone-800">
                <div
                  className="h-full rounded-full bg-[#4C0107] transition-all dark:bg-[#E7B7BC]"
                  style={{ width: `${(producto.unidades / maxUnidades) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-stone-800/80 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-500 dark:text-stone-400">
          Mostrando {productosPaginados.length > 0 ? (paginaSegura - 1) * PRODUCTOS_POR_PAGINA + 1 : 0}–
          {Math.min(paginaSegura * PRODUCTOS_POR_PAGINA, productos.length)} de {productos.length}
        </span>

        {totalPaginas > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura === 1}
                  className={paginaSegura === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <PaginationItem key={num}>
                  <PaginationLink
                    isActive={paginaSegura === num}
                    onClick={() => setPaginaActual(num)}
                    className="cursor-pointer"
                  >
                    {num}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura === totalPaginas}
                  className={paginaSegura === totalPaginas ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
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

function AccesoRestringido({ rol }: { rol: string }) {
  return (
    <Empty>
      <EmptyMedia variant="icon">
        <ShieldAlert />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Acceso restringido</EmptyTitle>
        <EmptyDescription>
          Las métricas del dashboard solo están disponibles para el Dueño y el Administrador. Tu rol actual es{" "}
          <span className="font-semibold text-slate-700 dark:text-stone-200">{rol}</span>.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
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
