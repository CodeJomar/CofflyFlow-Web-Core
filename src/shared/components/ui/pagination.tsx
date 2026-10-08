import * as React from "react"

import { cn } from "@/shared/utils/cn"
import { Button } from "@/shared/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

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

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}

