import Link from "next/link"
import { ShieldAlert } from "lucide-react"

import { buttonVariants } from "@/shared/components/ui/button"

interface AccesoDenegadoProps {
  /** Pantalla a la que puede volver; si no tiene ninguna, solo se muestra el aviso. */
  rutaSegura?: string | null
  className?: string
}

/** Aviso estándar cuando el cargo del usuario no incluye el permiso de la pantalla que intenta abrir. */
export function AccesoDenegado({ rutaSegura, className }: AccesoDenegadoProps) {
  return (
    <div
      role="alert"
      className={`flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center ${className ?? ""}`}
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
        <ShieldAlert className="size-10" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-stone-100">No tienes acceso a esta sección</h2>
        <p className="max-w-sm text-sm text-slate-500 dark:text-stone-400">
          Tu cargo no incluye este permiso. Si crees que es un error, pídeselo al encargado del local.
        </p>
      </div>
      {rutaSegura && (
        <Link href={rutaSegura} className={buttonVariants({ variant: "neutral", size: "sm" })}>
          Ir a mi inicio
        </Link>
      )}
    </div>
  )
}
