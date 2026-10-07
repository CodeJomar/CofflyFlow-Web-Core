"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

// Mismo fondo que el backdrop del sidebar flotante en tablet: oscuro con desenfoque.
function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-[90] bg-black/50 backdrop-blur-xs transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/70",
        className
      )}
      {...props}
    />
  )
}

/**
 * Panel flotante: misma estética que el sidebar compacto en tablet (separado de los bordes, esquinas muy
 * redondeadas, sombra marcada) y mismo deslizamiento (300 ms ease-in-out).
 */
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-[95] flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white text-sm text-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100",
          // Lateral derecho / izquierdo: flotante con 0.5rem de separación, como el sidebar.
          "data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:sm:max-w-md data-[side=right]:data-ending-style:translate-x-[120%] data-[side=right]:data-starting-style:translate-x-[120%]",
          "data-[side=left]:inset-y-2 data-[side=left]:left-2 data-[side=left]:w-[calc(100%-1rem)] data-[side=left]:sm:max-w-md data-[side=left]:data-ending-style:-translate-x-[120%] data-[side=left]:data-starting-style:-translate-x-[120%]",
          // Superior / inferior
          "data-[side=top]:inset-x-2 data-[side=top]:top-2 data-[side=top]:data-ending-style:-translate-y-[120%] data-[side=top]:data-starting-style:-translate-y-[120%]",
          "data-[side=bottom]:inset-x-2 data-[side=bottom]:bottom-2 data-[side=bottom]:data-ending-style:translate-y-[120%] data-[side=bottom]:data-starting-style:translate-y-[120%]",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            aria-label="Cerrar panel"
            className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 outline-none transition-colors hover:bg-[#EDE5E6]/60 hover:text-[#4C0107] focus-visible:ring-2 focus-visible:ring-[#4C0107]/30 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <XIcon className="size-5" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b border-[#EDE5E6] px-6 py-5 pr-16 dark:border-stone-800", className)}
      {...props}
    />
  )
}

/** Zona central desplazable (el formulario o el detalle). */
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("no-scrollbar flex-1 overflow-y-auto px-6 py-5", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 border-t border-[#EDE5E6] px-6 py-4 sm:flex-row sm:justify-end dark:border-stone-800",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-lg font-semibold text-slate-900 dark:text-stone-100", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-xs leading-relaxed text-slate-600 dark:text-stone-400", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
