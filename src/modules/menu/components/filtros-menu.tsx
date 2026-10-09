"use client"

import { getCategoriaConfig } from "@/shared/utils/categoria-visual"
import { SearchInput } from "@/shared/components/composed/search-input"
import { cn } from "@/shared/utils/cn"
import { FILTRO_TODOS, type CategoriaMenu, type FiltroCategoria } from "../schema"
import { opcionClass } from "./estilos"

/* -------------------------------------------------------------------------- */
/*                                  Filtros                                   */
/* -------------------------------------------------------------------------- */

export function Filtros({
  categorias,
  busqueda,
  onBusqueda,
  categoria,
  onCategoria,
}: {
  categorias: CategoriaMenu[]
  busqueda: string
  onBusqueda: (valor: string) => void
  categoria: FiltroCategoria
  onCategoria: (categoria: FiltroCategoria) => void
}) {
  const opciones = [
    { id: FILTRO_TODOS as string, nombre: "Todos", categoria: null as CategoriaMenu | null },
    ...categorias.map((c) => ({ id: c.id_categoria, nombre: c.nombre, categoria: c as CategoriaMenu | null })),
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Categorías responsivas (flex-wrap sin scroll horizontal, visibles 100% en mobile) */}
      <div>
        <div
          role="radiogroup"
          aria-label="Categoría"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-100/70 dark:bg-stone-900/60 border border-slate-200/60 dark:border-stone-800"
        >
          {opciones.map((c) => {
            const Icono = getCategoriaConfig(c.categoria ?? FILTRO_TODOS).icon
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

      {/* Buscador de productos, a todo el ancho */}
      <SearchInput value={busqueda} onValueChange={onBusqueda} placeholder="Buscar producto..." />
    </div>
  )
}
