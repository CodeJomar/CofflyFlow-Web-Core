"use client"

import * as React from "react"
import { ErrorLayout } from "../components/error-layout"
import { Cup429Illustration } from "../components/cup-illustrations"
import type { ButtonProps } from "@/shared/components/ui/button"

export interface Error429ViewProps {
  onBack?: () => void
  buttonVariant?: ButtonProps["variant"]
}

/**
 * Error 429: Distribución imagen, error, título protagonista y descripción
 */
export function Error429View({ onBack, buttonVariant = "default" }: Error429ViewProps) {
  return (
    <ErrorLayout
      statusCode="429"
      title="la cafetera necesita un respiro."
      description="Has enviado demasiadas solicitudes seguidas. Espera un momento antes de pedir otra taza."
      cupIllustration={<Cup429Illustration />}
      onBack={onBack}
      buttonVariant={buttonVariant}
      actionLabel="Volver al inicio"
    />
  )
}
