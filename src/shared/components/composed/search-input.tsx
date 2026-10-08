"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/utils/cn"

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string
  onValueChange: (valor: string) => void
}

/**
 * Buscador estándar: lupa a la izquierda y botón para limpiar a la derecha cuando hay texto.
 * Controlado (`value` + `onValueChange`); usa el `Input` base para heredar sus estados y su modo oscuro.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onValueChange, placeholder = "Buscar…", className, ...props },
  ref,
) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={props["aria-label"] ?? placeholder}
        autoComplete="off"
        className="h-10 rounded-xl pl-10 pr-9 text-sm [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
})
