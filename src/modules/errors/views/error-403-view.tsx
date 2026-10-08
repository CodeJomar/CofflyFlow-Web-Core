"use client"

import * as React from "react"
import { ErrorLayout } from "../components/error-layout"
import { Cup403Illustration } from "../components/cup-illustrations"
import type { ButtonProps } from "@/shared/components/ui/button"

export interface Error403ViewProps {
  onBack?: () => void
  buttonVariant?: ButtonProps["variant"]
}

/**
 * Error 403: Distribución imagen, error, título protagonista y descripción
 */
export function Error403View({ onBack, buttonVariant = "default" }: Error403ViewProps) {
  return (
    <ErrorLayout
      statusCode="403"
      title="esta mesa está reservada."
      description="No tienes permisos de barista para acceder a esta preparación o sección exclusiva."
      cupIllustration={<Cup403Illustration />}
      onBack={onBack}
      buttonVariant={buttonVariant}
      actionLabel="Volver al inicio"
    />
  )
}
