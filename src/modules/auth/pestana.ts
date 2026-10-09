/**
 * Marca de la pestaña. La sesión debe terminar al cerrar la pestaña: las cookies de sesión ya mueren al cerrar el
 * navegador, y esta marca (sessionStorage, propia de cada pestaña) cubre el resto. Se pone al iniciar sesión; si el
 * workspace se abre en una pestaña sin marca (pestaña nueva, enlace pegado, navegador reabierto), se cierra la sesión.
 */
const CLAVE = "cf_pestana"

export const marcarPestana = (): void => {
  try {
    sessionStorage.setItem(CLAVE, "1")
  } catch {
    // Sin sessionStorage (modo restringido) no se puede marcar; el guardián no cierra la sesión en ese caso.
  }
}

export const quitarMarcaPestana = (): void => {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // nada que quitar
  }
}

/** true si esta pestaña inició sesión, o si el navegador no permite saberlo (entonces no se expulsa a nadie). */
export const pestanaMarcada = (): boolean => {
  try {
    return sessionStorage.getItem(CLAVE) === "1"
  } catch {
    return true
  }
}
