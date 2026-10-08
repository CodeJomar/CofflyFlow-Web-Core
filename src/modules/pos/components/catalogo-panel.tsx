"use client"

import * as React from "react"
import { SearchX } from "lucide-react"

import { EstadoError } from "@/shared/components/composed/estado-error"
import { EstadoVacio } from "@/shared/components/composed/estado-vacio"
import { SearchInput } from "@/shared/components/composed/search-input"
import { BarraPaginacion } from "@/shared/components/ui/pagination"
import { usePaginacionSimple } from "@/shared/hooks"
import { cn } from "@/shared/utils/cn"

import type { useCatalogoPos } from "../hooks/use-catalogo-pos"
import { FILTRO_TODOS, PRODUCTOS_POR_PAGINA, type ProductoPos } from "../schema"
import { CatalogoSkeleton } from "./catalogo-skeleton"
import { CategoriaChips } from "./categoria-chips"
import { panelClass } from "./estilos"
import { ProductoCard } from "./producto-card"

interface CatalogoPanelProps {
  catalogo: ReturnType<typeof useCatalogoPos>
  /** Unidades de cada producto que ya están en la comanda. */
  cantidades: ReadonlyMap<string, number>
  puedeCrear: boolean
  busquedaRef: React.Ref<HTMLInputElement>
  onAgregar: (producto: ProductoPos) => void
  onPersonalizar: (producto: ProductoPos) => void
}

/** Catálogo del POS: buscador, categorías y cuadrícula de productos con paginación. */
export function CatalogoPanel({ catalogo, cantidades, puedeCrear, busquedaRef, onAgregar, onPersonalizar }: CatalogoPanelProps) {
  const { categorias, productos, productosFiltrados, busqueda, setBusqueda, categoria, setCategoria, isLoading, error, recargar } = catalogo
  const paginacion = usePaginacionSimple(productosFiltrados, { porPagina: PRODUCTOS_POR_PAGINA, clave: `${busqueda}|${categoria}` })

  return (
    <section className={cn(panelClass, "flex h-full min-w-0 flex-col gap-3.5 p-4 lg:p-5")} aria-label="Catálogo de productos">
      <SearchInput
        ref={busquedaRef}
        id="pos-buscar-producto"
        value={busqueda}
        onValueChange={setBusqueda}
        placeholder="Buscar producto…"
        atajo="/"
        className="[&_input]:rounded-full"
      />

      {!isLoading && <CategoriaChips categorias={categorias} productos={productos} activa={categoria} onChange={setCategoria} />}

      {error ? (
        <EstadoError mensaje={error} onReintentar={recargar} />
      ) : isLoading ? (
        <CatalogoSkeleton />
      ) : productosFiltrados.length === 0 ? (
        <EstadoVacio
          icono={SearchX}
          titulo="Sin productos"
          descripcion="No se encontraron productos con ese criterio."
          accion={{
            texto: "Limpiar filtros",
            onClick: () => {
              setBusqueda("")
              setCategoria(FILTRO_TODOS)
            },
          }}
        />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {paginacion.visibles.map((producto) => (
              <li key={producto.id_producto}>
                <ProductoCard
                  producto={producto}
                  cantidad={cantidades.get(producto.id_producto) ?? 0}
                  deshabilitado={!puedeCrear}
                  onAgregar={onAgregar}
                  onPersonalizar={onPersonalizar}
                />
              </li>
            ))}
          </ul>
          <div className="mt-auto border-t border-slate-100 pt-3 dark:border-stone-800/80">
            <BarraPaginacion paginacion={paginacion} etiqueta="productos" />
          </div>
        </>
      )}
    </section>
  )
}
