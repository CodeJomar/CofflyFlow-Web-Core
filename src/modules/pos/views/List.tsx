"use client"

import * as React from "react"
import {
  ChefHat,
  Clock,
  Coffee,
  Grid2X2,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  Utensils,
  X,
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
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
import { formatToCurrency } from "@/shared/utils/formatters"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import CobroForm, { ComandaDespachadaModal, PersonalizarProductoModal } from "./Form"
import { useCarrito, useCatalogoPos, useComandaCocina } from "../hooks"
import {
  getAreaIcon,
  ESTADO_MESA_CONFIG,
  getCategoriaConfig,
  opcionClass,
  panelClass,
} from "../components"
import {
  ESTADO_MESA_LABELS,
  MAX_CANTIDAD_ITEM,
  TIPO_PEDIDO_LABELS,
  tipoPedidoSchema,
  type AreaMesa,
  type CategoriaPos,
  type EstadoMesa,
  type FiltroCategoria,
  type ItemCarrito,
  type MesaPos,
  type ProductoPos,
  type TipoPedido,
  type TotalesCarrito,
} from "../schema"

export default function PosView() {
  const { rol } = useWorkspaceLayout()

  if (!tienePermiso(rol, PERMISO.READ_POS)) return <AccesoRestringido rol={ROL_LABELS[rol]} />

  return <PosContenido puedeCobrar={tienePermiso(rol, PERMISO.CREATE_ORDER)} />
}

function PosContenido({ puedeCobrar }: { puedeCobrar: boolean }) {
  const {
    catalogo,
    productosFiltrados,
    busqueda,
    setBusqueda,
    categoria,
    setCategoria,
    isLoading,
    error,
    recargar,
    setEstadoMesaLocal,
  } = useCatalogoPos()

  const { items, agregar, cambiarCantidad, quitar, vaciar, totales, cantidades } = useCarrito()

  // RF-10: productos marcados como Agotado desde el Menú (no se pueden sumar más unidades)
  const productosAgotados = React.useMemo(
    () => new Set((catalogo?.productos ?? []).filter((p) => !p.disponible).map((p) => p.id)),
    [catalogo]
  )
  const { despachar, isSending: enviandoComanda, comandaEnviada, limpiar: limpiarComanda } = useComandaCocina()

  // Vista activa: "catalogo" o "mesas" (RF-04)
  const [vistaActiva, setVistaActiva] = React.useState<"catalogo" | "mesas">("catalogo")
  const [areaFiltroSeleccionada, setAreaFiltroMesas] = React.useState<AreaMesa | "todas">("todas")

  // Paginación en Catálogo y Mesas para evitar scroll vertical
  const PRODUCTOS_POR_PAGINA = 8
  const [paginaCatalogo, setPaginaCatalogo] = React.useState(1)

  const MESAS_POR_PAGINA = 8
  const [paginaMesas, setPaginaMesas] = React.useState(1)

  const handleCambiarBusqueda = (valor: string) => {
    setBusqueda(valor)
    setPaginaCatalogo(1)
  }

  const handleCambiarCategoria = (cat: FiltroCategoria) => {
    setCategoria(cat)
    setPaginaCatalogo(1)
  }

  const handleCambiarAreaMesas = (area: AreaMesa | "todas") => {
    setAreaFiltroMesas(area)
    setPaginaMesas(1)
  }

  // RF-12: las áreas se administran desde Local y Equipo; si el área filtrada se elimina, se muestran todas
  const nombresArea = React.useMemo(
    () => new Map((catalogo?.areas ?? []).map((a) => [a.id, a.nombre])),
    [catalogo]
  )
  const nombreArea = React.useCallback((id: AreaMesa) => nombresArea.get(id) ?? "Sin área", [nombresArea])
  const areaFiltroMesas =
    areaFiltroSeleccionada !== "todas" && nombresArea.has(areaFiltroSeleccionada) ? areaFiltroSeleccionada : "todas"

  const totalPaginasCatalogo = Math.max(1, Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA))
  const paginaCatalogoSegura = Math.min(paginaCatalogo, totalPaginasCatalogo)

  const productosPaginados = React.useMemo(() => {
    const inicio = (paginaCatalogoSegura - 1) * PRODUCTOS_POR_PAGINA
    return productosFiltrados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA)
  }, [productosFiltrados, paginaCatalogoSegura])

  const mesasFiltradas = React.useMemo(() => {
    if (!catalogo) return []
    return catalogo.mesas.filter((m) => areaFiltroMesas === "todas" || m.area === areaFiltroMesas)
  }, [catalogo, areaFiltroMesas])

  const totalPaginasMesas = Math.max(1, Math.ceil(mesasFiltradas.length / MESAS_POR_PAGINA))
  const paginaMesasSegura = Math.min(paginaMesas, totalPaginasMesas)

  const mesasPaginadas = React.useMemo(() => {
    const inicio = (paginaMesasSegura - 1) * MESAS_POR_PAGINA
    return mesasFiltradas.slice(inicio, inicio + MESAS_POR_PAGINA)
  }, [mesasFiltradas, paginaMesasSegura])

  // Estado del pedido
  const [tipoPedido, setTipoPedido] = React.useState<TipoPedido>("mesa")
  const [mesaSeleccionadaId, setMesaSeleccionadaId] = React.useState<string | null>(null)

  const mesaSeleccionada = React.useMemo(
    () => catalogo?.mesas.find((m) => m.id === mesaSeleccionadaId) ?? null,
    [catalogo, mesaSeleccionadaId]
  )

  // Modales
  const [cobroAbierto, setCobroAbierto] = React.useState(false)
  const [productoParaPersonalizar, setProductoParaPersonalizar] = React.useState<ProductoPos | null>(null)

  const busquedaRef = React.useRef<HTMLInputElement>(null)

  // Atajo "/" para enfocar el buscador del catálogo
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const escribiendo = target?.closest("input, textarea, select, [contenteditable='true']")
      if (e.key === "/" && !escribiendo) {
        e.preventDefault()
        setVistaActiva("catalogo")
        busquedaRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const faltaMesa = tipoPedido === "mesa" && !mesaSeleccionada
  const puedeOperar = puedeCobrar && items.length > 0 && !faltaMesa

  // RF-06: Despacho directo de comanda a cocina con un solo toque
  const handleEnviarCocina = async () => {
    if (!puedeOperar) return

    const mesaNombre = tipoPedido === "mesa" ? mesaSeleccionada?.nombre : "Para llevar"
    const resultado = await despachar({
      mesaId: mesaSeleccionada?.id,
      mesaNombre,
      tipoPedido,
      mozoEmisor: "Jomar Peralta",
      items,
    })

    if (resultado && mesaSeleccionada) {
      await setEstadoMesaLocal(mesaSeleccionada.id, "ocupada")
    }
  }

  const handleCerrarComandaEnviada = () => {
    limpiarComanda()
    vaciar()
  }

  const finalizarVenta = () => {
    vaciar()
    setMesaSeleccionadaId(null)
    setCobroAbierto(false)
  }

  const handleSeleccionarMesa = (mesa: MesaPos) => {
    setMesaSeleccionadaId(mesa.id)
    setTipoPedido("mesa")
    setVistaActiva("catalogo")
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* Header del módulo con selector de vistas: Catálogo / Mapa de Mesas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-stone-100">
            Terminal POS
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Caja activa
          </span>
        </div>

        {/* Pestañas de Vista: Catálogo / Mesas (RF-04) responsivas */}
        <div className="flex w-full sm:w-auto items-center gap-1 rounded-full bg-[#EDE5E6]/60 p-1 dark:bg-stone-800">
          <button
            type="button"
            onClick={() => setVistaActiva("catalogo")}
            className={cn(
              "inline-flex flex-1 sm:flex-initial h-8 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-all cursor-pointer",
              vistaActiva === "catalogo"
                ? "bg-[#4C0107] text-white shadow-sm dark:bg-stone-100 dark:text-stone-900"
                : "text-slate-600 hover:text-slate-900 dark:text-stone-300 dark:hover:text-white"
            )}
          >
            <Coffee className="size-3.5 shrink-0" />
            <span>Catálogo</span>
          </button>
          <button
            type="button"
            onClick={() => setVistaActiva("mesas")}
            className={cn(
              "inline-flex flex-1 sm:flex-initial h-8 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-all cursor-pointer",
              vistaActiva === "mesas"
                ? "bg-[#4C0107] text-white shadow-sm dark:bg-stone-100 dark:text-stone-900"
                : "text-slate-600 hover:text-slate-900 dark:text-stone-300 dark:hover:text-white"
            )}
          >
            <Grid2X2 className="size-3.5 shrink-0" />
            <span>Mapa de Mesas</span>
            {catalogo && (
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] dark:bg-white/20">
                {catalogo.mesas.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Grid de 12 Columnas del POS (7:5 en lg, 8:4 en xl) */}
      <div className="grid grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* Panel Izquierdo: Catálogo de Productos O Mapa de Mesas (RF-04) */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col">
          {vistaActiva === "catalogo" ? (
            <section
              className={cn(panelClass, "flex min-w-0 flex-col gap-3.5 p-4 lg:p-5 h-full")}
              aria-label="Catálogo de productos"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
                <Input
                  ref={busquedaRef}
                  id="pos-buscar-producto"
                  type="text"
                  inputMode="search"
                  role="searchbox"
                  value={busqueda}
                  onChange={(e) => handleCambiarBusqueda(e.target.value)}
                  placeholder="Buscar producto…"
                  aria-label="Buscar producto"
                  autoComplete="off"
                  className="h-10 rounded-full pl-10 pr-12 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-ms-clear]:hidden"
                />
                {busqueda ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleCambiarBusqueda("")
                      busquedaRef.current?.focus()
                    }}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-500 sm:block dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                    /
                  </kbd>
                )}
              </div>

              {catalogo && (
                <CategoriaChips
                  categorias={catalogo.categorias}
                  productos={catalogo.productos}
                  activa={categoria}
                  onChange={handleCambiarCategoria}
                />
              )}

              {error ? (
                <ErrorState message={error} onRetry={recargar} />
              ) : isLoading || !catalogo ? (
                <CatalogoSkeleton />
              ) : productosFiltrados.length === 0 ? (
                <SinResultados
                  onLimpiar={() => {
                    handleCambiarBusqueda("")
                    handleCambiarCategoria("todos")
                  }}
                />
              ) : (
                <>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {productosPaginados.map((producto) => (
                      <li key={producto.id}>
                        <ProductoCard
                          producto={producto}
                          cantidad={cantidades.get(producto.id) ?? 0}
                          deshabilitado={!puedeCobrar}
                          onAgregar={agregar}
                          onPersonalizar={(p) => setProductoParaPersonalizar(p)}
                        />
                      </li>
                    ))}
                  </ul>

                  {/* Footer de Paginación del Catálogo */}
                  <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-stone-800/80 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500 dark:text-stone-400 text-center sm:text-left">
                      Mostrando {productosPaginados.length > 0 ? (paginaCatalogoSegura - 1) * PRODUCTOS_POR_PAGINA + 1 : 0}–
                      {Math.min(paginaCatalogoSegura * PRODUCTOS_POR_PAGINA, productosFiltrados.length)} de{" "}
                      {productosFiltrados.length} productos
                    </span>

                    {totalPaginasCatalogo > 1 && (
                      <Pagination className="mx-auto sm:mx-0 w-auto justify-center sm:justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setPaginaCatalogo((p) => Math.max(1, p - 1))}
                              disabled={paginaCatalogoSegura === 1}
                              className={paginaCatalogoSegura === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPaginasCatalogo }, (_, i) => i + 1).map((num) => (
                            <PaginationItem key={num}>
                              <PaginationLink
                                isActive={paginaCatalogoSegura === num}
                                onClick={() => setPaginaCatalogo(num)}
                                className="cursor-pointer"
                              >
                                {num}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setPaginaCatalogo((p) => Math.min(totalPaginasCatalogo, p + 1))}
                              disabled={paginaCatalogoSegura === totalPaginasCatalogo}
                              className={paginaCatalogoSegura === totalPaginasCatalogo ? "pointer-events-none opacity-40" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : (
            /* RF-04: Mapa de Mesas y Áreas Físicas */
            <section
              className={cn(panelClass, "flex min-w-0 flex-col gap-3.5 p-4 lg:p-5 h-full")}
              aria-label="Mapa de mesas y áreas físicas"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-stone-100">
                    Mapa de Mesas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-stone-400">
                    Selecciona una mesa para asociar la comanda actual.
                  </p>
                </div>

                {/* Leyenda de Estados */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {(["libre", "ocupada", "por_cobrar"] as EstadoMesa[]).map((estado) => {
                    const conf = ESTADO_MESA_CONFIG[estado]
                    return (
                      <span key={estado} className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-stone-300">
                        <span className={cn("size-2 rounded-full", conf.dot)} />
                        {conf.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Filtros por Área Física: Salón, Terraza, Barra (envoltura vertical responsiva) */}
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => handleCambiarAreaMesas("todas")}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors cursor-pointer",
                    opcionClass(areaFiltroMesas === "todas")
                  )}
                >
                  Todas las áreas
                </button>
                {(catalogo?.areas ?? []).map(({ id: area, nombre }) => {
                  const Icono = getAreaIcon(area)
                  const activa = areaFiltroMesas === area
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => handleCambiarAreaMesas(area)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors cursor-pointer",
                        opcionClass(activa)
                      )}
                    >
                      <Icono className="size-3.5" />
                      {nombre}
                    </button>
                  )
                })}
              </div>

              {/* Grid de Mesas */}
              {catalogo && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {mesasPaginadas.map((m) => {
                      const esSeleccionada = mesaSeleccionada?.id === m.id
                      const estadoConf = ESTADO_MESA_CONFIG[m.estado]
                      const IconoArea = getAreaIcon(m.area)

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSeleccionarMesa(m)}
                          className={cn(
                            "flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all cursor-pointer relative",
                            "bg-white dark:bg-stone-900 shadow-xs hover:shadow-md",
                            estadoConf.border,
                            estadoConf.bg,
                            esSeleccionada &&
                            "ring-2 ring-[#4C0107] dark:ring-[#E7B7BC] border-transparent"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-stone-100">
                              {m.nombre}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                                estadoConf.badge
                              )}
                            >
                              {estadoConf.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-stone-400">
                            <IconoArea className="size-3.5" />
                            <span>{nombreArea(m.area)}</span>
                            <span>·</span>
                            <span>{m.capacidad} p.</span>
                          </div>

                          {m.mozo && (
                            <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[11px] dark:border-stone-800">
                              <span className="text-slate-500 dark:text-stone-400 truncate">Mozo: {m.mozo}</span>
                              {m.tiempoOcupada && (
                                <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-medium shrink-0">
                                  <Clock className="size-3" />
                                  {m.tiempoOcupada}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Footer de Paginación de Mesas */}
                  <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-stone-800/80 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500 dark:text-stone-400 text-center sm:text-left">
                      Mostrando {mesasPaginadas.length > 0 ? (paginaMesasSegura - 1) * MESAS_POR_PAGINA + 1 : 0}–
                      {Math.min(paginaMesasSegura * MESAS_POR_PAGINA, mesasFiltradas.length)} de{" "}
                      {mesasFiltradas.length} mesas
                    </span>

                    {totalPaginasMesas > 1 && (
                      <Pagination className="mx-auto sm:mx-0 w-auto justify-center sm:justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setPaginaMesas((p) => Math.max(1, p - 1))}
                              disabled={paginaMesasSegura === 1}
                              className={paginaMesasSegura === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPaginasMesas }, (_, i) => i + 1).map((num) => (
                            <PaginationItem key={num}>
                              <PaginationLink
                                isActive={paginaMesasSegura === num}
                                onClick={() => setPaginaMesas(num)}
                                className="cursor-pointer"
                              >
                                {num}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setPaginaMesas((p) => Math.min(totalPaginasMesas, p + 1))}
                              disabled={paginaMesasSegura === totalPaginasMesas}
                              className={paginaMesasSegura === totalPaginasMesas ? "pointer-events-none opacity-40" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* Panel Derecho: Ticket de Venta y Despacho de Comanda (5 cols en lg, 4 cols en xl) */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col">
          <TicketPanel
            items={items}
            totales={totales}
            mesas={catalogo?.mesas ?? []}
            nombreArea={nombreArea}
            tipoPedido={tipoPedido}
            onTipoPedidoChange={setTipoPedido}
            mesaSeleccionada={mesaSeleccionada}
            onAbrirMapaMesas={() => setVistaActiva("mesas")}
            onMesaChange={(id) => setMesaSeleccionadaId(id || null)}
            onCambiarCantidad={cambiarCantidad}
            productosAgotados={productosAgotados}
            onQuitar={quitar}
            onVaciar={vaciar}
            puedeCobrar={puedeCobrar}
            faltaMesa={faltaMesa}
            operacionHabilitada={puedeOperar}
            enviandoComanda={enviandoComanda}
            onEnviarCocina={handleEnviarCocina}
            onCobrar={() => setCobroAbierto(true)}
          />
        </div>
      </div>

      {/* Modal de Cobro (RF: Facturación) */}
      {cobroAbierto && (
        <CobroForm
          items={items}
          totales={totales}
          tipoPedido={tipoPedido}
          mesa={mesaSeleccionada?.nombre ?? ""}
          onClose={() => setCobroAbierto(false)}
          onVentaCompletada={finalizarVenta}
        />
      )}

      {/* Modal de Personalización de Comandas (RF-05) */}
      {productoParaPersonalizar && (
        <PersonalizarProductoModal
          producto={productoParaPersonalizar}
          onClose={() => setProductoParaPersonalizar(null)}
          onConfirmar={(modificadores) => {
            agregar(productoParaPersonalizar, modificadores)
            setProductoParaPersonalizar(null)
          }}
        />
      )}

      {/* Modal de Feedback al despachar comanda a cocina (RF-06) */}
      {comandaEnviada && (
        <ComandaDespachadaModal
          comanda={comandaEnviada}
          onClose={handleCerrarComandaEnviada}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Catálogo                                   */
/* -------------------------------------------------------------------------- */

function CategoriaChips({
  categorias,
  productos,
  activa,
  onChange,
}: {
  categorias: CategoriaPos[]
  productos: ProductoPos[]
  activa: FiltroCategoria
  onChange: (categoria: FiltroCategoria) => void
}) {
  const opciones: { id: FiltroCategoria; nombre: string; total: number }[] = [
    { id: "todos", nombre: "Todos", total: productos.length },
    ...categorias.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      total: productos.filter((p) => p.categoriaId === c.id).length,
    })),
  ]

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="toolbar"
      aria-label="Filtrar por categoría"
    >
      {opciones.map((opcion) => {
        const Icono = getCategoriaConfig(opcion.id).icon
        const esActiva = activa === opcion.id
        return (
          <button
            key={opcion.id}
            id={`pos-categoria-${opcion.id}`}
            type="button"
            aria-pressed={esActiva}
            onClick={() => onChange(opcion.id)}
            className={cn(
              "inline-flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-3.5 text-xs font-semibold transition-colors cursor-pointer",
              opcionClass(esActiva)
            )}
          >
            <Icono className="size-3.5 sm:size-4 shrink-0" />
            <span>{opcion.nombre}</span>
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] tabular-nums",
                esActiva
                  ? "bg-white/20 text-white dark:bg-stone-900/15 dark:text-stone-900"
                  : "bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300"
              )}
            >
              {opcion.total}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ProductoCard({
  producto,
  cantidad,
  deshabilitado,
  onAgregar,
  onPersonalizar,
}: {
  producto: ProductoPos
  cantidad: number
  deshabilitado: boolean
  onAgregar: (producto: ProductoPos) => void
  onPersonalizar: (producto: ProductoPos) => void
}) {
  const config = getCategoriaConfig(producto.categoriaId)
  const Icono = config.icon
  const agotado = !producto.disponible
  const enTope = cantidad >= MAX_CANTIDAD_ITEM

  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col justify-between rounded-2xl border bg-white p-3 text-left transition-all",
        "border-slate-100 hover:-translate-y-0.5 hover:border-[#4C0107]/30 hover:shadow-md",
        "dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600 dark:hover:shadow-black/40",
        agotado && "opacity-60",
        cantidad > 0 &&
        "border-[#4C0107]/40 ring-1 ring-[#4C0107]/20 dark:border-[#E7B7BC]/50 dark:ring-[#E7B7BC]/20"
      )}
    >
      <div className="flex flex-col gap-2.5">
        {/* Contenedor de Imagen de Producto correspondiente al título */}
        {producto.imagen ? (
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-stone-800">
            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {/* Ícono representativo de la categoría sobre la imagen */}
            <span
              className={cn(
                "absolute top-2 left-2 flex size-7 items-center justify-center rounded-lg shadow-sm backdrop-blur-md transition-transform group-hover:scale-105",
                config.className
              )}
            >
              <Icono className="size-3.5" />
            </span>

            {/* Badges de estado sobre la imagen */}
            {agotado ? (
              <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-xs">
                Agotado
              </span>
            ) : (
              cantidad > 0 && (
                <span className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#4C0107] px-1.5 text-xs font-bold tabular-nums text-white shadow-md animate-in zoom-in-50 dark:bg-[#E7B7BC] dark:text-stone-900">
                  {cantidad}
                </span>
              )
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                config.className
              )}
            >
              <Icono className="size-5" />
            </span>
            {agotado ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-stone-800 dark:text-stone-300">
                Agotado
              </span>
            ) : (
              cantidad > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#4C0107] px-1.5 text-xs font-bold tabular-nums text-white animate-in zoom-in-50 dark:bg-[#E7B7BC] dark:text-stone-900">
                  {cantidad}
                </span>
              )
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100" title={producto.nombre}>
            {producto.nombre}
          </span>
          <span className="line-clamp-2 text-xs text-slate-500 dark:text-stone-400" title={producto.descripcion}>
            {producto.descripcion}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 dark:border-stone-800/80">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-sm sm:text-base font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">
            {formatToCurrency(producto.precio)}
          </span>

          {!agotado && !deshabilitado && (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botón Personalizar Comanda (RF-05) */}
              {producto.permitePersonalizacion && (
                <button
                  type="button"
                  title="Personalizar modificadores y notas de preparación"
                  onClick={() => onPersonalizar(producto)}
                  className="flex size-7 items-center justify-center rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="size-3.5" />
                </button>
              )}

              {/* Botón rápido Agregar */}
              <button
                type="button"
                id={`pos-producto-${producto.id}`}
                onClick={() => onAgregar(producto)}
                disabled={enTope}
                aria-label={`Agregar ${producto.nombre}`}
                className="flex size-7 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] transition-colors hover:bg-[#4C0107] hover:text-white dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-100 dark:hover:text-stone-900 cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Ticket                                   */
/* -------------------------------------------------------------------------- */

function TicketPanel({
  items,
  totales,
  mesas,
  nombreArea,
  tipoPedido,
  onTipoPedidoChange,
  mesaSeleccionada,
  onAbrirMapaMesas,
  onMesaChange,
  onCambiarCantidad,
  productosAgotados,
  onQuitar,
  onVaciar,
  puedeCobrar,
  faltaMesa,
  operacionHabilitada,
  enviandoComanda,
  onEnviarCocina,
  onCobrar,
  className,
}: {
  items: ItemCarrito[]
  totales: TotalesCarrito
  mesas: MesaPos[]
  nombreArea: (area: AreaMesa) => string
  tipoPedido: TipoPedido
  onTipoPedidoChange: (tipo: TipoPedido) => void
  mesaSeleccionada: MesaPos | null
  onAbrirMapaMesas: () => void
  onMesaChange: (mesaId: string) => void
  onCambiarCantidad: (uid: string, delta: number) => void
  productosAgotados: ReadonlySet<string>
  onQuitar: (uid: string) => void
  onVaciar: () => void
  puedeCobrar: boolean
  faltaMesa: boolean
  operacionHabilitada: boolean
  enviandoComanda: boolean
  onEnviarCocina: () => void
  onCobrar: () => void
  className?: string
}) {
  return (
    <aside
      className={cn(
        panelClass,
        "flex flex-col gap-3.5 p-4 lg:p-5 h-full",
        className
      )}
      aria-label="Ticket de venta y comanda"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-stone-100">
            Comanda actual
          </h2>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            {totales.unidades} {totales.unidades === 1 ? "producto" : "productos"}
          </p>
        </div>
        {items.length > 0 && (
          <button
            id="pos-vaciar-ticket"
            type="button"
            onClick={onVaciar}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15 cursor-pointer"
          >
            <Trash2 className="size-3.5" /> Vaciar
          </button>
        )}
      </div>

      {/* Tipo de pedido: Mesa o Llevar */}
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de pedido">
        {tipoPedidoSchema.options.map((tipo) => {
          const Icono = tipo === "mesa" ? Utensils : ShoppingBag
          const activo = tipoPedido === tipo
          return (
            <button
              key={tipo}
              id={`pos-tipo-${tipo}`}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onTipoPedidoChange(tipo)}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-full border text-xs font-semibold transition-colors cursor-pointer",
                opcionClass(activo)
              )}
            >
              <Icono className="size-4" />
              {TIPO_PEDIDO_LABELS[tipo]}
            </button>
          )
        })}
      </div>

      {/* RF-04: Selección de Mesa Física con Estado y acceso al mapa */}
      {tipoPedido === "mesa" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">
              Mesa física
            </span>
            <button
              type="button"
              onClick={onAbrirMapaMesas}
              className="text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC] cursor-pointer"
            >
              Ver mapa
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              id="pos-mesa"
              value={mesaSeleccionada?.id ?? ""}
              onChange={(e) => onMesaChange(e.target.value)}
              className={cn(
                "h-10 flex-1 rounded-xl border bg-slate-50 px-3 text-xs text-slate-900 outline-none transition-colors cursor-pointer",
                "border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-400/20",
                "dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-stone-300 dark:focus:ring-white/10",
                "dark:[color-scheme:dark]"
              )}
            >
              <option value="" disabled>
                Seleccionar mesa…
              </option>
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({nombreArea(m.area)}) - {ESTADO_MESA_LABELS[m.estado]}
                </option>
              ))}
            </select>
          </div>

          {mesaSeleccionada && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500 dark:text-stone-400">
                Área: <strong>{nombreArea(mesaSeleccionada.area)}</strong> · {mesaSeleccionada.capacidad} personas
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.2 text-[10px] font-semibold",
                  ESTADO_MESA_CONFIG[mesaSeleccionada.estado].badge
                )}
              >
                {ESTADO_MESA_CONFIG[mesaSeleccionada.estado].label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Items de la Comanda con Modificadores (RF-05) con scroll interno contenido */}
      <div className="-mx-1 min-h-0 max-h-[220px] lg:max-h-[260px] xl:max-h-[300px] flex-1 overflow-y-auto px-1 no-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-8 text-center dark:border-stone-700">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
              <ReceiptText className="size-5" />
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-stone-200">Comanda vacía</p>
            <p className="max-w-[220px] text-xs text-slate-500 dark:text-stone-400">
              Agrega productos del catálogo para armar la orden.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
            {items.map((item) => (
              <TicketItem
                key={item.uid}
                item={item}
                agotado={productosAgotados.has(item.producto.id)}
                onCambiarCantidad={onCambiarCantidad}
                onQuitar={onQuitar}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Totales y Subtotales calculados en tiempo real (RF-05) */}
      <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-3 text-sm dark:border-stone-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-stone-400">Subtotal base</span>
          <span className="font-medium tabular-nums text-slate-900 dark:text-stone-100">
            {formatToCurrency(totales.subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-stone-400">IGV (18%)</span>
          <span className="font-medium tabular-nums text-slate-900 dark:text-stone-100">
            {formatToCurrency(totales.igv)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-slate-900 dark:text-stone-100">Total comanda</span>
          <span className="text-2xl font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">
            {formatToCurrency(totales.total)}
          </span>
        </div>
      </div>

      {/* Acciones principales: Enviar a Cocina (RF-06) y Cobrar en Caja */}
      <div className="flex flex-col gap-2">
        {/* RF-06: Envío Directo de Comanda a Cocina con un solo toque */}
        <Button
          id="pos-enviar-cocina"
          type="button"
          onClick={onEnviarCocina}
          loading={enviandoComanda}
          disabled={!operacionHabilitada}
          className={cn(
            "w-full h-11 text-xs sm:text-sm font-bold min-w-0 justify-center transition-all px-3",
            operacionHabilitada
              ? "bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-sm"
              : "bg-slate-100 text-slate-400 dark:bg-stone-800/40 dark:text-stone-600 border border-slate-200 dark:border-stone-800"
          )}
          leftIcon={<ChefHat className="size-4 shrink-0" />}
        >
          <span className="truncate">Enviar a cocina / barra</span>
        </Button>

        {/* Cobro en caja */}
        <Button
          id="pos-cobrar"
          type="button"
          onClick={onCobrar}
          disabled={!operacionHabilitada}
          variant="outline"
          className={cn(
            "w-full h-11 text-xs sm:text-sm font-bold min-w-0 justify-center transition-all px-3",
            operacionHabilitada
              ? "border-2 border-[#4C0107] text-[#4C0107] hover:bg-[#4C0107] hover:text-white dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800 shadow-sm"
              : "border-slate-200 bg-slate-100/70 text-slate-400 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-500"
          )}
          leftIcon={<ReceiptText className="size-4 shrink-0" />}
        >
          <span className="truncate">
            Cobrar en caja {totales.total > 0 && `(${formatToCurrency(totales.total)})`}
          </span>
        </Button>

        {!puedeCobrar ? (
          <p className="text-center text-xs text-slate-500 dark:text-stone-400">
            Tu rol no tiene permiso para despachar pedidos.
          </p>
        ) : (
          items.length > 0 &&
          faltaMesa && (
            <p className="text-center text-xs font-medium text-amber-700 dark:text-amber-400">
              Selecciona una mesa física para continuar.
            </p>
          )
        )}
      </div>
    </aside>
  )
}

function TicketItem({
  item,
  agotado,
  onCambiarCantidad,
  onQuitar,
}: {
  item: ItemCarrito
  agotado: boolean
  onCambiarCantidad: (uid: string, delta: number) => void
  onQuitar: (uid: string) => void
}) {
  const { producto, cantidad, modificadores } = item
  const precioUnitario = producto.precio + (modificadores?.precioExtra ?? 0)
  const botonCantidad =
    "flex size-7 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white hover:text-[#4C0107] disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-200 dark:hover:bg-stone-700 dark:hover:text-white cursor-pointer disabled:cursor-not-allowed"

  return (
    <li className="flex flex-col gap-1.5 py-3 animate-in fade-in-0 slide-in-from-right-2 duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">
            {producto.nombre}
          </span>
          <span className="text-xs tabular-nums text-slate-500 dark:text-stone-400">
            {formatToCurrency(precioUnitario)} c/u
          </span>
          {agotado && (
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
              Agotado: no se pueden agregar más unidades
            </span>
          )}
        </div>

        {/* Selector de cantidad */}
        <div className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-stone-800 shrink-0">
          <button
            type="button"
            onClick={() => onCambiarCantidad(item.uid, -1)}
            aria-label={`Quitar una unidad de ${producto.nombre}`}
            className={botonCantidad}
          >
            <Minus className="size-3.5" />
          </button>
          <span
            className="w-6 text-center text-sm font-bold tabular-nums text-slate-900 dark:text-stone-100"
            aria-live="polite"
          >
            {cantidad}
          </span>
          <button
            type="button"
            onClick={() => onCambiarCantidad(item.uid, 1)}
            disabled={agotado || cantidad >= MAX_CANTIDAD_ITEM}
            aria-label={`Agregar una unidad de ${producto.nombre}`}
            className={botonCantidad}
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Total por línea */}
        <div className="flex w-20 shrink-0 flex-col items-end text-right">
          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-stone-100">
            {formatToCurrency(precioUnitario * cantidad)}
          </span>
          <button
            type="button"
            onClick={() => onQuitar(item.uid)}
            className="text-[11px] font-medium text-slate-400 transition-colors hover:text-red-600 dark:text-stone-500 dark:hover:text-red-400 cursor-pointer"
          >
            Quitar
          </button>
        </div>
      </div>

      {/* RF-05: Modificadores y notas de preparación visibles en el ticket */}
      {modificadores && (
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/70 p-2 text-[11px] dark:bg-stone-800/60">
          {modificadores.tipoLeche && (
            <span className="rounded-md bg-white px-1.5 py-0.5 font-medium text-slate-700 dark:bg-stone-900 dark:text-stone-300">
              {modificadores.tipoLeche}
            </span>
          )}
          {modificadores.endulzante && (
            <span className="rounded-md bg-white px-1.5 py-0.5 font-medium text-slate-700 dark:bg-stone-900 dark:text-stone-300">
              {modificadores.endulzante}
            </span>
          )}
          {modificadores.temperatura && (
            <span className="rounded-md bg-white px-1.5 py-0.5 font-medium text-slate-700 dark:bg-stone-900 dark:text-stone-300">
              {modificadores.temperatura}
            </span>
          )}
          {modificadores.notas && (
            <span className="w-full text-slate-600 dark:text-stone-400 italic">
              Nota: &quot;{modificadores.notas}&quot;
            </span>
          )}
        </div>
      )}
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Auxiliares                                 */
/* -------------------------------------------------------------------------- */

function SinResultados({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <span className="flex size-11 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
        <SearchX className="size-5" />
      </span>
      <p className="text-sm text-slate-600 dark:text-stone-300">
        No se encontraron productos con ese criterio.
      </p>
      <button
        type="button"
        onClick={onLimpiar}
        className="text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC] cursor-pointer"
      >
        Limpiar filtros
      </button>
    </div>
  )
}

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
          <span className="font-semibold text-slate-700 dark:text-stone-200">{rol}</span> no tiene acceso al
          Punto de Venta.
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

function CatalogoSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-2xl dark:bg-stone-800" />
      ))}
    </div>
  )
}
