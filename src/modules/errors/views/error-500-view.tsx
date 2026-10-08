"use client"

import * as React from "react"
import { ErrorLayout } from "../components/error-layout"
import { Cup500Illustration } from "../components/cup-illustrations"
import type { ButtonProps } from "@/shared/components/ui/button"

export interface Error500ViewProps {
  onBack?: () => void
  buttonVariant?: ButtonProps["variant"]
  onRetry?: () => void
  error?: Error & { digest?: string }
}

/**
 * Error 500: Distribución imagen, error, título protagonista y descripción
 */
export function Error500View({ onBack, buttonVariant = "default", onRetry }: Error500ViewProps) {
  return (
    <ErrorLayout
      statusCode="500"
      title="se nos derramó el espresso."
      description="Ocurrió un fallo inesperado en nuestros servidores, pero ya estamos limpiando la barra."
      cupIllustration={<Cup500Illustration />}
      onBack={onBack}
      buttonVariant={buttonVariant}
      actionLabel="Volver al inicio"
      secondaryAction={onRetry ? { label: "Reintentar", onClick: onRetry, variant: "outline" } : undefined}
    />
  )
}
