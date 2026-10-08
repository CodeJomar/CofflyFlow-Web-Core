"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button, type ButtonProps } from "@/shared/components/ui/button"

export interface ErrorLayoutProps {
  statusCode: string | number
  title: string
  description: string
  cupIllustration: React.ReactNode
  onBack?: () => void
  actionLabel?: string
  buttonVariant?: ButtonProps["variant"]
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: ButtonProps["variant"]
  }
}

/**
 * Shell para páginas de error con la distribución solicitada:
 * - Izquierda: Imagen (ilustración de la taza)
 * - Derecha:
 *    1. Error [código] con línea separadora minimalista
 *    2. TÍTULO como el protagonista absoluto (tipografía grande y rotunda)
 *    3. Descripción del error
 *    4. Botón "Volver al inicio" utilizando los botones predefinidos del repositorio (default, outline, ghost, link...)
 * - Sistema Grid de 12 Columnas adaptado a Tablet (md: 6/6) y Desktop (lg: 6/6).
 */
export function ErrorLayout({
  statusCode,
  title,
  description,
  cupIllustration,
  onBack,
  actionLabel = "Volver al inicio",
  buttonVariant = "default",
  secondaryAction,
}: ErrorLayoutProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        router.push("/")
      }
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FAF8F7] dark:bg-stone-950 text-slate-950 dark:text-white flex items-center justify-center p-6 md:p-12 lg:p-16 transition-colors duration-300 relative overflow-hidden">
      
      {/* Fondo minimalista con iluminación cálida muy sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.04] dark:bg-amber-600/[0.06] rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#4C0107]/[0.03] dark:bg-[#4C0107]/[0.12] rounded-full blur-[140px]" />
      </div>

      {/* Rejilla de 12 Columnas: Centrada, equilibrada y con la distribución exacta solicitada */}
      <main className="relative z-10 w-full max-w-5xl lg:max-w-6xl mx-auto grid grid-cols-12 items-center justify-center gap-8 md:gap-12 lg:gap-16">

        {/* 1. IMAGEN (Columna Izquierda: 6 de 12 columnas en tablet y desktop) */}
        <div className="col-span-12 md:col-span-6 flex items-center justify-center">
          <div className="w-full max-w-[320px] sm:max-w-[380px] md:max-w-[440px] lg:max-w-[480px] transition-transform duration-500 hover:scale-[1.02] filter drop-shadow-xl">
            {cupIllustration}
          </div>
        </div>

        {/* 2. TEXTO (Columna Derecha: 6 de 12 columnas en tablet y desktop) */}
        <div className="col-span-12 md:col-span-6 flex flex-col items-start text-left justify-center pl-0 md:pl-4 lg:pl-8">
          
          {/* A. ERROR: Indicador con línea horizontal elegante */}
          <div className="flex flex-col items-start mb-6">
            <span className="text-sm md:text-base font-semibold tracking-normal text-slate-800 dark:text-stone-200">
              Error {statusCode}
            </span>
            <div className="w-8 h-[2px] bg-slate-900 dark:bg-white mt-2" />
          </div>

          {/* B. TÍTULO: EL PROTAGONISTA ABSOLUTO */}
          <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-[4.2rem] font-bold text-slate-950 dark:text-white tracking-tight leading-[1.08] mb-5">
            {title}
          </h1>

          {/* C. DESCRIPCIÓN DEL ERROR */}
          <p className="text-base sm:text-lg text-slate-700 dark:text-stone-300 font-normal leading-relaxed mb-8 max-w-md">
            {description}
          </p>

          {/* D. BOTONES PREDEFINIDOS DEL REPOSITORIO */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={buttonVariant}
              size="lg"
              onClick={handleBack}
            >
              {actionLabel}
            </Button>

            {secondaryAction && (
              <Button
                variant={secondaryAction.variant || "outline"}
                size="lg"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>

        </div>

      </main>
    </div>
  )
}
