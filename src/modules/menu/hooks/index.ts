"use client"

import * as React from "react"
import { suscribirseCambiosCatalogo } from "@/modules/pos/actions/pos.actions"
import {
  actualizarCategoria,
  actualizarProducto,
  cambiarDisponibilidadProducto,
  crearCategoria,
  crearProducto,
  eliminarCategoria,
  getCatalogoMenu,
} from "../actions/menu.actions"
import type {
  CatalogoMenu,
  CategoriaMenu,
  FiltroCategoria,
  FiltroDisponibilidad,
  ProductoInput,
  ProductoMenu,
  ResumenMenu,
} from "../schema"

// Normaliza texto para búsquedas sin tildes ni mayúsculas
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

export function useMenu() {
  const [catalogo, setCatalogo] = React.useState<CatalogoMenu | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  const [busqueda, setBusqueda] = React.useState("")
  const [categoria, setCategoria] = React.useState<FiltroCategoria>("todos")
  const [disponibilidad, setDisponibilidad] = React.useState<FiltroDisponibilidad>("todos")

  // Productos con un cambio de disponibilidad en curso
  const [pendientes, setPendientes] = React.useState<ReadonlySet<string>>(new Set())
  // Mensaje breve de confirmación o error tras cambiar la disponibilidad
  const [aviso, setAviso] = React.useState<{ tipo: "ok" | "error"; mensaje: string } | null>(null)

  React.useEffect(() => {
    let vigente = true

    getCatalogoMenu()
      .then((data) => {
        if (!vigente) return
        setCatalogo(data)
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar el catálogo del menú.")
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })

    return () => {
      vigente = false
    }
  }, [reloadKey])

  // Mantiene el menú alineado si el catálogo cambia desde otra pestaña o terminal
  React.useEffect(
    () =>
      suscribirseCambiosCatalogo(({ categorias, productos }) => {
        setCatalogo({
          categorias: categorias.map((c) => ({ ...c })),
          productos: productos.map((p) => ({ ...p })),
        })
        setCategoria((actual) =>
          actual === "todos" || categorias.some((c) => c.id === actual) ? actual : "todos"
        )
      }),
    []
  )

  // El aviso desaparece solo después de unos segundos
  React.useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(null), 3500)
    return () => window.clearTimeout(timer)
  }, [aviso])

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  const reemplazarProducto = React.useCallback((producto: ProductoMenu) => {
    setCatalogo((prev) =>
      prev
        ? { ...prev, productos: prev.productos.map((p) => (p.id === producto.id ? producto : p)) }
        : prev
    )
  }, [])

  const productosFiltrados = React.useMemo(() => {
    if (!catalogo) return []
    const termino = normalizar(busqueda)

    return catalogo.productos.filter((p) => {
      const coincideCategoria = categoria === "todos" || p.categoriaId === categoria
      const coincideDisponibilidad =
        disponibilidad === "todos" || (disponibilidad === "disponibles" ? p.disponible : !p.disponible)
      const coincideBusqueda =
        !termino || normalizar(p.nombre).includes(termino) || normalizar(p.descripcion).includes(termino)
      return coincideCategoria && coincideDisponibilidad && coincideBusqueda
    })
  }, [catalogo, busqueda, categoria, disponibilidad])

  const resumen = React.useMemo<ResumenMenu>(() => {
    const productos = catalogo?.productos ?? []
    const disponibles = productos.filter((p) => p.disponible).length
    return { total: productos.length, disponibles, agotados: productos.length - disponibles }
  }, [catalogo])

  /**
   * RF-10: Cambia la disponibilidad con un solo toque.
   * La interfaz se actualiza al instante y se revierte si el guardado falla.
   */
  const toggleDisponibilidad = React.useCallback(
    async (producto: ProductoMenu) => {
      if (pendientes.has(producto.id)) return
      const disponible = !producto.disponible

      reemplazarProducto({ ...producto, disponible })
      setPendientes((prev) => new Set(prev).add(producto.id))

      try {
        const actualizado = await cambiarDisponibilidadProducto(producto.id, disponible)
        reemplazarProducto(actualizado)
        setAviso({
          tipo: "ok",
          mensaje: disponible
            ? `"${producto.nombre}" vuelve a estar disponible en el POS.`
            : `"${producto.nombre}" marcado como Agotado. Ya no se puede seleccionar en el POS.`,
        })
      } catch {
        reemplazarProducto(producto)
        setAviso({ tipo: "error", mensaje: `No se pudo actualizar "${producto.nombre}". Intenta de nuevo.` })
      } finally {
        setPendientes((prev) => {
          const siguiente = new Set(prev)
          siguiente.delete(producto.id)
          return siguiente
        })
      }
    },
    [pendientes, reemplazarProducto]
  )

  // Alta o edición de un producto; propaga el error para mostrarlo en el formulario
  const guardarProducto = React.useCallback(
    async (input: ProductoInput, id?: string) => {
      const guardado = id ? await actualizarProducto(id, input) : await crearProducto(input)
      setCatalogo((prev) => {
        if (!prev) return prev
        const existe = prev.productos.some((p) => p.id === guardado.id)
        return {
          ...prev,
          productos: existe
            ? prev.productos.map((p) => (p.id === guardado.id ? guardado : p))
            : [...prev.productos, guardado],
        }
      })
      setAviso({ tipo: "ok", mensaje: id ? `"${guardado.nombre}" actualizado.` : `"${guardado.nombre}" agregado al menú.` })
      return guardado
    },
    []
  )

  /* ------------------------- RF-09: Categorías -------------------------- */

  // Alta o renombrado de categoría; propaga el error para mostrarlo en el formulario
  const guardarCategoria = React.useCallback(async (nombre: string, id?: string) => {
    const guardada = id ? await actualizarCategoria(id, nombre) : await crearCategoria(nombre)
    setCatalogo((prev) => {
      if (!prev) return prev
      const existe = prev.categorias.some((c) => c.id === guardada.id)
      return {
        ...prev,
        categorias: existe
          ? prev.categorias.map((c) => (c.id === guardada.id ? guardada : c))
          : [...prev.categorias, guardada],
      }
    })
    setAviso({ tipo: "ok", mensaje: id ? `Categoría renombrada a "${guardada.nombre}".` : `Categoría "${guardada.nombre}" creada.` })
    return guardada
  }, [])

  const borrarCategoria = React.useCallback(async (categoria: CategoriaMenu) => {
    await eliminarCategoria(categoria.id)
    setCatalogo((prev) =>
      prev ? { ...prev, categorias: prev.categorias.filter((c) => c.id !== categoria.id) } : prev
    )
    setCategoria((actual) => (actual === categoria.id ? "todos" : actual))
    setAviso({ tipo: "ok", mensaje: `Categoría "${categoria.nombre}" eliminada.` })
  }, [])

  const limpiarFiltros = React.useCallback(() => {
    setBusqueda("")
    setCategoria("todos")
    setDisponibilidad("todos")
  }, [])

  return {
    catalogo,
    productosFiltrados,
    resumen,
    isLoading,
    error,
    recargar,
    busqueda,
    setBusqueda,
    categoria,
    setCategoria,
    disponibilidad,
    setDisponibilidad,
    limpiarFiltros,
    pendientes,
    toggleDisponibilidad,
    guardarProducto,
    guardarCategoria,
    borrarCategoria,
    aviso,
    cerrarAviso: () => setAviso(null),
  }
}
