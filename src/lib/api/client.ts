import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios"
import type { BaseResponse } from "@/dtos/core/baseResponse.dto"
import type { ConstructorLike } from "@/dtos/core/helpers"
import { env } from "@/env"

/**
 * Cliente tipado hacia la API NestJS.
 * - La sesión viaja en cookies HttpOnly emitidas por NestJS (`withCredentials`); el frontend nunca ve ni guarda tokens.
 * - Solo se envían credenciales al origen de la API configurado.
 */
export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
})

// Rutas de autenticación que no deben intentar renovar la sesión ante un 401.
const RUTAS_SIN_RENOVACION = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/activar", "/auth/recuperar", "/auth/verificar-otp", "/auth/restablecer-password"]

let renovacionEnCurso: Promise<boolean> | null = null

function renovarSesion(): Promise<boolean> {
  renovacionEnCurso ??= api
    .post("/auth/refresh", {})
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      renovacionEnCurso = null
    })
  return renovacionEnCurso
}

// Si el access token venció (401), se renueva una vez con el refresh token (cookie) y se reintenta.
api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) throw error

  const config = error.config as InternalAxiosRequestConfig & { _reintentado?: boolean }
  const url = config.url ?? ""
  if (config._reintentado || RUTAS_SIN_RENOVACION.some((ruta) => url.startsWith(ruta))) throw error

  config._reintentado = true
  if (await renovarSesion()) return api.request(config)

  // La sesión ya no se puede renovar (vencida o revocada): se vuelve al login.
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace(`/login?siguiente=${encodeURIComponent(window.location.pathname)}`)
  }
  throw error
})

/**
 * Ejecuta una petición y la envuelve en el DTO de respuesta estándar (OneQuery, CheckStatus, ...).
 * Nunca lanza: los errores HTTP y de red quedan en `mensajes` y `httpStatusCode`.
 */
export async function apiRequest<R extends BaseResponse>(
  ResponseType: ConstructorLike<R>,
  config: AxiosRequestConfig,
): Promise<R> {
  try {
    const res = await api.request(config)
    const response = new ResponseType(res.data)
    response.httpStatusCode = res.status
    return response
  } catch (error) {
    const response = new ResponseType(undefined)
    if (axios.isAxiosError(error)) return response.setAxiosError(error) as R
    return response.setUnknownError(error) as R
  }
}
