"use client"

import { Plus, SlidersHorizontal } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import { formatearDinero } from "@/shared/utils/dinero"
import { MAX_CANTIDAD_ITEM, type ProductoCatalogo, type ProductoPos } from "../schema"
import { getCategoriaConfig } from "@/shared/utils/categoria-visual"

export function ProductoCard({
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
