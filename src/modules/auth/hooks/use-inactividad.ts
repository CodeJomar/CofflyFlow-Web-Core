"use client"

import * as React from "react"

import { actividadAction } from "../actions/auth.actions"

/** Entradas del usuario que cuentan como actividad. Las consultas automáticas de las pantallas no cuentan. */
const EVENTOS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const
/** Cada cuánto, como máximo, se avisa a la API de que el usuario sigue activo. */
const LATIDO_MS = 30_000
const REVISION_MS = 10_000

/**
 * Cierra la sesión por inactividad: si el usuario no hace clic, no teclea ni toca la pantalla durante `limiteSegundos`,
 * llama a `alExpirar`. Mientras hay actividad envía un latido a la API (POST /auth/actividad) para que su sesión no
 * venza; la API es la que manda: aunque esta pantalla fallara, rechaza la sesión inactiva.
 */
export function useInactividad(limiteSegundos: number | undefined, alExpirar: () => void): void {
  const alExpirarRef = React.useRef(alExpirar)
  React.useEffect(() => {
    alExpirarRef.current = alExpirar
  }, [alExpirar])

  React.useEffect(() => {
    if (!limiteSegundos) return
    // El latido nunca es más espaciado que un tercio del límite (con 5 min son 30 s; con límites cortos, más seguido).
    const latidoMs = Math.min(LATIDO_MS, (limiteSegundos * 1000) / 3)
    let ultimaActividad = Date.now()
    let ultimoLatido = Date.now()
    let expirada = false

    const revisar = () => {
      if (expirada || Date.now() - ultimaActividad < limiteSegundos * 1000) return
      expirada = true
      alExpirarRef.current()
    }

    const alActuar = () => {
      const ahora = Date.now()
      if (expirada) return
      // Volver tras superar el límite no revive la sesión: se revisa antes de contar la nueva actividad.
      if (ahora - ultimaActividad >= limiteSegundos * 1000) return revisar()
      ultimaActividad = ahora
      if (ahora - ultimoLatido > latidoMs) {
        ultimoLatido = ahora
        void actividadAction()
      }
    }

    const alVolver = () => {
      if (document.visibilityState === "visible") revisar()
    }

    for (const evento of EVENTOS) window.addEventListener(evento, alActuar, { passive: true, capture: true })
    document.addEventListener("visibilitychange", alVolver)
    const intervalo = setInterval(revisar, REVISION_MS)
    return () => {
      for (const evento of EVENTOS) window.removeEventListener(evento, alActuar, { capture: true })
      document.removeEventListener("visibilitychange", alVolver)
      clearInterval(intervalo)
    }
  }, [limiteSegundos])
}
