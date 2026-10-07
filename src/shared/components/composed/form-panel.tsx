"use client"

import * as React from "react"

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}
