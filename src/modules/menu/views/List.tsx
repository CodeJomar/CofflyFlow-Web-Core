"use client"

import * as React from "react"
import {
  CircleAlert,
  CircleCheck,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Tags,
  Zap,
} from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/shared/components/ui/empty"
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

import { useMenu } from "../hooks"
import { ESTADO_PRODUCTO_CLASS, RESUMEN_CONFIG, getCategoriaConfig, opcionClass, panelClass } from "../components"
import {
  filtroDisponibilidadSchema,
  type CategoriaMenu,
  type FiltroCategoria,
  type FiltroDisponibilidad,
  type ProductoMenu,
  type ResumenMenu,
} from "../schema"
import ProductoForm, { CategoriasForm } from "./Form"

type ModalMenu =
  | { modo: "crear" }
  | { modo: "editar"; producto: ProductoMenu }
  | { modo: "categorias" }
  | null

export default function MenuView() {
  const { rol } = useWorkspaceLayout()
  const puedeVer = tienePermiso(rol, PERMISO.READ_MENU)
  const puedeCambiarStock = tienePermiso(rol, PERMISO.TOGGLE_STOCK)
  // RF-09: administración de productos y categorías (Dueño / Administrador)
  const puedeCrear = tienePermiso(rol, PERMISO.CREATE_PRODUCT)
  const puedeEditar = tienePermiso(rol, PERMISO.UPDATE_PRODUCT)
  const puedeEliminar = tienePermiso(rol, PERMISO.DELETE_PRODUCT)
  const puedeGestionarCategorias = puedeCrear || puedeEditar || puedeEliminar

  const menu = useMenu()
  const [modal, setModal] = React.useState<ModalMenu>(null)
  const [pagina, setPagina] = React.useState(1)
  const [itemsPorPagina, setItemsPorPagina] = React.useState(6)
  const cerrarModal = React.useCallback(() => setModal(null), [])

  // Ajuste reactivo del tamaño de página para evitar scroll vertical en cualquier dispositivo:
  // Móvil: 3 tarjetas (1 col) | Tablet: 4 tarjetas (2x2 cols) | Escritorio: 6 tarjetas (2x3 cols) | Pantalla ancha: 8 tarjetas (2x4 cols)
  React.useEffect(() => {
    const calcularLimite = () => {
      if (window.innerWidth < 640) {
        setItemsPorPagina(3)
      } else if (window.innerWidth < 1024) {
        setItemsPorPagina(4)
      } else if (window.innerWidth < 1536) {
        setItemsPorPagina(6)
      } else {
        setItemsPorPagina(8)
      }
    }
    calcularLimite()
    window.addEventListener("resize", calcularLimite)
    return () => window.removeEventListener("resize", calcularLimite)
  }, [])

  const { catalogo, productosFiltrados, resumen, isLoading, error, recargar } = menu

  // Handlers para filtros con reinicio seguro de paginación
  const handleBusqueda = React.useCallback(
    (valor: string) => {
      menu.setBusqueda(valor)
      setPagina(1)
    },
    [menu]
  )

  const handleCategoria = React.useCallback(
    (nuevaCat: FiltroCategoria) => {
      menu.setCategoria(nuevaCat)
      setPagina(1)
    },
    [menu]
  )

  const handleDisponibilidad = React.useCallback(
    (nuevaDisp: FiltroDisponibilidad) => {
      menu.setDisponibilidad(nuevaDisp)
      setPagina(1)
    },
    [menu]
  )

  const handleLimpiarFiltros = React.useCallback(() => {
    menu.limpiarFiltros()
    setPagina(1)
  }, [menu])

  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina)
  const paginaValida = Math.min(Math.max(1, pagina), Math.max(1, totalPaginas))

  const productosPaginados = React.useMemo(() => {
    const inicio = (paginaValida - 1) * itemsPorPagina
    return productosFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [productosFiltrados, paginaValida, itemsPorPagina])

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} />

  return (
    <div className="flex flex-col gap-6 pb-2 w-full">
      {/* Barra superior integrada: 3 contenedores de conteo de productos y los 3 botones ajustados sin espacio vacío a la izquierda */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4 items-center">
        {/* Contenedores de conteo de productos */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8">
          <ResumenStock
            resumen={resumen}
            activo={menu.disponibilidad}
            onSeleccionar={handleDisponibilidad}
          />
        </div>

        {/* Contenedor de los 3 botones ajustados a la misma fila */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={recargar}
            disabled={isLoading}
            leftIcon={<RefreshCw className={cn("size-4", isLoading && "animate-spin")} />}
            className="h-10 rounded-xl px-4 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer shadow-xs"
          >
            Actualizar
          </Button>

          {puedeGestionarCategorias && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModal({ modo: "categorias" })}
              disabled={!catalogo}
              leftIcon={<Tags className="size-4" />}
              className="h-10 rounded-xl px-4 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer shadow-xs"
            >
              Categorías
            </Button>
          )}

          {puedeCrear && (
            <Button
              type="button"
              size="sm"
              onClick={() => setModal({ modo: "crear" })}
              disabled={!catalogo || catalogo.categorias.length === 0}
              leftIcon={<Plus className="size-4" />}
              className="h-10 rounded-xl bg-[#4C0107] px-4 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 cursor-pointer shadow-xs"
            >
              Nuevo producto
            </Button>
          )}
        </div>
      </div>

      {/* Aviso RF-10 */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 shadow-xs">
        <Zap className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="leading-snug">
          <span className="font-semibold">Control rápido de disponibilidad:</span> toca el botón de estado en
          cualquier tarjeta para marcarlo como <span className="font-semibold">Agotado</span>. Los mozos ya no
          podrán seleccionarlo en el POS en tiempo real.
          {!puedeCambiarStock && " Tu rol actual no tiene permiso para alternar la disponibilidad."}
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !catalogo || isLoading ? (
        <MenuSkeleton />
      ) : (
        <>

          {/* Filtros y búsqueda adaptables sin scroll horizontal */}
          <Filtros
            categorias={catalogo.categorias}
            busqueda={menu.busqueda}
            onBusqueda={handleBusqueda}
            categoria={menu.categoria}
            onCategoria={handleCategoria}
          />

          {/* Catálogo de productos con regla de 12 columnas y alturas simétricas */}
          {productosFiltrados.length === 0 ? (
            <SinResultados onLimpiar={handleLimpiarFiltros} />
          ) : (
            <div className="flex flex-col gap-5">
              <ul className="grid grid-cols-12 gap-4 items-stretch list-none p-0 m-0">
                {productosPaginados.map((producto) => (
                  <li
                    key={producto.id}
                    className="col-span-12 sm:col-span-6 lg:col-span-4 2xl:col-span-3 flex flex-col"
                  >
                    <ProductoCard
                      producto={producto}
                      categoria={catalogo.categorias.find((c) => c.id === producto.categoriaId)?.nombre ?? ""}
                      pendiente={menu.pendientes.has(producto.id)}
                      puedeCambiarStock={puedeCambiarStock}
                      puedeEditar={puedeEditar}
                      onToggle={menu.toggleDisponibilidad}
                      onEditar={(p) => setModal({ modo: "editar", producto: p })}
                    />
                  </li>
                ))}
              </ul>

              {/* Paginación compartida para evitar scroll vertical excesivo */}
              {totalPaginas > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500 dark:text-stone-400">
                    Mostrando {(paginaValida - 1) * itemsPorPagina + 1} -{" "}
                    {Math.min(paginaValida * itemsPorPagina, productosFiltrados.length)} de{" "}
                    {productosFiltrados.length} productos
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
        </>
      )}

      {modal && catalogo && modal.modo !== "categorias" && (
        <ProductoForm
          producto={modal.modo === "editar" ? modal.producto : undefined}
          categorias={catalogo.categorias}
          onGuardado={menu.productoGuardado}
          onClose={cerrarModal}
        />
      )}

      {modal?.modo === "categorias" && catalogo && (
        <CategoriasForm
          categorias={catalogo.categorias}
          productos={catalogo.productos}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onGuardar={menu.guardarCategoria}
          onEliminada={menu.categoriaEliminada}
          onClose={cerrarModal}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Resumen de stock                              */
/* -------------------------------------------------------------------------- */

function ResumenStock({
  resumen,
  activo,
  onSeleccionar,
}: {
  resumen: ResumenMenu
  activo: FiltroDisponibilidad
  onSeleccionar: (filtro: FiltroDisponibilidad) => void
}) {
  const valores: Record<FiltroDisponibilidad, number> = {
    todos: resumen.total,
    disponibles: resumen.disponibles,
    agotados: resumen.agotados,
  }

  return (
    <div className="grid grid-cols-12 gap-3 sm:gap-4">
      {filtroDisponibilidadSchema.options.map((filtro) => {
        const config = RESUMEN_CONFIG[filtro]
        const seleccionado = activo === filtro
        return (
          <button
            key={filtro}
            type="button"
            onClick={() => onSeleccionar(filtro)}
            aria-pressed={seleccionado}
            className={cn(
              panelClass,
              "col-span-4 flex cursor-pointer flex-col items-start gap-1 p-3 sm:p-4 text-left rounded-2xl transition-all shadow-xs",
              "hover:border-[#4C0107]/40 dark:hover:border-stone-600",
              seleccionado &&
                "border-[#4C0107]/60 ring-2 ring-[#4C0107]/20 bg-white dark:bg-stone-900 dark:border-stone-400 dark:ring-stone-400/20"
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs dark:text-stone-400 truncate w-full">
              {config.label}
            </span>
            <span className={cn("text-2xl font-black tabular-nums sm:text-3xl", config.valueClass)}>
              {valores[filtro]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Filtros                                   */
/* -------------------------------------------------------------------------- */

function Filtros({
  categorias,
  busqueda,
  onBusqueda,
  categoria,
  onCategoria,
}: {
  categorias: CategoriaMenu[]
  busqueda: string
  onBusqueda: (valor: string) => void
  categoria: ReturnType<typeof useMenu>["categoria"]
  onCategoria: ReturnType<typeof useMenu>["setCategoria"]
}) {
  const opciones = [{ id: "todos" as const, nombre: "Todos" }, ...categorias]

  return (
    <div className="grid grid-cols-12 gap-3 items-center">
      {/* Buscador de productos */}
      <div className="col-span-12 md:col-span-5 lg:col-span-4 relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          aria-label="Buscar producto"
          className="h-10 rounded-xl pl-10 bg-white dark:bg-stone-900 border-slate-200 dark:border-stone-800"
        />
      </div>

      {/* Categorías responsivas (flex-wrap sin scroll horizontal, visibles 100% en mobile) */}
      <div className="col-span-12 md:col-span-7 lg:col-span-8">
        <div
          role="radiogroup"
          aria-label="Categoría"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-100/70 dark:bg-stone-900/60 border border-slate-200/60 dark:border-stone-800"
        >
          {opciones.map((c) => {
            const Icono = getCategoriaConfig(c.id).icon
            const activa = categoria === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => onCategoria(c.id)}
                className={cn(
                  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 sm:px-3.5 text-xs font-semibold whitespace-nowrap transition-all",
                  opcionClass(activa)
                )}
              >
                <Icono className="size-3.5 shrink-0" />
                <span>{c.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Tarjeta producto                              */
/* -------------------------------------------------------------------------- */

function ProductoCard({
  producto,
  categoria,
  pendiente,
  puedeCambiarStock,
  puedeEditar,
  onToggle,
  onEditar,
}: {
  producto: ProductoMenu
  categoria: string
  pendiente: boolean
  puedeCambiarStock: boolean
  puedeEditar: boolean
  onToggle: (producto: ProductoMenu) => void
  onEditar: (producto: ProductoMenu) => void
}) {
  const config = getCategoriaConfig(producto.categoriaId)
  const Icono = config.icon
  const agotado = !producto.disponible

  return (
    <article
      className={cn(
        "group flex h-full flex-col justify-between gap-3 rounded-2xl border bg-white p-4 transition-all duration-200 shadow-xs hover:shadow-md",
        "border-slate-100 dark:border-stone-800 dark:bg-stone-900",
        agotado && "border-red-200 bg-red-50/40 dark:border-red-500/25 dark:bg-red-500/5"
      )}
    >
      {/* Cabecera de la tarjeta con categoría y badge de disponibilidad */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", config.className)}>
          <Icono className="size-5" />
        </span>
        <Badge
          variant="estado"
          className={cn(
            "text-[11px] uppercase tracking-wide",
            agotado ? ESTADO_PRODUCTO_CLASS.agotado : ESTADO_PRODUCTO_CLASS.disponible
          )}
        >
          {agotado ? "Agotado" : "Disponible"}
        </Badge>
      </div>

      {/* Información del producto (flex-1 para absorber espacio y alinear pie) */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3
          className={cn(
            "truncate text-sm font-bold text-slate-900 dark:text-stone-100",
            agotado && "text-slate-500 line-through decoration-1 dark:text-stone-400"
          )}
        >
          {producto.nombre}
        </h3>
        <p className="line-clamp-2 text-xs text-slate-500 dark:text-stone-400 leading-relaxed">
          {producto.descripcion || "Sin descripción"}
        </p>
        <p className="mt-auto pt-1 text-[11px] font-medium text-slate-400 dark:text-stone-500">
          {categoria}
          {producto.permitePersonalizacion && " · Personalizable"}
        </p>
      </div>

      {/* Pie de la tarjeta con precio y acciones ancladas a la misma altura */}
      <div className="mt-auto shrink-0 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-stone-800 min-h-[52px]">
        <span className="text-base font-black tabular-nums text-[#4C0107] dark:text-[#E7B7BC] truncate">
          {formatToCurrency(producto.precio)}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {puedeEditar && (
            <button
              type="button"
              onClick={() => onEditar(producto)}
              aria-label={`Editar ${producto.nombre}`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 shrink-0"
            >
              <Pencil className="size-4" />
            </button>
          )}

          {/* RF-10: alternar con un solo toque Disponible / Agotado */}
          {puedeCambiarStock ? (
            <button
              type="button"
              onClick={() => onToggle(producto)}
              disabled={pendiente}
              aria-pressed={agotado}
              aria-label={agotado ? `Marcar ${producto.nombre} como disponible` : `Marcar ${producto.nombre} como agotado`}
              className={cn(
                "inline-flex h-9 min-w-[105px] sm:min-w-32 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 truncate shrink-0",
                agotado
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400"
                  : "border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10"
              )}
            >
              {pendiente ? (
                <RefreshCw className="size-3.5 animate-spin shrink-0" />
              ) : agotado ? (
                <CircleCheck className="size-3.5 shrink-0" />
              ) : (
                <CircleAlert className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{agotado ? "Habilitar" : "Agotado"}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-stone-500 shrink-0">
              <Lock className="size-3.5" /> Solo lectura
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Auxiliares                                 */
/* -------------------------------------------------------------------------- */

function SinResultados({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <Empty>
      <SearchX className="size-8 text-slate-400 dark:text-stone-500" />
      <EmptyDescription>No hay productos que coincidan con los filtros.</EmptyDescription>
      <EmptyContent>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLimpiar}
          className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer"
        >
          Limpiar filtros
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function AccesoRestringido({ rol }: { rol: string }) {
  return (
    <Empty>
      <Lock className="size-8 text-[#4C0107] dark:text-[#E7B7BC]" />
      <EmptyHeader>
        <EmptyTitle>Acceso restringido</EmptyTitle>
        <EmptyDescription>
          Tu rol actual (<span className="font-semibold text-slate-700 dark:text-stone-200">{rol}</span>) no puede
          ver el menú.
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
          className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer"
        >
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function MenuSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5 lg:col-span-4">
          <Skeleton className="h-10 rounded-xl dark:bg-stone-800" />
        </div>
        <div className="col-span-12 md:col-span-7 lg:col-span-8">
          <Skeleton className="h-10 rounded-2xl dark:bg-stone-800" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-4 2xl:col-span-3">
            <Skeleton className="h-56 rounded-2xl dark:bg-stone-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
