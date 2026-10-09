"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { Spinner } from "@/shared/components/ui/spinner"
import type { SesionUsuarioDto } from "@/dtos/auth"
import { logoutAction, perfilAction } from "../actions/auth.actions"
import { useInactividad } from "../hooks/use-inactividad"

const SessionContext = React.createContext<SesionUsuarioDto | null>(null)
const RefrescarSesionContext = React.createContext<(() => Promise<void>) | null>(null)

/** Usuario autenticado del workspace. Solo disponible dentro de <SessionProvider>. */
export function useSession(): SesionUsuarioDto {
  const usuario = React.useContext(SessionContext)
  if (!usuario) throw new Error("useSession debe usarse dentro de <SessionProvider>.")
  return usuario
}

/** Vuelve a leer el usuario de la API (por ejemplo, tras cambiar el nombre desde el perfil). */
export function useRefrescarSesion(): () => Promise<void> {
  const refrescar = React.useContext(RefrescarSesionContext)
  if (!refrescar) throw new Error("useRefrescarSesion debe usarse dentro de <SessionProvider>.")
  return refrescar
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

  // Vuelve a pedir la sesión: la usa el efecto de abajo y, desde el perfil, quien edita sus datos
  const refrescar = React.useCallback(
    () =>
      perfilAction().then((res) => {
        if (res.isOk()) setUsuario(res.data)
        else router.replace(`/login?siguiente=${encodeURIComponent(rutaActual.current)}`)
      }),
    [router],
  )

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

  // Sin actividad del usuario durante el tiempo que fija la API, la sesión se cierra y se vuelve al login.
  useInactividad(usuario?.inactividad_segundos, () => {
    void logoutAction().finally(() => router.replace("/login?motivo=inactividad"))
  })

  if (!usuario) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#EDE5E6]/40" role="status" aria-label="Verificando sesión">
        <Spinner />
      </div>
    )
  }

  return (
    <SessionContext.Provider value={usuario}>
      <RefrescarSesionContext.Provider value={refrescar}>{children}</RefrescarSesionContext.Provider>
    </SessionContext.Provider>
  )
}
