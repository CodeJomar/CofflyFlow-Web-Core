"use client"

import { Plus, SlidersHorizontal } from "lucide-react"

import { cn } from "@/shared/utils/cn"
import { getCategoriaConfig } from "@/shared/utils/categoria-visual"
import { formatearDinero } from "@/shared/utils/dinero"

import { MAX_CANTIDAD_ITEM, type ProductoCatalogo, type ProductoPos } from "../schema"

/**
 * Producto del catálogo: foto (o el ícono de su categoría si no tiene), nombre, descripción y precio. El botón + lo
 * agrega con un toque; el de ajustes abre las opciones y la nota de preparación.
 */
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
  const puedeAgregar = !agotado && !deshabilitado

  return (
    <article
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white transition-all",
        "border-slate-100 hover:-translate-y-0.5 hover:border-[#4C0107]/30 hover:shadow-md",
        "dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600 dark:hover:shadow-black/40",
        cantidad > 0 && "border-[#4C0107]/50 ring-1 ring-[#4C0107]/20 dark:border-[#E7B7BC]/50 dark:ring-[#E7B7BC]/20",
      )}
    >
      {/* Foto del producto; sin foto, el ícono de su categoría sobre un fondo tenue */}
      <div className={cn("relative flex h-20 shrink-0 items-center justify-center overflow-hidden", config.className, agotado && "opacity-60")}>
        {producto.imagen_url ? (
          // Foto cargada por URL externa: no pasa por el optimizador de next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img src={producto.imagen_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <Icono className="size-9 opacity-80 transition-transform duration-300 group-hover:scale-110" />
        )}

        {cantidad > 0 && (
          <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#4C0107] px-1.5 text-xs font-bold tabular-nums text-white shadow dark:bg-stone-100 dark:text-stone-900">
            {cantidad}
          </span>
        )}
        {agotado && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Agotado
          </span>
        )}
        {puedeAgregar && (
          <button
            type="button"
            title={tieneOpciones ? "Elegir opciones y agregar nota de preparación" : "Agregar nota de preparación"}
            aria-label={`Personalizar ${producto.nombre}`}
            onClick={() => onPersonalizar(producto)}
            className="absolute right-2 top-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-[#4C0107] dark:bg-stone-900/90 dark:text-stone-200"
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 p-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className={cn("truncate text-sm font-semibold text-slate-900 dark:text-stone-100", agotado && "text-slate-500 dark:text-stone-400")}>
            {producto.nombre}
          </h3>
          <p className="line-clamp-1 text-xs text-slate-500 dark:text-stone-400">{producto.descripcion || producto.categoria_nombre}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold tabular-nums text-[#4C0107] dark:text-[#E7B7BC]">{formatearDinero(producto.precio)}</span>
          {puedeAgregar && (
            <button
              type="button"
              id={`pos-producto-${producto.id_producto}`}
              onClick={() => onAgregar(producto)}
              disabled={enTope}
              aria-label={`Agregar ${producto.nombre}`}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#4C0107] text-white shadow-sm transition-colors hover:bg-[#4C0107]/85 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
