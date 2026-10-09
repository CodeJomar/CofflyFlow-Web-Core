"use client"

import { cn } from "@/shared/utils/cn"
import { FILTRO_TODOS, type CategoriaPos, type FiltroCategoria, type ProductoCatalogo } from "../schema"
import { getCategoriaConfig } from "@/shared/utils/categoria-visual"
import { opcionClass } from "./estilos"

/* -------------------------------------------------------------------------- */
/*                                 Catálogo                                   */
/* -------------------------------------------------------------------------- */

export function CategoriaChips({
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
