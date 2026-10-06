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
  X,
  Zap,
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/utils/cn"
import { formatToCurrency } from "@/shared/utils/formatters"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import { useMenu } from "../hooks"
import { ESTADO_PRODUCTO_CLASS, RESUMEN_CONFIG, getCategoriaConfig, opcionClass, panelClass } from "../components"
import {
  filtroDisponibilidadSchema,
  type CategoriaMenu,
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
  const cerrarModal = React.useCallback(() => setModal(null), [])

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} />

  const { catalogo, productosFiltrados, resumen, isLoading, error, recargar } = menu

  return (
    <div className="flex flex-col gap-6 pb-2">
      {/* Header del módulo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-stone-100">
            Gestión de Carta y Menú
          </h1>
          <p className="text-sm text-slate-500 dark:text-stone-400">
            Bebidas, postres, piqueos y más: precios, categorías y disponibilidad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {puedeGestionarCategorias && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModal({ modo: "categorias" })}
              disabled={!catalogo}
              leftIcon={<Tags className="size-4" />}
              className="h-10 rounded-full px-5 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
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
              className="h-10 rounded-full bg-[#4C0107] px-5 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              Nuevo producto
            </Button>
          )}
        </div>
      </div>

      {/* Aviso RF-10 */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <Zap className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold">Control rápido de stock:</span> toca el botón de estado de un producto
          para marcarlo como <span className="font-semibold">Agotado</span>. Los mozos ya no podrán seleccionarlo
          en el POS.
          {!puedeCambiarStock && " Tu rol actual no tiene permiso para cambiar la disponibilidad."}
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !catalogo || isLoading ? (
        <MenuSkeleton />
      ) : (
        <>
          <ResumenStock
            resumen={resumen}
            activo={menu.disponibilidad}
            onSeleccionar={menu.setDisponibilidad}
          />

          <Filtros
            categorias={catalogo.categorias}
            busqueda={menu.busqueda}
            onBusqueda={menu.setBusqueda}
            categoria={menu.categoria}
            onCategoria={menu.setCategoria}
          />

          {productosFiltrados.length === 0 ? (
            <SinResultados onLimpiar={menu.limpiarFiltros} />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {productosFiltrados.map((producto) => (
                <li key={producto.id}>
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
          )}
        </>
      )}

      {menu.aviso && <Aviso tipo={menu.aviso.tipo} mensaje={menu.aviso.mensaje} onCerrar={menu.cerrarAviso} />}

      {modal && catalogo && modal.modo !== "categorias" && (
        <ProductoForm
          producto={modal.modo === "editar" ? modal.producto : undefined}
          categorias={catalogo.categorias}
          onGuardar={menu.guardarProducto}
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
          onEliminar={menu.borrarCategoria}
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
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
              "flex cursor-pointer flex-col items-start gap-1 p-3 text-left sm:p-4",
              "hover:border-[#4C0107]/30 dark:hover:border-stone-600",
              seleccionado && "border-[#4C0107]/50 ring-1 ring-[#4C0107]/20 dark:border-stone-400 dark:ring-stone-400/20"
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs dark:text-stone-400">
              {config.label}
            </span>
            <span className={cn("text-2xl font-bold tabular-nums sm:text-3xl", config.valueClass)}>
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-xs">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder="Buscar producto"
          aria-label="Buscar producto"
          className="h-10 rounded-full pl-10"
        />
      </div>

      <div role="radiogroup" aria-label="Categoría" className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
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
                "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors",
                opcionClass(activa)
              )}
            >
              <Icono className="size-3.5" />
              {c.nombre}
            </button>
          )
        })}
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
        "flex h-full flex-col gap-3 rounded-2xl border bg-white p-4 transition-colors",
        "border-slate-100 dark:border-stone-800 dark:bg-stone-900",
        agotado && "border-red-200 bg-red-50/40 dark:border-red-500/25 dark:bg-red-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", config.className)}>
          <Icono className="size-5" />
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            agotado ? ESTADO_PRODUCTO_CLASS.agotado : ESTADO_PRODUCTO_CLASS.disponible
          )}
        >
          {agotado ? "Agotado" : "Disponible"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3
          className={cn(
            "truncate text-sm font-semibold text-slate-900 dark:text-stone-100",
            agotado && "text-slate-500 line-through decoration-1 dark:text-stone-400"
          )}
        >
          {producto.nombre}
        </h3>
        <p className="line-clamp-2 text-xs text-slate-500 dark:text-stone-400">
          {producto.descripcion || "Sin descripción"}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-stone-500">
          {categoria}
          {producto.permitePersonalizacion && " · Personalizable"}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-stone-800">
        <span className="text-base font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">
          {formatToCurrency(producto.precio)}
        </span>

        <div className="flex items-center gap-1.5">
          {puedeEditar && (
            <button
              type="button"
              onClick={() => onEditar(producto)}
              aria-label={`Editar ${producto.nombre}`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              <Pencil className="size-4" />
            </button>
          )}

          {/* RF-10: un solo toque para alternar Disponible / Agotado */}
          {puedeCambiarStock ? (
            <button
              type="button"
              onClick={() => onToggle(producto)}
              disabled={pendiente}
              aria-pressed={agotado}
              aria-label={agotado ? `Marcar ${producto.nombre} como disponible` : `Marcar ${producto.nombre} como agotado`}
              className={cn(
                "inline-flex h-9 min-w-32 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70",
                agotado
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400"
                  : "border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10"
              )}
            >
              {pendiente ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : agotado ? (
                <CircleCheck className="size-3.5" />
              ) : (
                <CircleAlert className="size-3.5" />
              )}
              {agotado ? "Habilitar" : "Marcar agotado"}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-stone-500">
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

function Aviso({ tipo, mensaje, onCerrar }: { tipo: "ok" | "error"; mensaje: string; onCerrar: () => void }) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={cn(
        "fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border p-3 text-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2",
        tipo === "ok"
          ? "border-emerald-200 bg-white text-slate-800 dark:border-emerald-500/30 dark:bg-stone-900 dark:text-stone-100"
          : "border-red-200 bg-white text-slate-800 dark:border-red-500/30 dark:bg-stone-900 dark:text-stone-100"
      )}
    >
      {tipo === "ok" ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
      )}
      <p className="flex-1">{mensaje}</p>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="cursor-pointer text-slate-400 hover:text-slate-700 dark:text-stone-500 dark:hover:text-stone-200"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function SinResultados({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <SearchX className="size-8 text-slate-400 dark:text-stone-500" />
      <p className="text-sm text-slate-600 dark:text-stone-300">No hay productos que coincidan con los filtros.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onLimpiar}
        className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        Limpiar filtros
      </Button>
    </div>
  )
}

function AccesoRestringido({ rol }: { rol: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <Lock className="size-8 text-[#4C0107] dark:text-[#E7B7BC]" />
      <h1 className="text-lg font-bold text-slate-900 dark:text-stone-100">Acceso restringido</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-stone-400">
        Tu rol actual (<span className="font-semibold text-slate-700 dark:text-stone-200">{rol}</span>) no puede
        ver el menú.
      </p>
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
        leftIcon={<RefreshCw className="size-4" />}
        className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        Reintentar
      </Button>
    </div>
  )
}

function MenuSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl dark:bg-stone-800" />
        ))}
      </div>
      <Skeleton className="h-10 rounded-full dark:bg-stone-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-2xl dark:bg-stone-800" />
        ))}
      </div>
    </div>
  )
}
