"use client"

import * as React from "react"
import { Error404View } from "./error-404-view"
import { Error403View } from "./error-403-view"
import { Error500View } from "./error-500-view"
import { Error429View } from "./error-429-view"
import { RotateCcw, SlidersHorizontal, MousePointerClick } from "lucide-react"
import type { ButtonProps } from "@/shared/components/ui/button"

export type ErrorType = "404" | "403" | "500" | "429"
export type ButtonVariantType = NonNullable<ButtonProps["variant"]>

export interface DynamicErrorViewProps {
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null
  reset?: () => void
  initialType?: ErrorType
  showControls?: boolean
  defaultVariant?: ButtonVariantType
}

/**
 * Detecta el tipo de error a partir del objeto de error o mensaje recibido
 */
function detectErrorType(
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null
): ErrorType {
  if (!error) return "500"

  const status = error.status || error.statusCode
  if (status === 404) return "404"
  if (status === 403) return "403"
  if (status === 429) return "429"
  if (status === 500) return "500"

  const msg = (error.message || "").toLowerCase()
  if (msg.includes("404") || msg.includes("not found") || msg.includes("no encontrada")) return "404"
  if (msg.includes("403") || msg.includes("forbidden") || msg.includes("denegado") || msg.includes("unauthorized")) return "403"
  if (msg.includes("429") || msg.includes("too many") || msg.includes("rate limit") || msg.includes("demasiadas")) return "429"

  return "500"
}

/**
 * Vista Dinámica de Errores para Playground y Error Boundaries.
 * - Controla dinámicamente qué error mostrar (404, 403, 500, 429).
 * - Permite alternar entre los botones predefinidos del repositorio (default, outline, ghost, link).
 */
export function DynamicErrorView({
  error,
  reset,
  initialType,
  showControls = true,
  defaultVariant = "default",
}: DynamicErrorViewProps) {
  const detected = React.useMemo(() => initialType || detectErrorType(error), [error, initialType])
  const [currentError, setCurrentError] = React.useState<ErrorType>(detected)
  const [currentVariant, setCurrentVariant] = React.useState<ButtonVariantType>(defaultVariant)

  React.useEffect(() => {
    if (initialType) {
      setCurrentError(initialType)
    } else if (error) {
      setCurrentError(detectErrorType(error))
    }
  }, [error, initialType])

  const errorButtons: Array<{ id: ErrorType; label: string; desc: string }> = [
    { id: "404", label: "404", desc: "No encontrada" },
    { id: "403", label: "403", desc: "Acceso denegado" },
    { id: "500", label: "500", desc: "Taza rota" },
    { id: "429", label: "429", desc: "Desbordada" },
  ]

  const variantButtons: Array<{ id: ButtonVariantType; label: string }> = [
    { id: "default", label: "default" },
    { id: "outline", label: "outline" },
    { id: "ghost", label: "ghost" },
    { id: "link", label: "link" },
  ]

  return (
    <div className="relative min-h-screen w-full">
      {/* Barra de control dinámico en playground / auditoría */}
      {showControls && (
        <aside
          aria-label="Controles de error dinámicos"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-slate-200 dark:border-stone-800 rounded-full px-4 py-2 shadow-2xl flex flex-wrap items-center gap-3 select-none"
        >
          {/* Selector de error */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white mr-1.5">
              <SlidersHorizontal size={14} className="text-[#4C0107] dark:text-amber-500" />
              <span className="hidden sm:inline">Error:</span>
            </div>
            {errorButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setCurrentError(btn.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  currentError === btn.id
                    ? "bg-[#4C0107] text-white shadow-xs scale-105"
                    : "text-slate-800 dark:text-stone-200 hover:bg-slate-200 dark:hover:bg-stone-800"
                }`}
                title={`Error ${btn.id}: ${btn.desc}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-stone-700" />

          {/* Selector de variantes de botones predefinidos */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white mr-1.5">
              <MousePointerClick size={14} className="text-[#4C0107] dark:text-amber-500" />
              <span className="hidden sm:inline">Botón:</span>
            </div>
            {variantButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setCurrentVariant(btn.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  currentVariant === btn.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs scale-105"
                    : "text-slate-700 dark:text-stone-300 hover:bg-slate-200 dark:hover:bg-stone-800"
                }`}
                title={`Variante de botón: ${btn.id}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {reset && (
            <button
              onClick={reset}
              className="ml-1 pl-2 border-l border-slate-300 dark:border-stone-700 flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-[#4C0107] dark:text-white"
              title="Resetear error boundary"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </aside>
      )}

      {/* Renderizado singular dinámico según el error y la variante de botón activa */}
      {currentError === "404" && <Error404View buttonVariant={currentVariant} />}
      {currentError === "403" && <Error403View buttonVariant={currentVariant} />}
      {currentError === "500" && <Error500View buttonVariant={currentVariant} />}
      {currentError === "429" && <Error429View buttonVariant={currentVariant} />}
    </div>
  )
}
