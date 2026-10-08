import * as React from "react"

import { cn } from "@/shared/utils/cn"
import { Button } from "@/shared/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"
import type { PaginacionAjustada } from "@/shared/hooks/useDataTable"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  asChild?: boolean
  href?: string
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ButtonHTMLAttributes<HTMLButtonElement>

function PaginationLink({
  className,
  isActive,
  size = "icon-sm",
  asChild,
  href,
  children,
  disabled,
  ...props
}: PaginationLinkProps) {
  if (asChild) {
    return (
      <Button
        variant={isActive ? "default" : "ghost"}
        size={size}
        className={cn(className)}
        disabled={disabled}
        asChild
      >
        {children as React.ReactElement}
      </Button>
    )
  }

  if (href) {
    return (
      <Button
        variant={isActive ? "default" : "ghost"}
        size={size}
        className={cn(className)}
        disabled={disabled}
        asChild
      >
        <a
          href={href}
          aria-current={isActive ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive}
        >
          {children}
        </a>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant={isActive ? "default" : "ghost"}
      size={size}
      className={cn(className)}
      disabled={disabled}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      {...props}
    >
      {children}
    </Button>
  )
}

function PaginationPrevious({
  className,
  text = "Anterior",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Ir a página anterior"
      size="sm"
      className={cn("h-8 px-2.5 text-xs gap-1", className)}
      {...props}
    >
      <ChevronLeftIcon className="size-3.5" data-icon="inline-start" />
      <span className="hidden sm:inline">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = "Siguiente",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Ir a página siguiente"
      size="sm"
      className={cn("h-8 px-2.5 text-xs gap-1", className)}
      {...props}
    >
      <span className="hidden sm:inline">{text}</span>
      <ChevronRightIcon className="size-3.5" data-icon="inline-end" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4 text-slate-400 dark:text-stone-500",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">Más páginas</span>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*      Paginación ajustada al espacio disponible (usa usePaginacionAjustada)  */
/* -------------------------------------------------------------------------- */

// Grilla que ocupa el espacio disponible; solo muestra las tarjetas que caben sin scroll
export function GrillaAjustada({
  paginacion,
  etiqueta,
  children,
}: {
  paginacion: PaginacionAjustada
  etiqueta: string
  children: React.ReactNode
}) {
  const { medirContenedor, columnas, altoItem, gap } = paginacion
  const estiloGrilla = {
    gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
    gridAutoRows: `${altoItem}px`,
    gap: `${gap}px`,
  }

  return (
    <div ref={medirContenedor} className="min-h-0 flex-1 overflow-hidden">
      <ul aria-label={etiqueta} className="grid content-start" style={estiloGrilla}>
        {children}
      </ul>
    </div>
  )
}

// Números de página a mostrar: todos si son pocos; si no, extremos y vecinos con elipsis
function paginasVisibles(actual: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const paginas: (number | "…")[] = [1]
  const inicio = Math.max(2, actual - 1)
  const fin = Math.min(total - 1, actual + 1)
  if (inicio > 2) paginas.push("…")
  for (let p = inicio; p <= fin; p++) paginas.push(p)
  if (fin < total - 1) paginas.push("…")
  paginas.push(total)
  return paginas
}

// Paginación de shared: aparece solo cuando las tarjetas no caben en la pantalla
export function BarraPaginacion({
  paginacion,
  etiqueta,
  compacta = false,
}: {
  paginacion: PaginacionAjustada
  etiqueta: string
  // Para paneles angostos: solo flechas y "página / total"
  compacta?: boolean
}) {
  const { pagina, totalPaginas, setPagina, desde, hasta, total } = paginacion
  if (totalPaginas <= 1) return null

  if (compacta) {
    return (
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="truncate text-xs text-slate-500 tabular-nums dark:text-stone-400">
          {desde}–{hasta} de {total}
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                onClick={() => setPagina(pagina - 1)}
                disabled={pagina <= 1}
                aria-label="Ir a página anterior"
                className="cursor-pointer disabled:pointer-events-none disabled:opacity-50"
              >
                <ChevronLeftIcon className="size-4" />
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <span className="px-1 text-xs font-semibold text-slate-600 tabular-nums dark:text-stone-300">
                {pagina} / {totalPaginas}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                onClick={() => setPagina(pagina + 1)}
                disabled={pagina >= totalPaginas}
                aria-label="Ir a página siguiente"
                className="cursor-pointer disabled:pointer-events-none disabled:opacity-50"
              >
                <ChevronRightIcon className="size-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <p className="truncate text-xs text-slate-500 tabular-nums dark:text-stone-400">
        <span className="hidden sm:inline">Mostrando </span>
        {desde}–{hasta} de {total}
        <span className="hidden sm:inline"> {etiqueta}</span>
      </p>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPagina(pagina - 1)}
              disabled={pagina <= 1}
              className="cursor-pointer disabled:pointer-events-none disabled:opacity-50"
            />
          </PaginationItem>

          {paginasVisibles(pagina, totalPaginas).map((numero, i) =>
            numero === "…" ? (
              <PaginationItem key={`elipsis-${i}`} className="hidden sm:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              // En móvil solo se muestra la página actual para no desbordar el ancho
              <PaginationItem key={numero} className={numero === pagina ? undefined : "hidden sm:block"}>
                <PaginationLink
                  isActive={numero === pagina}
                  onClick={() => setPagina(numero)}
                  aria-label={`Página ${numero}`}
                  className="cursor-pointer"
                >
                  {numero}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => setPagina(pagina + 1)}
              disabled={pagina >= totalPaginas}
              className="cursor-pointer disabled:pointer-events-none disabled:opacity-50"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}

