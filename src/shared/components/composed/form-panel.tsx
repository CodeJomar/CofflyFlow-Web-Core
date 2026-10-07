"use client"

import * as React from "react"

import {
  Panel,
  PanelBody,
  PanelContent,
  PanelDescription,
  PanelFooter,
  PanelHeader,
  PanelTitle,
} from "@/shared/components/ui/panel"

interface FormPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Contenido del formulario o detalle (lo aporta el módulo). */
  children: React.ReactNode
  /** Acciones del pie (guardar, cancelar...). */
  footer?: React.ReactNode
}

/**
 * Contenedor estándar para crear, editar y ver detalles: panel flotante a la derecha con fondo desenfocado.
 * Solo es el armazón; el formulario y su lógica pertenecen al módulo que lo usa.
 */
export function FormPanel({ open, onOpenChange, title, description, children, footer }: FormPanelProps) {
  return (
    <Panel open={open} onOpenChange={onOpenChange}>
      <PanelContent>
        <PanelHeader>
          <PanelTitle>{title}</PanelTitle>
          {description && <PanelDescription>{description}</PanelDescription>}
        </PanelHeader>
        <PanelBody>{children}</PanelBody>
        {footer && <PanelFooter>{footer}</PanelFooter>}
      </PanelContent>
    </Panel>
  )
}
