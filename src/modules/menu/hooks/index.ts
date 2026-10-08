"use client"

import * as React from "react"
import { toast } from "@/shared/components/ui/toast"
import { normalizarTexto } from "@/shared/utils/formatters"
import { suscribirseCambiosCatalogo } from "@/modules/pos/actions/pos.actions"
import {
  actualizarCategoria,
  cambiarDisponibilidadProducto,
  crearCategoria,
  getCatalogoMenu,
} from "../actions/menu.actions"
import type {
  CatalogoMenu,
  CategoriaMenu,
  FiltroCategoria,
  FiltroDisponibilidad,
  ProductoMenu,
  ResumenMenu,
} from "../schema"

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

  React.useEffect(() => {
    let vigente = true

    getCatalogoMenu()
      .then((respuesta) => {
        if (!vigente) return
        if (respuesta.isOk()) {
          setCatalogo(respuesta.data)
          setError(null)
        } else {
          setError(respuesta.getMessage())
        }
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

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  // Inserta o reemplaza un producto en el catálogo local
  const aplicarProducto = React.useCallback((producto: ProductoMenu) => {
    setCatalogo((prev) => {
      if (!prev) return prev
      const existe = prev.productos.some((p) => p.id === producto.id)
      return {
        ...prev,
        productos: existe
          ? prev.productos.map((p) => (p.id === producto.id ? producto : p))
          : [...prev.productos, producto],
      }
    })
  }, [])

  const productosFiltrados = React.useMemo(() => {
    if (!catalogo) return []
    const termino = normalizarTexto(busqueda)

    return catalogo.productos.filter((p) => {
      const coincideCategoria = categoria === "todos" || p.categoriaId === categoria
      const coincideDisponibilidad =
        disponibilidad === "todos" || (disponibilidad === "disponibles" ? p.disponible : !p.disponible)
      const coincideBusqueda =
        !termino ||
        normalizarTexto(p.nombre).includes(termino) ||
        normalizarTexto(p.descripcion).includes(termino)
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

      aplicarProducto({ ...producto, disponible })
      setPendientes((prev) => new Set(prev).add(producto.id))

      const respuesta = await cambiarDisponibilidadProducto(producto.id, disponible)
      if (respuesta.isOk()) {
        aplicarProducto(respuesta.data)
        toast.add({
          type: "success",
          title: disponible
            ? `"${producto.nombre}" vuelve a estar disponible en el POS.`
            : `"${producto.nombre}" marcado como Agotado. Ya no se puede seleccionar en el POS.`,
        })
      } else {
        aplicarProducto(producto)
        toast.add({ type: "error", title: `No se pudo actualizar "${producto.nombre}".`, description: respuesta.getMessage() })
      }

      setPendientes((prev) => {
        const siguiente = new Set(prev)
        siguiente.delete(producto.id)
        return siguiente
      })
    },
    [pendientes, aplicarProducto]
  )

  // Se invoca desde el formulario (useEntityForm de shared) tras guardar con éxito
  const productoGuardado = React.useCallback(
    (producto: ProductoMenu, esNuevo: boolean) => {
      aplicarProducto(producto)
      toast.add({
        type: "success",
        title: esNuevo ? `"${producto.nombre}" agregado al menú.` : `"${producto.nombre}" actualizado.`,
      })
    },
    [aplicarProducto]
  )

  /* ------------------------- RF-09: Categorías -------------------------- */

  // Alta o renombrado de categoría; devuelve la respuesta para mostrar el error en el formulario
  const guardarCategoria = React.useCallback(async (nombre: string, id?: string) => {
    const respuesta = id ? await actualizarCategoria(id, nombre) : await crearCategoria(nombre)
    if (respuesta.isOk()) {
      const guardada = respuesta.data
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
      toast.add({
        type: "success",
        title: id ? `Categoría renombrada a "${guardada.nombre}".` : `Categoría "${guardada.nombre}" creada.`,
      })
    }
    return respuesta
  }, [])

  // Se invoca desde el formulario (useEntityDelete de shared) tras eliminar con éxito
  const categoriaEliminada = React.useCallback((categoriaEliminadaItem: CategoriaMenu) => {
    setCatalogo((prev) =>
      prev ? { ...prev, categorias: prev.categorias.filter((c) => c.id !== categoriaEliminadaItem.id) } : prev
    )
    setCategoria((actual) => (actual === categoriaEliminadaItem.id ? "todos" : actual))
    toast.add({ type: "success", title: `Categoría "${categoriaEliminadaItem.nombre}" eliminada.` })
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
    productoGuardado,
    guardarCategoria,
    categoriaEliminada,
  }
}
