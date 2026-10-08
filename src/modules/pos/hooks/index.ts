"use client"

import * as React from "react"

import type { CobroResultadoDto, LineaPagoPayload } from "@/dtos/caja"
import type { CategoriaCatalogoDto } from "@/dtos/menu"
import type { PedidoCreadoDto, PedidoListadoDto } from "@/dtos/pedidos"
import { conectarTiempoReal } from "@/lib/realtime/kds-socket"
import { useClaveIdempotencia } from "@/shared/hooks/use-clave-idempotencia"
import { normalizarTexto as normalizar } from "@/shared/utils/formatters"
import { aCentimos } from "@/shared/utils/dinero"
import { toastResponse } from "@/shared/utils/toast-response"
import {
  cobrarPedido,
  crearPedido,
  getCatalogoPos,
  getMesasPos,
  getPedidosDeMesa,
  liberarMesa,
} from "../actions/pos.actions"
import {
  FILTRO_TODOS,
  MAX_CANTIDAD_ITEM,
  SONDEO_POS_MS,
  calcularTotales,
  claveAgrupacion,
  itemsParaPedido,
  tieneConfiguracion,
  type CategoriaPos,
  type FiltroCategoria,
  type ItemCarrito,
  type MesaPos,
  type ProductoCatalogo,
  type ProductoPos,
  type SeleccionModificador,
  type TipoAtencion,
  type TotalesCarrito,
} from "../schema"

/* -------------------------------------------------------------------------- */
/*                         Catálogo y mesas (datos vivos)                      */
/* -------------------------------------------------------------------------- */

/**
 * Catálogo de productos y mapa de mesas. Se mantienen al día con eventos en tiempo real (mesas y pedidos),
 * un sondeo cada 30 s y al volver a la pestaña.
 */
export function useCatalogoPos() {
  const [categoriasApi, setCategoriasApi] = React.useState<CategoriaCatalogoDto[]>([])
  const [mesas, setMesas] = React.useState<MesaPos[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busqueda, setBusqueda] = React.useState("")
  const [categoria, setCategoria] = React.useState<FiltroCategoria>(FILTRO_TODOS)
  const [enVivo, setEnVivo] = React.useState(false)

  const cargarCatalogo = React.useCallback(
    (silencioso = false) =>
      getCatalogoPos().then((res) => {
        if (res.isOk()) {
          setCategoriasApi(res.data ?? [])
          setError(null)
        } else if (!silencioso) {
          setError(res.getMessage())
        }
      }),
    [],
  )

  const cargarMesas = React.useCallback(
    (silencioso = false) =>
      getMesasPos().then((res) => {
        if (res.isOk()) setMesas(res.data ?? [])
        else if (!silencioso) setError(res.getMessage())
      }),
    [],
  )

  const cargarTodo = React.useCallback(
    (silencioso = false) => Promise.all([cargarCatalogo(silencioso), cargarMesas(silencioso)]).then(() => setIsLoading(false)),
    [cargarCatalogo, cargarMesas],
  )

  const recargar = React.useCallback(() => {
    setIsLoading(true)
    void cargarTodo()
  }, [cargarTodo])

  React.useEffect(() => {
    void cargarTodo()
    const sondeo = setInterval(() => void cargarTodo(true), SONDEO_POS_MS)
    const alVolver = () => {
      if (document.visibilityState === "visible") void cargarTodo(true)
    }
    document.addEventListener("visibilitychange", alVolver)
    return () => {
      clearInterval(sondeo)
      document.removeEventListener("visibilitychange", alVolver)
    }
  }, [cargarTodo])

  // Tiempo real: el estado de una mesa cambia al instante y los pedidos refrescan el mapa (pedido en curso y total).
  React.useEffect(() => {
    const cerrar = conectarTiempoReal({
      onMesaEstado: ({ id_mesa, estado }) => {
        setMesas((prev) => prev.map((m) => (m.id_mesa === id_mesa ? { ...m, estado } : m)))
        void cargarMesas(true)
      },
      onNuevaComanda: () => void cargarMesas(true),
      onComandaEstado: () => void cargarMesas(true),
      onPagoActualizado: () => void cargarMesas(true),
      onConexion: setEnVivo,
    })
    return () => {
      cerrar?.()
    }
  }, [cargarMesas])

  const categorias = React.useMemo<CategoriaPos[]>(
    () => categoriasApi.map((c) => ({ id: c.id_categoria, nombre: c.nombre })),
    [categoriasApi],
  )

  const productos = React.useMemo<ProductoCatalogo[]>(
    () => categoriasApi.flatMap((c) => c.productos.map((p) => ({ ...p, categoria_nombre: c.nombre }))),
    [categoriasApi],
  )

  const productosFiltrados = React.useMemo(() => {
    const termino = normalizar(busqueda)
    return productos.filter((p) => {
      const coincideCategoria = categoria === FILTRO_TODOS || p.id_categoria === categoria
      const coincideBusqueda =
        !termino || normalizar(p.nombre).includes(termino) || normalizar(p.descripcion ?? "").includes(termino)
      return coincideCategoria && coincideBusqueda
    })
  }, [productos, busqueda, categoria])

  // Si la categoría filtrada desaparece (la borraron desde el Menú), se vuelve a "todos".
  const categoriaActiva =
    categoria === FILTRO_TODOS || categorias.some((c) => c.id === categoria) ? categoria : FILTRO_TODOS

  /** Marca la mesa como libre (la limpieza terminó). Devuelve true si la API lo aceptó. */
  const marcarMesaLibre = React.useCallback(
    async (idMesa: string): Promise<boolean> => {
      const res = await toastResponse(liberarMesa(idMesa), {
        loading: "Liberando mesa...",
        success: "Mesa libre",
        error: "No se pudo liberar la mesa",
      })
      if (res.isOk()) setMesas((prev) => prev.map((m) => (m.id_mesa === idMesa ? { ...m, estado: "libre" } : m)))
      else void cargarMesas(true)
      return res.isOk()
    },
    [cargarMesas],
  )

  return {
    categorias,
    productos,
    productosFiltrados,
    mesas,
    busqueda,
    setBusqueda,
    categoria: categoriaActiva,
    setCategoria,
    isLoading,
    error,
    enVivo,
    recargar,
    recargarMesas: cargarMesas,
    marcarMesaLibre,
  }
}

