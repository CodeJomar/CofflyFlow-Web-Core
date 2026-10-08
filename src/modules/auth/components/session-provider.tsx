"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { Spinner } from "@/shared/components/ui/spinner"
import type { SesionUsuarioDto } from "@/dtos/auth"
import { perfilAction } from "../actions/auth.actions"

const SessionContext = React.createContext<SesionUsuarioDto | null>(null)

/** Usuario autenticado del workspace. Solo disponible dentro de <SessionProvider>. */
export function useSession(): SesionUsuarioDto {
  const usuario = React.useContext(SessionContext)
  if (!usuario) throw new Error("useSession debe usarse dentro de <SessionProvider>.")
  return usuario
}

/**
 * Confirma la sesión real con la API (/auth/me) antes de mostrar el workspace y la vuelve a confirmar cada vez que
 * el usuario regresa a la pestaña: así un cambio de cargo o de permisos hecho por el propietario se refleja sin
 * tener que cerrar sesión. El cliente HTTP renueva el access token si venció; si la sesión no se puede recuperar,
 * vuelve al login. La autorización sigue en NestJS.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario] = React.useState<SesionUsuarioDto | null>(null)

  // La ruta actual se lee al fallar, sin volver a pedir la sesión en cada navegación.
  const rutaActual = React.useRef(pathname)
  React.useEffect(() => {
    rutaActual.current = pathname
  }, [pathname])

  React.useEffect(() => {
    let cancelado = false

    const confirmarSesion = () =>
      perfilAction().then((res) => {
        if (cancelado) return
        if (res.isOk()) setUsuario(res.data)
        else router.replace(`/login?siguiente=${encodeURIComponent(rutaActual.current)}`)
      })

    const alVolver = () => {
      if (document.visibilityState === "visible") void confirmarSesion()
    }

    void confirmarSesion()
    document.addEventListener("visibilitychange", alVolver)
    return () => {
      cancelado = true
      document.removeEventListener("visibilitychange", alVolver)
    }
  }, [router])

  if (!usuario) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#EDE5E6]/40" role="status" aria-label="Verificando sesión">
        <Spinner />
      </div>
    )
  }

  return <SessionContext.Provider value={usuario}>{children}</SessionContext.Provider>
}
