"use client"

import * as React from "react"
import { normalizarTexto as normalizar } from "@/shared/utils/formatters"
import {
  actualizarEstadoMesa,
  despacharComandaCocina,
  getCatalogoPos,
  registrarVenta,
  suscribirseCambiosCatalogo,
} from "../actions/pos.actions"
import {
  IGV_TASA,
  MAX_CANTIDAD_ITEM,
  type CatalogoPos,
  type ComandaDespachada,
  type ComandaPayload,
  type EstadoMesa,
  type FiltroCategoria,
  type ItemCarrito,
  type ModificadoresProducto,
  type ProductoPos,
  type TotalesCarrito,
  type VentaPayload,
  type VentaRegistrada,
} from "../schema"

const redondear = (valor: number) => Math.round(valor * 100) / 100

/* -------------------------------------------------------------------------- */
/*                                  Catálogo                                  */
/* -------------------------------------------------------------------------- */

export function useCatalogoPos() {
  const [catalogo, setCatalogo] = React.useState<CatalogoPos | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [busqueda, setBusqueda] = React.useState("")
  const [categoria, setCategoria] = React.useState<FiltroCategoria>("todos")

  React.useEffect(() => {
    let vigente = true

    getCatalogoPos()
      .then((data) => {
        if (!vigente) return
        setCatalogo(data)
        setError(null)
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar el catálogo de productos.")
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })

    return () => {
      vigente = false
    }
  }, [reloadKey])

  // RF-09 / RF-10 / RF-12: aplica al instante los cambios hechos desde el Menú
  // (productos agotados, precios, categorías) y desde Local y Equipo (mesas y áreas)
  React.useEffect(
    () =>
      suscribirseCambiosCatalogo(({ categorias, productos, areas, mesas }) => {
        setCatalogo((prev) => (prev ? { ...prev, categorias, productos, areas, mesas } : prev))
        setCategoria((actual) =>
          actual === "todos" || categorias.some((c) => c.id === actual) ? actual : "todos"
        )
      }),
    []
  )

  const productosFiltrados = React.useMemo(() => {
    if (!catalogo) return []
    const termino = normalizar(busqueda)

    return catalogo.productos.filter((p) => {
      const coincideCategoria = categoria === "todos" || p.categoriaId === categoria
      const coincideBusqueda =
        !termino || normalizar(p.nombre).includes(termino) || normalizar(p.descripcion).includes(termino)
      return coincideCategoria && coincideBusqueda
    })
  }, [catalogo, busqueda, categoria])

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  const setEstadoMesaLocal = React.useCallback(async (mesaId: string, nuevoEstado: EstadoMesa) => {
    setCatalogo((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        mesas: prev.mesas.map((m) =>
          m.id === mesaId
            ? {
                ...m,
                estado: nuevoEstado,
                tiempoOcupada: nuevoEstado === "ocupada" ? "Recién ocupada" : undefined,
              }
            : m
        ),
      }
    })
    await actualizarEstadoMesa(mesaId, nuevoEstado)
  }, [])

  return {
    catalogo,
    productosFiltrados,
    busqueda,
    setBusqueda,
    categoria,
    setCategoria,
    isLoading,
    error,
    recargar,
    setEstadoMesaLocal,
  }
}

/* -------------------------------------------------------------------------- */
/*                 RF-05: Carrito con Modificadores y Totales                 */
/* -------------------------------------------------------------------------- */

export function useCarrito() {
  const [items, setItems] = React.useState<ItemCarrito[]>([])

  const agregar = React.useCallback((producto: ProductoPos, modificadores?: ModificadoresProducto) => {
    if (!producto.disponible) return

    setItems((prev) => {
      // Si no tiene modificadores, agrupar por ID de producto
      if (!modificadores) {
        const indexExistente = prev.findIndex((i) => i.producto.id === producto.id && !i.modificadores)
        if (indexExistente !== -1) {
          return prev.map((item, idx) =>
            idx === indexExistente
              ? { ...item, cantidad: Math.min(item.cantidad + 1, MAX_CANTIDAD_ITEM) }
              : item
          )
        }
        return [...prev, { uid: `${producto.id}-${Date.now()}`, producto, cantidad: 1 }]
      }

      // Si tiene modificadores, agregar como comanda personalizada independiente
      return [
        ...prev,
        {
          uid: `${producto.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          producto,
          cantidad: 1,
          modificadores,
        },
      ]
    })
  }, [])

  const actualizarModificadores = React.useCallback(
    (uid: string, modificadores: ModificadoresProducto) => {
      setItems((prev) =>
        prev.map((item) => (item.uid === uid ? { ...item, modificadores } : item))
      )
    },
    []
  )

  const cambiarCantidad = React.useCallback((uid: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.uid === uid
            ? { ...i, cantidad: Math.min(i.cantidad + delta, MAX_CANTIDAD_ITEM) }
            : i
        )
        .filter((i) => i.cantidad > 0)
    )
  }, [])

  const quitar = React.useCallback((uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid))
  }, [])

  const vaciar = React.useCallback(() => setItems([]), [])

  const totales = React.useMemo<TotalesCarrito>(() => {
    const total = redondear(
      items.reduce((acc, i) => {
        const precioUnitario = i.producto.precio + (i.modificadores?.precioExtra ?? 0)
        return acc + precioUnitario * i.cantidad
      }, 0)
    )
    const subtotal = redondear(total / (1 + IGV_TASA))
    return {
      unidades: items.reduce((acc, i) => acc + i.cantidad, 0),
      subtotal,
      igv: redondear(total - subtotal),
      total,
    }
  }, [items])

  // Total de unidades de un producto en el carrito (sumando variantes)
  const cantidades = React.useMemo(() => {
    const mapa = new Map<string, number>()
    for (const item of items) {
      mapa.set(item.producto.id, (mapa.get(item.producto.id) ?? 0) + item.cantidad)
    }
    return mapa
  }, [items])

  return {
    items,
    agregar,
    actualizarModificadores,
    cambiarCantidad,
    quitar,
    vaciar,
    totales,
    cantidades,
  }
}

/* -------------------------------------------------------------------------- */
/*               RF-06: Envío Directo de Comanda a Cocina                     */
/* -------------------------------------------------------------------------- */

export function useComandaCocina() {
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [comandaEnviada, setComandaEnviada] = React.useState<ComandaDespachada | null>(null)

  const despachar = React.useCallback(async (payload: ComandaPayload) => {
    setIsSending(true)
    setError(null)
    try {
      const resultado = await despacharComandaCocina(payload)
      setComandaEnviada(resultado)
      return resultado
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar la comanda a cocina.")
      return null
    } finally {
      setIsSending(false)
    }
  }, [])

  const limpiar = React.useCallback(() => {
    setComandaEnviada(null)
    setError(null)
  }, [])

  return { despachar, isSending, error, comandaEnviada, limpiar }
}

/* -------------------------------------------------------------------------- */
/*                                   Cobro                                    */
/* -------------------------------------------------------------------------- */

export function useCobro() {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [venta, setVenta] = React.useState<VentaRegistrada | null>(null)

  const cobrar = React.useCallback(async (payload: VentaPayload) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const registrada = await registrarVenta(payload)
      setVenta(registrada)
      return registrada
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la venta.")
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const reiniciar = React.useCallback(() => {
    setVenta(null)
    setError(null)
  }, [])

  return { cobrar, isSubmitting, error, setError, venta, reiniciar }
}
