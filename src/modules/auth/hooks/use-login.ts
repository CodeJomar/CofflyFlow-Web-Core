"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { toastResponse } from "@/shared/utils/toast-response"
import { permisoDeRuta, rutaInicial } from "@/shared/constants/navegacion"
import { puedeCon } from "@/shared/constants/permisos"
import { loginAction } from "../actions/auth.actions"
import { marcarPestana } from "../pestana"
import { loginSchema, type LoginValues } from "../schema"

/**
 * A dónde ir tras iniciar sesión. Solo se aceptan rutas internas (evita redirecciones abiertas) y solo si el cargo
 * puede abrirlas; si no, a Inicio, que lista los accesos que su cargo sí puede usar.
 */
function destinoSeguro(siguiente: string | undefined, permisos: readonly string[]): string {
  const puede = puedeCon(permisos)
  const esInterna = Boolean(siguiente) && siguiente !== "/" && siguiente!.startsWith("/") && !siguiente!.startsWith("//") && !siguiente!.startsWith("/login")
  if (esInterna) {
    const requisito = permisoDeRuta(siguiente!.split("?")[0])
    if (!requisito || puede(requisito)) return siguiente!
  }
  return rutaInicial(puede) ?? "/dashboard"
}

export function useLogin(siguiente?: string) {
  const router = useRouter()
  // Segundos restantes del bloqueo temporal (429); el botón se habilita al llegar a 0.
  const [bloqueoSegundos, setBloqueoSegundos] = React.useState(0)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const bloqueoActivo = bloqueoSegundos > 0
  React.useEffect(() => {
    if (!bloqueoActivo) return
    const intervalo = setInterval(() => setBloqueoSegundos((s) => s - 1), 1000)
    return () => clearInterval(intervalo)
  }, [bloqueoActivo])

  const submit = form.handleSubmit(async ({ email, password }) => {
    // Mientras se envía, el botón queda deshabilitado (impide también el envío con Enter).
    const res = await toastResponse(loginAction(email, password), {
      loading: "Iniciando sesión...",
      success: (r) => `Bienvenido, ${r.data?.usuario.nombre ?? "de nuevo"}`,
      error: (r) => (r.httpStatusCode === 429 ? "Acceso bloqueado temporalmente" : "No se pudo iniciar sesión"),
      errorDescription: (r) => {
        const restantes = r.intentosRestantes
        const aviso =
          r.httpStatusCode === 401 && restantes !== undefined
            ? ` Te quedan ${restantes} intento${restantes === 1 ? "" : "s"}.`
            : ""
        return r.getMessage() + aviso
      },
    })

    if (res.isOk()) {
      marcarPestana()
      router.replace(destinoSeguro(siguiente, res.data.usuario.permisos))
      return
    }

    if (res.httpStatusCode === 429) setBloqueoSegundos(res.retryAfterSegundos ?? 60)
    else form.resetField("password")
  })

  return { form, submit, bloqueoSegundos }
}
