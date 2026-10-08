"use client"

import * as React from "react"
import { ErrorLayout } from "../components/error-layout"
import { Cup404Illustration } from "../components/cup-illustrations"
import type { ButtonProps } from "@/shared/components/ui/button"

export interface Error404ViewProps {
  onBack?: () => void
  buttonVariant?: ButtonProps["variant"]
}

/**
 * Error 404: Distribución imagen, error, título protagonista y descripción
 */
export function Error404View({ onBack, buttonVariant = "default" }: Error404ViewProps) {
  return (
    <ErrorLayout
      statusCode="404"
      title="aquí también hay buen café."
      description="Pero la página que buscas no existe o el enlace se preparó de forma incorrecta."
      cupIllustration={<Cup404Illustration />}
      onBack={onBack}
      buttonVariant={buttonVariant}
      actionLabel="Volver al inicio"
    />
  )
}
