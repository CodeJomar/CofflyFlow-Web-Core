"use client"

import * as React from "react"
import { HelpCircle, TriangleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"

export interface ConfirmOptions {
  title: string
  description?: string
  /** Texto del botón de confirmación. Por defecto "Confirmar" ("Eliminar" no se asume: indícalo). */
  confirmText?: string
  cancelText?: string
  /** `destructive` para acciones irreversibles (eliminar, anular). */
  variant?: "default" | "destructive"
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = React.createContext<ConfirmFn | null>(null)

/**
 * Confirmación global (AlertDialog). Se monta UNA vez en el layout raíz y se usa desde cualquier pantalla:
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: "¿Eliminar producto?", variant: "destructive", confirmText: "Eliminar" }))) return
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  // Las opciones se conservan al cerrar para que el contenido no parpadee durante la animación de salida.
  const [options, setOptions] = React.useState<ConfirmOptions>({ title: "" })
  const resolverRef = React.useRef<((resultado: boolean) => void) | null>(null)

  const resolver = React.useCallback((resultado: boolean) => {
    resolverRef.current?.(resultado)
    resolverRef.current = null
    setOpen(false)
  }, [])

  const confirm = React.useCallback<ConfirmFn>((opciones) => {
    // Si ya había una confirmación pendiente, se descarta como "cancelada".
    resolverRef.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setOptions(opciones)
      setOpen(true)
    })
  }, [])

  const destructiva = options.variant === "destructive"

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(abierto) => !abierto && resolver(false)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className={destructiva ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400" : undefined}>
              {destructiva ? <TriangleAlert /> : <HelpCircle />}
            </AlertDialogMedia>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="md" className="cursor-pointer">
              {options.cancelText ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={destructiva ? "danger" : "default"}
              size="md"
              onClick={() => resolver(true)}
              className="cursor-pointer"
            >
              {options.confirmText ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = React.useContext(ConfirmContext)
  if (!confirm) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider> (montado en el layout raíz).")
  return confirm
}