/* -------------------------------------------------------------------------- */
/*                         Carrito con modificadores y totales                 */
/* -------------------------------------------------------------------------- */

export interface ConfiguracionItem {
  modificadores: SeleccionModificador[]
  notas?: string
}

export function useCarrito() {
  const [items, setItems] = React.useState<ItemCarrito[]>([])

  /** Agrega una unidad. Sin configuración se agrupa con la línea igual del mismo producto; con ella, va como línea propia. */
  const agregar = React.useCallback((producto: ProductoPos, configuracion?: ConfiguracionItem) => {
    if (!producto.disponible) return
    const configurado = configuracion ? tieneConfiguracion(configuracion) : false

    setItems((prev) => {
      if (!configurado) {
        const existente = prev.find((i) => claveAgrupacion(i.producto) === claveAgrupacion(producto) && !tieneConfiguracion(i))
        if (existente) {
          return prev.map((i) => (i.uid === existente.uid ? { ...i, cantidad: Math.min(i.cantidad + 1, MAX_CANTIDAD_ITEM) } : i))
        }
      }
      return [
        ...prev,
        {
          uid: crypto.randomUUID(),
          producto,
          cantidad: 1,
          modificadores: configuracion?.modificadores ?? [],
          notas: configuracion?.notas?.trim() || undefined,
        },
      ]
    })
  }, [])

  const cambiarCantidad = React.useCallback((uid: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.uid === uid ? { ...i, cantidad: Math.min(i.cantidad + delta, MAX_CANTIDAD_ITEM) } : i))
        .filter((i) => i.cantidad > 0),
    )
  }, [])

  const quitar = React.useCallback((uid: string) => setItems((prev) => prev.filter((i) => i.uid !== uid)), [])
  const vaciar = React.useCallback(() => setItems([]), [])

  const totales = React.useMemo<TotalesCarrito>(() => calcularTotales(items), [items])

  // Unidades de cada producto en el carrito (sumando sus variantes).
  const cantidades = React.useMemo(() => {
    const mapa = new Map<string, number>()
    for (const item of items) mapa.set(item.producto.id_producto, (mapa.get(item.producto.id_producto) ?? 0) + item.cantidad)
    return mapa
  }, [items])

  return { items, agregar, cambiarCantidad, quitar, vaciar, totales, cantidades }
}

