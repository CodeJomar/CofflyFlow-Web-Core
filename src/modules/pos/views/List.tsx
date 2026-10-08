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
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Utensils,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"

import type { PedidoListadoDto } from "@/dtos/pedidos"
import { useCan } from "@/modules/auth"
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
import { ACCION, MODULO } from "@/shared/constants/permisos"
import { useAhora } from "@/shared/hooks/use-ahora"
import { cn } from "@/shared/utils/cn"
import { aCentimos, formatearCentimos, formatearDinero } from "@/shared/utils/dinero"

import { useCarrito, useCatalogoPos, useEnvioPedido, usePedidosPorCobrar } from "../hooks"
import {
  ESTADO_MESA_CONFIG,
  getAreaConfig,
  getAreaIcon,
  getCategoriaConfig,
  opcionClass,
  panelClass,
} from "../components"
import {
  FILTRO_TODAS_LAS_AREAS,
  FILTRO_TODOS,
  MAX_CANTIDAD_ITEM,
  MESAS_POR_PAGINA,
  PRODUCTOS_POR_PAGINA,
  TIPOS_ATENCION,
  TIPO_ATENCION_LABELS,
  areaDeMesa,
  areasDeMesas,
  precioUnitarioCentimos,
  requiereConfiguracion,
  subtotalLineaCentimos,
  type CategoriaPos,
  type FiltroCategoria,
  type ItemCarrito,
  type MesaPos,
  type ProductoCatalogo,
  type ProductoPos,
  type TipoAtencion,
  type TotalesCarrito,
} from "../schema"
import { CobroModal, ComandaDespachadaModal, PersonalizarProductoModal, type PedidoACobrar } from "./Form"

/* -------------------------------------------------------------------------- */
/*                          Vista principal del POS                            */
/* -------------------------------------------------------------------------- */

export default function PosView() {
  const { puede } = useCan()
  // Entrar al POS lo exige la ruta (ORDERS:CREAR); aquí se decide qué más puede hacer cada cargo.
  return (
    <PosContenido
      puedeCrear={puede({ modulo: MODULO.ORDERS, accion: ACCION.CREAR })}
      puedeCobrar={puede({ modulo: MODULO.TRANSACTIONS, accion: ACCION.COBRAR })}
      puedeLiberarMesa={puede({ modulo: MODULO.TABLES, accion: ACCION.CAMBIAR_ESTADO })}
    />
  )
}

/** "A1B2C3D4 · Mesa 3" para identificar un pedido en el cobro. */
const etiquetaPedido = (p: Pick<PedidoListadoDto, "id_pedido" | "mesa_numero" | "tipo_pedido">): string =>
  `${p.id_pedido.slice(0, 8).toUpperCase()} · ${p.tipo_pedido === "salon" && p.mesa_numero ? `Mesa ${p.mesa_numero}` : "Para llevar"}`

