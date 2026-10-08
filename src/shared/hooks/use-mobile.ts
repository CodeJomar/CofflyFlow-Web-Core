"use client"

import * as React from "react"

const TABLET_BREAKPOINT = 1024
const CONSULTA = `(max-width: ${TABLET_BREAKPOINT - 1}px)`

function suscribir(alCambiar: () => void) {
  const mql = window.matchMedia(CONSULTA)
  mql.addEventListener("change", alCambiar)
  return () => mql.removeEventListener("change", alCambiar)
}

/** true en pantallas menores al breakpoint de tablet. En el servidor es false. */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  )
}