/* -------------------------------------------------------------------------- */
/*                 Envío de la comanda a cocina (crear el pedido)              */
/* -------------------------------------------------------------------------- */

export function useEnvioPedido() {
  const { obtener, reiniciar } = useClaveIdempotencia()
  const [isSending, setIsSending] = React.useState(false)
  const [pedidoEnviado, setPedidoEnviado] = React.useState<PedidoCreadoDto | null>(null)

  /**
   * Crea el pedido. La misma comanda reintentada (doble toque, red caída) reutiliza la clave y no se duplica.
   * Devuelve el pedido creado o null si la API lo rechazó (caja cerrada, producto agotado, mesa por limpiar...).
   */
  const enviar = React.useCallback(
    async (items: readonly ItemCarrito[], tipo: TipoAtencion, idMesa: string | null): Promise<PedidoCreadoDto | null> => {
      const payload = {
        tipo_pedido: tipo,
        ...(tipo === "salon" && idMesa ? { id_mesa: idMesa } : {}),
        items: itemsParaPedido(items),
      }
      const clave = obtener(JSON.stringify(payload))

      setIsSending(true)
      const res = await toastResponse(crearPedido(payload, clave), {
        loading: "Enviando comanda...",
        success: "Comanda enviada a cocina",
        error: "No se pudo enviar la comanda",
      })
      setIsSending(false)

      if (!res.isOk()) return null
      reiniciar()
      setPedidoEnviado(res.data)
      return res.data
    },
    [obtener, reiniciar],
  )

  const limpiar = React.useCallback(() => setPedidoEnviado(null), [])

  return { enviar, isSending, pedidoEnviado, limpiar }
}

/* -------------------------------------------------------------------------- */
/*                              Pedidos de una mesa                            */
/* -------------------------------------------------------------------------- */

/** Pedidos de hoy de la mesa que todavía tienen saldo por cobrar. */
export function usePedidosPorCobrar(idMesa: string | null, refrescarCuando: string) {
  const [datos, setDatos] = React.useState<{ idMesa: string; pedidos: PedidoListadoDto[] } | null>(null)

  const cargar = React.useCallback(
    (id: string) =>
      getPedidosDeMesa(id).then((res) => {
        if (res.isOk()) setDatos({ idMesa: id, pedidos: res.data })
      }),
    [],
  )

  React.useEffect(() => {
    if (idMesa) void cargar(idMesa)
  }, [idMesa, refrescarCuando, cargar])

  const pedidos = React.useMemo(
    () =>
      datos && datos.idMesa === idMesa
        ? datos.pedidos.filter((p) => p.estado !== "anulado" && p.estado !== "pagado" && aCentimos(p.saldo_pendiente) > 0)
        : [],
    [datos, idMesa],
  )

  const recargar = React.useCallback(() => (idMesa ? cargar(idMesa) : Promise.resolve()), [idMesa, cargar])

  return { pedidos, recargar }
}

/* -------------------------------------------------------------------------- */
/*                                    Cobro                                    */
/* -------------------------------------------------------------------------- */

export function useCobro() {
  const { obtener, reiniciar } = useClaveIdempotencia()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  /**
   * Registra los pagos de un pedido (varias líneas = pago mixto; la suma puede ser menor al saldo: cada comensal paga
   * lo suyo). Un reintento con los mismos datos reutiliza la clave y no cobra dos veces.
   */
  const cobrar = React.useCallback(
    async (idPedido: string, pagos: LineaPagoPayload[]): Promise<CobroResultadoDto | null> => {
      const payload = { id_pedido: idPedido, pagos }
      const clave = obtener(JSON.stringify(payload))

      setIsSubmitting(true)
      const res = await toastResponse(cobrarPedido(payload, clave), {
        loading: "Registrando pago...",
        success: (r) => (r.data?.estado_pago === "pagado" ? "Pedido pagado" : "Pago registrado"),
        error: "No se pudo registrar el pago",
      })
      setIsSubmitting(false)

      if (!res.isOk()) return null
      reiniciar()
      return res.data
    },
    [obtener, reiniciar],
  )

  return { cobrar, isSubmitting }
}