function PosContenido({
  puedeCrear,
  puedeCobrar,
  puedeLiberarMesa,
}: {
  puedeCrear: boolean
  puedeCobrar: boolean
  puedeLiberarMesa: boolean
}) {
  const {
    categorias,
    productos,
    productosFiltrados,
    mesas,
    busqueda,
    setBusqueda,
    categoria,
    setCategoria,
    isLoading,
    error,
    enVivo,
    recargar,
    recargarMesas,
    marcarMesaLibre,
  } = useCatalogoPos()

  const { items, agregar, cambiarCantidad, quitar, vaciar, totales, cantidades } = useCarrito()

  // Los minutos de ocupación de cada mesa se recalculan en el navegador cada medio minuto.
  const ahora = useAhora(30_000)

  // Productos marcados como Agotado desde el Menú (no se pueden sumar más unidades)
  const productosAgotados = React.useMemo(
    () => new Set(productos.filter((p) => !p.disponible).map((p) => p.id_producto)),
    [productos],
  )
  const { enviar, isSending: enviandoComanda, pedidoEnviado, limpiar: limpiarComanda } = useEnvioPedido()

  // Vista activa: "catalogo" o "mesas"
  const [vistaActiva, setVistaActiva] = React.useState<"catalogo" | "mesas">("catalogo")
  const [areaFiltroSeleccionada, setAreaFiltroMesas] = React.useState<string>(FILTRO_TODAS_LAS_AREAS)

  // Paginación en Catálogo y Mesas para evitar scroll vertical
  const [paginaCatalogo, setPaginaCatalogo] = React.useState(1)
  const [paginaMesas, setPaginaMesas] = React.useState(1)

  const handleCambiarBusqueda = (valor: string) => {
    setBusqueda(valor)
    setPaginaCatalogo(1)
  }

  const handleCambiarCategoria = (cat: FiltroCategoria) => {
    setCategoria(cat)
    setPaginaCatalogo(1)
  }

  const handleCambiarAreaMesas = (area: string) => {
    setAreaFiltroMesas(area)
    setPaginaMesas(1)
  }

  // Las áreas salen de las mesas (texto libre que administra el propietario); si el área filtrada desaparece, se muestran todas.
  const areas = React.useMemo(() => areasDeMesas(mesas), [mesas])
  const areaFiltroMesas =
    areaFiltroSeleccionada !== FILTRO_TODAS_LAS_AREAS && areas.includes(areaFiltroSeleccionada)
      ? areaFiltroSeleccionada
      : FILTRO_TODAS_LAS_AREAS

  const totalPaginasCatalogo = Math.max(1, Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA))
  const paginaCatalogoSegura = Math.min(paginaCatalogo, totalPaginasCatalogo)

  const productosPaginados = React.useMemo(() => {
    const inicio = (paginaCatalogoSegura - 1) * PRODUCTOS_POR_PAGINA
    return productosFiltrados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA)
  }, [productosFiltrados, paginaCatalogoSegura])

  const mesasFiltradas = React.useMemo(
    () => mesas.filter((m) => areaFiltroMesas === FILTRO_TODAS_LAS_AREAS || areaDeMesa(m) === areaFiltroMesas),
    [mesas, areaFiltroMesas],
  )

  const totalPaginasMesas = Math.max(1, Math.ceil(mesasFiltradas.length / MESAS_POR_PAGINA))
  const paginaMesasSegura = Math.min(paginaMesas, totalPaginasMesas)

  const mesasPaginadas = React.useMemo(() => {
    const inicio = (paginaMesasSegura - 1) * MESAS_POR_PAGINA
    return mesasFiltradas.slice(inicio, inicio + MESAS_POR_PAGINA)
  }, [mesasFiltradas, paginaMesasSegura])

  // Estado del pedido
  const [tipoPedido, setTipoPedido] = React.useState<TipoAtencion>("salon")
  const [mesaSeleccionadaId, setMesaSeleccionadaId] = React.useState<string | null>(null)

  const mesaSeleccionada = React.useMemo(
    () => mesas.find((m) => m.id_mesa === mesaSeleccionadaId) ?? null,
    [mesas, mesaSeleccionadaId],
  )

  // Pedidos de la mesa seleccionada con saldo por cobrar (se refrescan cuando cambia el estado de la mesa)
  const refrescarPedidos = `${mesaSeleccionada?.estado}|${mesaSeleccionada?.pedidos_activos}|${mesaSeleccionada?.pedido_activo?.total}`
  const { pedidos: pedidosMesa, recargar: recargarPedidosMesa } = usePedidosPorCobrar(
    tipoPedido === "salon" ? mesaSeleccionadaId : null,
    refrescarPedidos,
  )
  const saldoMesaCentimos = pedidosMesa.reduce((suma, p) => suma + aCentimos(p.saldo_pendiente), 0)

  // Modales
  const [pedidosParaCobrar, setPedidosParaCobrar] = React.useState<PedidoACobrar[] | null>(null)
  const [productoParaPersonalizar, setProductoParaPersonalizar] = React.useState<ProductoPos | null>(null)
  const [destinoEnviado, setDestinoEnviado] = React.useState("")

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

  const faltaMesa = tipoPedido === "salon" && !mesaSeleccionada
  const mesaPorLimpiar = tipoPedido === "salon" && mesaSeleccionada?.estado === "por_limpiar"
  const puedeEnviar = puedeCrear && items.length > 0 && !faltaMesa && !mesaPorLimpiar
  const puedeCobrarAhora = puedeCobrar && ((items.length > 0 && !faltaMesa && !mesaPorLimpiar) || pedidosMesa.length > 0)

  const destinoActual = tipoPedido === "salon" && mesaSeleccionada ? `Mesa ${mesaSeleccionada.numero}` : "Para llevar"

  // Envío de la comanda a cocina y barra: crea el pedido en la API
  const handleEnviarCocina = async () => {
    if (!puedeEnviar) return
    const destino = destinoActual
    const pedido = await enviar(items, tipoPedido, mesaSeleccionadaId)
    if (pedido) {
      setDestinoEnviado(destino)
      vaciar()
      void recargarMesas(true)
    }
  }

  // Cobro: con comanda armada se crea el pedido y se cobra; sin ella, se cobran los pedidos de la mesa.
  const handleCobrar = async () => {
    if (!puedeCobrarAhora) return
    if (items.length > 0) {
      const destino = destinoActual
      const pedido = await enviar(items, tipoPedido, mesaSeleccionadaId)
      if (!pedido) return
      limpiarComanda() // el aviso de "comanda enviada" no hace falta: se pasa directo al cobro
      vaciar()
      void recargarMesas(true)
      setPedidosParaCobrar([
        {
          id_pedido: pedido.id_pedido,
          etiqueta: `${pedido.id_pedido.slice(0, 8).toUpperCase()} · ${destino}`,
          total: pedido.total_calculado,
          saldo_pendiente: pedido.total_calculado,
        },
      ])
      return
    }
    setPedidosParaCobrar(
      pedidosMesa.map((p) => ({
        id_pedido: p.id_pedido,
        etiqueta: etiquetaPedido(p),
        total: p.total_calculado,
        saldo_pendiente: p.saldo_pendiente,
      })),
    )
  }

  const handleCerrarComandaEnviada = () => limpiarComanda()

  const handleCobroTerminado = () => {
    void recargarMesas(true)
    void recargarPedidosMesa()
  }

  const handleSeleccionarMesa = (mesa: MesaPos) => {
    setMesaSeleccionadaId(mesa.id_mesa)
    setTipoPedido("salon")
    setVistaActiva("catalogo")
  }

  // Agregar con un toque; si el producto exige elegir opciones, se abre la personalización.
  const handleAgregar = (producto: ProductoPos) => {
    if (requiereConfiguracion(producto)) setProductoParaPersonalizar(producto)
    else agregar(producto)
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
            {enVivo ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {enVivo ? "En vivo" : "Actualización periódica"}
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
            {!isLoading && (
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] dark:bg-white/20">
                {mesas.length}
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

              {!isLoading && (
                <CategoriaChips
                  categorias={categorias}
                  productos={productos}
                  activa={categoria}
                  onChange={handleCambiarCategoria}
                />
              )}

              {error ? (
                <ErrorState message={error} onRetry={recargar} />
              ) : isLoading ? (
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
                      <li key={producto.id_producto}>
                        <ProductoCard
                          producto={producto}
                          cantidad={cantidades.get(producto.id_producto) ?? 0}
                          deshabilitado={!puedeCrear}
                          onAgregar={handleAgregar}
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
                  {(["libre", "ocupada", "por_cobrar", "por_limpiar"] as const).map((estado) => {
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
                {areas.map((area) => {
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
                      {area}
                    </button>
                  )
                })}
              </div>

              {/* Grid de Mesas */}
              {!isLoading && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {mesasPaginadas.map((m) => (
                      <MesaCard
                        key={m.id_mesa}
                        mesa={m}
                        seleccionada={mesaSeleccionada?.id_mesa === m.id_mesa}
                        ahora={ahora}
                        puedeLiberar={puedeLiberarMesa}
                        onSeleccionar={handleSeleccionarMesa}
                        onLiberar={marcarMesaLibre}
                      />
                    ))}
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
            mesas={mesas}
            tipoPedido={tipoPedido}
            onTipoPedidoChange={setTipoPedido}
            mesaSeleccionada={mesaSeleccionada}
            pedidosMesa={pedidosMesa}
            saldoMesaCentimos={saldoMesaCentimos}
            onAbrirMapaMesas={() => setVistaActiva("mesas")}
            onMesaChange={(id) => setMesaSeleccionadaId(id || null)}
            onCambiarCantidad={cambiarCantidad}
            productosAgotados={productosAgotados}
            onQuitar={quitar}
            onVaciar={vaciar}
            puedeCrear={puedeCrear}
            puedeCobrar={puedeCobrar}
            faltaMesa={faltaMesa}
            mesaPorLimpiar={mesaPorLimpiar}
            puedeEnviar={puedeEnviar}
            puedeCobrarAhora={puedeCobrarAhora}
            enviandoComanda={enviandoComanda}
            onEnviarCocina={handleEnviarCocina}
            onCobrar={() => void handleCobrar()}
          />
        </div>
      </div>

      {/* Modal de cobro: pago mixto o parcial de un pedido */}
      {pedidosParaCobrar && (
        <CobroModal
          pedidos={pedidosParaCobrar}
          onClose={() => setPedidosParaCobrar(null)}
          onCobrado={handleCobroTerminado}
        />
      )}

      {/* Modal de personalización: opciones del producto y nota de preparación */}
      {productoParaPersonalizar && (
        <PersonalizarProductoModal
          producto={productoParaPersonalizar}
          onClose={() => setProductoParaPersonalizar(null)}
          onConfirmar={(configuracion) => {
            agregar(productoParaPersonalizar, configuracion)
            setProductoParaPersonalizar(null)
          }}
        />
      )}

      {/* Aviso al despachar la comanda a cocina */}
      {pedidoEnviado && (
        <ComandaDespachadaModal
          pedido={pedidoEnviado}
          destino={destinoEnviado}
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
  productos: ProductoCatalogo[]
  activa: FiltroCategoria
  onChange: (categoria: FiltroCategoria) => void
}) {
  const opciones: { id: FiltroCategoria; nombre: string; total: number; config: ReturnType<typeof getCategoriaConfig> }[] = [
    { id: FILTRO_TODOS, nombre: "Todos", total: productos.length, config: getCategoriaConfig(FILTRO_TODOS) },
    ...categorias.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      total: productos.filter((p) => p.id_categoria === c.id).length,
      config: getCategoriaConfig(c),
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filtrar por categoría">
      {opciones.map((opcion) => {
        const Icono = opcion.config.icon
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
              opcionClass(esActiva),
            )}
          >
            <Icono className="size-3.5 sm:size-4 shrink-0" />
            <span>{opcion.nombre}</span>
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] tabular-nums",
                esActiva
                  ? "bg-white/20 text-white dark:bg-stone-900/15 dark:text-stone-900"
                  : "bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300",
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
  producto: ProductoCatalogo
  cantidad: number
  deshabilitado: boolean
  onAgregar: (producto: ProductoPos) => void
  onPersonalizar: (producto: ProductoPos) => void
}) {
  const config = getCategoriaConfig({ nombre: producto.categoria_nombre })
  const Icono = config.icon
  const agotado = !producto.disponible
  const enTope = cantidad >= MAX_CANTIDAD_ITEM
  const tieneOpciones = producto.grupos_modificadores.length > 0

  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col justify-between gap-3 rounded-2xl border bg-white p-3 text-left transition-all",
        "border-slate-100 hover:-translate-y-0.5 hover:border-[#4C0107]/30 hover:shadow-md",
        "dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600 dark:hover:shadow-black/40",
        agotado && "opacity-60",
        cantidad > 0 && "border-[#4C0107]/40 ring-1 ring-[#4C0107]/20 dark:border-[#E7B7BC]/50 dark:ring-[#E7B7BC]/20",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
              config.className,
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
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#4C0107] px-1.5 text-xs font-bold tabular-nums text-white dark:bg-stone-100 dark:text-stone-900">
                {cantidad}
              </span>
            )
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">{producto.nombre}</span>
          <span className="line-clamp-2 text-xs text-slate-500 dark:text-stone-400">{producto.descripcion}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 dark:border-stone-800/80">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-sm sm:text-base font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">
            {formatearDinero(producto.precio)}
          </span>

          {!agotado && !deshabilitado && (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Personalizar: opciones del producto y nota de preparación */}
              <button
                type="button"
                title={tieneOpciones ? "Elegir opciones y agregar nota de preparación" : "Agregar nota de preparación"}
                onClick={() => onPersonalizar(producto)}
                className="flex size-7 items-center justify-center rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="size-3.5" />
              </button>

              {/* Botón rápido Agregar */}
              <button
                type="button"
                id={`pos-producto-${producto.id_producto}`}
                onClick={() => onAgregar(producto)}
                disabled={enTope}
                aria-label={`Agregar ${producto.nombre}`}
                className="flex size-7 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] transition-colors hover:bg-[#4C0107] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-100 dark:hover:text-stone-900 cursor-pointer"
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
  tipoPedido,
  onTipoPedidoChange,
  mesaSeleccionada,
  pedidosMesa,
  saldoMesaCentimos,
  onAbrirMapaMesas,
  onMesaChange,
  onCambiarCantidad,
  productosAgotados,
  onQuitar,
  onVaciar,
  puedeCrear,
  puedeCobrar,
  faltaMesa,
  mesaPorLimpiar,
  puedeEnviar,
  puedeCobrarAhora,
  enviandoComanda,
  onEnviarCocina,
  onCobrar,
  className,
}: {
  items: ItemCarrito[]
  totales: TotalesCarrito
  mesas: MesaPos[]
  tipoPedido: TipoAtencion
  onTipoPedidoChange: (tipo: TipoAtencion) => void
  mesaSeleccionada: MesaPos | null
  pedidosMesa: PedidoListadoDto[]
  saldoMesaCentimos: number
  onAbrirMapaMesas: () => void
  onMesaChange: (mesaId: string) => void
  onCambiarCantidad: (uid: string, delta: number) => void
  productosAgotados: ReadonlySet<string>
  onQuitar: (uid: string) => void
  onVaciar: () => void
  puedeCrear: boolean
  puedeCobrar: boolean
  faltaMesa: boolean
  mesaPorLimpiar: boolean
  puedeEnviar: boolean
  puedeCobrarAhora: boolean
  enviandoComanda: boolean
  onEnviarCocina: () => void
  onCobrar: () => void
  className?: string
}) {
  const etiquetaCobro =
    items.length > 0
      ? `Cobrar en caja${totales.total > 0 ? ` (${formatearCentimos(totales.total)})` : ""}`
      : pedidosMesa.length > 0
        ? `Cobrar mesa (${formatearCentimos(saldoMesaCentimos)})`
        : "Cobrar en caja"

  return (
    <aside className={cn(panelClass, "flex flex-col gap-3.5 p-4 lg:p-5 h-full", className)} aria-label="Ticket de venta y comanda">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-stone-100">Comanda actual</h2>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            {totales.unidades} {totales.unidades === 1 ? "producto" : "productos"}
          </p>
        </div>
        {items.length > 0 && (
          <button
            id="pos-vaciar-ticket"
            type="button"
            onClick={onVaciar}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 cursor-pointer"
          >
            <Trash2 className="size-3.5" /> Vaciar
          </button>
        )}
      </div>

      {/* Tipo de pedido: Mesa o Llevar */}
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de pedido">
        {TIPOS_ATENCION.map((tipo) => {
          const Icono = tipo === "salon" ? Utensils : ShoppingBag
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
                opcionClass(activo),
              )}
            >
              <Icono className="size-4" />
              {TIPO_ATENCION_LABELS[tipo]}
            </button>
          )
        })}
      </div>

      {/* Selección de mesa física con estado y acceso al mapa */}
      {tipoPedido === "salon" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400">Mesa física</span>
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
              value={mesaSeleccionada?.id_mesa ?? ""}
              onChange={(e) => onMesaChange(e.target.value)}
              className={cn(
                "h-10 flex-1 rounded-xl border bg-slate-50 px-3 text-xs text-slate-900 outline-none transition-colors cursor-pointer",
                "border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-400/20",
                "dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-stone-300 dark:focus:ring-white/10",
                "dark:[color-scheme:dark]",
              )}
            >
              <option value="" disabled>
                Seleccionar mesa…
              </option>
              {mesas.map((m) => (
                <option key={m.id_mesa} value={m.id_mesa} disabled={m.estado === "por_limpiar"}>
                  Mesa {m.numero} ({areaDeMesa(m)}) - {ESTADO_MESA_CONFIG[m.estado].label}
                </option>
              ))}
            </select>
          </div>

          {mesaSeleccionada && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500 dark:text-stone-400">
                Área: <strong>{areaDeMesa(mesaSeleccionada)}</strong> · {mesaSeleccionada.capacidad} personas
              </span>
              <span className={cn("rounded-full px-2 py-0.2 text-[10px] font-semibold", ESTADO_MESA_CONFIG[mesaSeleccionada.estado].badge)}>
                {ESTADO_MESA_CONFIG[mesaSeleccionada.estado].label}
              </span>
            </div>
          )}

          {/* Pedidos de la mesa que siguen abiertos (se cobran desde aquí) */}
          {pedidosMesa.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-slate-100 pt-2 text-xs dark:border-stone-800">
              {pedidosMesa.map((p) => (
                <li key={p.id_pedido} className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-stone-200">
                    {p.id_pedido.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-slate-500 dark:text-stone-400">{p.estado === "en_preparacion" ? "preparando" : p.estado}</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-100">
                    {formatearDinero(p.saldo_pendiente)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Items de la Comanda con modificadores y notas, con scroll interno contenido */}
      <div className="-mx-1 min-h-0 max-h-[220px] lg:max-h-[260px] xl:max-h-[300px] flex-1 overflow-y-auto px-1 no-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-8 text-center dark:border-stone-700">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
              <ReceiptText className="size-5" />
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-stone-200">Comanda vacía</p>
            <p className="max-w-[220px] text-xs text-slate-500 dark:text-stone-400">Agrega productos del catálogo para armar la orden.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
            {items.map((item) => (
              <TicketItem
                key={item.uid}
                item={item}
                agotado={productosAgotados.has(item.producto.id_producto)}
                onCambiarCantidad={onCambiarCantidad}
                onQuitar={onQuitar}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Totales calculados en tiempo real (los precios ya incluyen IGV) */}
      <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-3 text-sm dark:border-stone-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-stone-400">Subtotal base</span>
          <span className="font-medium tabular-nums text-slate-900 dark:text-stone-100">{formatearCentimos(totales.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-stone-400">IGV (18%)</span>
          <span className="font-medium tabular-nums text-slate-900 dark:text-stone-100">{formatearCentimos(totales.igv)}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-slate-900 dark:text-stone-100">Total comanda</span>
          <span className="text-2xl font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">{formatearCentimos(totales.total)}</span>
        </div>
      </div>

      {/* Acciones principales: Enviar a cocina y Cobrar en caja */}
      <div className="flex flex-col gap-2">
        <Button
          id="pos-enviar-cocina"
          type="button"
          onClick={onEnviarCocina}
          loading={enviandoComanda}
          disabled={!puedeEnviar}
          className={cn(
            "w-full h-11 text-xs sm:text-sm font-bold min-w-0 justify-center transition-all px-3",
            puedeEnviar
              ? "bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-sm"
              : "bg-slate-100 text-slate-400 dark:bg-stone-800/40 dark:text-stone-600 border border-slate-200 dark:border-stone-800",
          )}
          leftIcon={<ChefHat className="size-4 shrink-0" />}
        >
          <span className="truncate">Enviar a cocina / barra</span>
        </Button>

        {/* Cobro en caja: solo cargos con permiso de cobro */}
        {puedeCobrar && (
          <Button
            id="pos-cobrar"
            type="button"
            onClick={onCobrar}
            disabled={!puedeCobrarAhora || enviandoComanda}
            variant="outline"
            className={cn(
              "w-full h-11 text-xs sm:text-sm font-bold min-w-0 justify-center transition-all px-3",
              puedeCobrarAhora
                ? "border-2 border-[#4C0107] text-[#4C0107] hover:bg-[#4C0107] hover:text-white dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-100 dark:hover:text-stone-900"
                : "border-slate-200 bg-slate-100/70 text-slate-400 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-500",
            )}
            leftIcon={<ReceiptText className="size-4 shrink-0" />}
          >
            <span className="truncate">{etiquetaCobro}</span>
          </Button>
        )}

        {!puedeCrear ? (
          <p className="text-center text-xs text-slate-500 dark:text-stone-400">Tu cargo no tiene permiso para tomar pedidos.</p>
        ) : mesaPorLimpiar ? (
          <p className="text-center text-xs font-medium text-sky-700 dark:text-sky-400">
            Esa mesa está por limpiar: márcala como lista en el mapa de mesas.
          </p>
        ) : (
          items.length > 0 &&
          faltaMesa && (
            <p className="text-center text-xs font-medium text-amber-700 dark:text-amber-400">Selecciona una mesa física para continuar.</p>
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
  const { producto, cantidad, modificadores, notas } = item
  const precioUnitario = precioUnitarioCentimos(item)
  const botonCantidad =
    "flex size-7 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white hover:text-[#4C0107] disabled:opacity-40 disabled:cursor-not-allowed dark:text-stone-200 dark:hover:bg-stone-700 dark:hover:text-white cursor-pointer"

  return (
    <li className="flex flex-col gap-1.5 py-3 animate-in fade-in-0 slide-in-from-right-2 duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">{producto.nombre}</span>
          <span className="text-xs tabular-nums text-slate-500 dark:text-stone-400">{formatearCentimos(precioUnitario)} c/u</span>
          {agotado && (
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Agotado: no se pueden agregar más unidades</span>
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
          <span className="w-6 text-center text-sm font-bold tabular-nums text-slate-900 dark:text-stone-100" aria-live="polite">
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
            {formatearCentimos(subtotalLineaCentimos(item))}
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

      {/* Opciones elegidas y nota de preparación */}
      {(modificadores.length > 0 || notas) && (
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/70 p-2 text-[11px] dark:bg-stone-800/60">
          {modificadores.map((m) => (
            <span
              key={m.id_opcion}
              className="rounded-md bg-white px-1.5 py-0.5 font-medium text-slate-700 dark:bg-stone-900 dark:text-stone-300"
            >
              {m.opcion}
              {aCentimos(m.price_delta) !== 0 && ` (${aCentimos(m.price_delta) > 0 ? "+" : "-"}${formatearCentimos(Math.abs(aCentimos(m.price_delta)))})`}
            </span>
          ))}
          {notas && <span className="w-full text-slate-600 dark:text-stone-400 italic">Nota: &quot;{notas}&quot;</span>}
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
        <Skeleton key={i} className="h-40 rounded-2xl dark:bg-stone-800" />
      ))}
    </div>
  )
}

function MesaCard({
  mesa,
  seleccionada,
  ahora,
  puedeLiberar,
  onSeleccionar,
  onLiberar,
}: {
  mesa: MesaPos
  seleccionada: boolean
  ahora: number
  puedeLiberar: boolean
  onSeleccionar: (mesa: MesaPos) => void
  onLiberar: (idMesa: string) => Promise<boolean>
}) {
  const estadoConf = ESTADO_MESA_CONFIG[mesa.estado]
  const areaConfig = getAreaConfig(areaDeMesa(mesa))
  const pedido = mesa.pedido_activo
  const minutos = pedido ? Math.max(0, Math.floor((ahora - new Date(pedido.fecha_apertura).getTime()) / 60_000)) : null

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all",
        "bg-white dark:bg-stone-900 shadow-xs hover:shadow-md",
        estadoConf.border,
        estadoConf.bg,
        seleccionada && "ring-2 ring-[#4C0107] dark:ring-[#E7B7BC] border-transparent",
      )}
    >
      <button type="button" onClick={() => onSeleccionar(mesa)} className="flex flex-col gap-2 text-left cursor-pointer">
        <div className="flex items-start justify-between gap-1">
          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-stone-100">Mesa {mesa.numero}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", estadoConf.badge)}>
            {estadoConf.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-stone-400">
          <areaConfig.icon className="size-3.5" />
          <span>{areaDeMesa(mesa)}</span>
          <span>·</span>
          <span>{mesa.capacidad} p.</span>
        </div>

        {pedido && minutos !== null && (
          <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[11px] dark:border-stone-800">
            <span className="font-semibold tabular-nums text-slate-700 dark:text-stone-200">
              {formatearDinero(pedido.total)}
              {mesa.pedidos_activos > 1 && <span className="font-normal text-slate-500 dark:text-stone-400"> · {mesa.pedidos_activos} pedidos</span>}
            </span>
            <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-medium shrink-0">
              <Clock className="size-3" />
              {minutos} min
            </span>
          </div>
        )}
      </button>

      {mesa.estado === "por_limpiar" && puedeLiberar && (
        <button
          type="button"
          onClick={() => void onLiberar(mesa.id_mesa)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-sky-700 cursor-pointer dark:bg-sky-500 dark:text-stone-950 dark:hover:bg-sky-400"
        >
          <Sparkles className="size-3.5" />
          Marcar lista
        </button>
      )}
    </div>
  )
}
