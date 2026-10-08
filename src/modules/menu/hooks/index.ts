"use client"

import * as React from "react"

import type { ProductoDto } from "@/dtos/menu"
import { normalizarTexto } from "@/shared/utils/formatters"
import { toastResponse } from "@/shared/utils/toast-response"

import {
  actualizarCategoria,
  actualizarGrupo,
  actualizarOpcion,
  actualizarProducto,
  asignarGrupos,
  cambiarDisponibilidadOpcion,
  cambiarDisponibilidadProducto,
  crearCategoria,
  crearGrupo,
  crearOpcion,
  crearProducto,
  eliminarCategoria,
  eliminarGrupo,
  eliminarOpcion,
  eliminarProducto,
  getCatalogoMenu,
  getGrupos,
} from "../actions/menu.actions"
import {
  FILTRO_TODOS,
  deltaDesdeTexto,
  type CatalogoMenu,
  type FiltroCategoria,
  type FiltroDisponibilidad,
  type GrupoFormValues,
  type GrupoMenu,
  type OpcionFormValues,
  type ProductoFormValues,
  type ProductoMenu,
  type ResumenMenu,
} from "../schema"

export function useMenu() {
  const [catalogo, setCatalogo] = React.useState<CatalogoMenu | null>(null)
  const [grupos, setGrupos] = React.useState<GrupoMenu[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  const [busqueda, setBusqueda] = React.useState("")
  const [categoria, setCategoria] = React.useState<FiltroCategoria>(FILTRO_TODOS)
  const [disponibilidad, setDisponibilidad] = React.useState<FiltroDisponibilidad>("todos")

  // Productos con un cambio de disponibilidad en curso
  const [pendientes, setPendientes] = React.useState<ReadonlySet<string>>(new Set())

  React.useEffect(() => {
    let vigente = true

    Promise.all([getCatalogoMenu(), getGrupos()])
      .then(([respuestaCatalogo, respuestaGrupos]) => {
        if (!vigente) return
        if (!respuestaCatalogo.isOk()) {
          setError(respuestaCatalogo.getMessage())
          return
        }
        const categorias = respuestaCatalogo.data ?? []
        setCatalogo({
          categorias,
          productos: categorias.flatMap((c) => c.productos),
        })
        setGrupos(respuestaGrupos.isOk() ? (respuestaGrupos.data ?? []) : [])
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

  // Recarga mostrando el estado de carga (botón "Actualizar")
  const recargar = React.useCallback(() => {
    setIsLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  // Recarga sin parpadeo, tras guardar o eliminar algo
  const refrescar = React.useCallback(() => setReloadKey((k) => k + 1), [])

  // Reemplaza un producto en el catálogo local (cambio inmediato mientras la API responde)
  const aplicarProducto = React.useCallback((producto: ProductoMenu) => {
    setCatalogo((prev) =>
      prev ? { ...prev, productos: prev.productos.map((p) => (p.id_producto === producto.id_producto ? producto : p)) } : prev,
    )
  }, [])

  const productosFiltrados = React.useMemo(() => {
    if (!catalogo) return []
    const termino = normalizarTexto(busqueda)

    return catalogo.productos.filter((p) => {
      const coincideCategoria = categoria === FILTRO_TODOS || p.id_categoria === categoria
      const coincideDisponibilidad =
        disponibilidad === "todos" || (disponibilidad === "disponibles" ? p.disponible : !p.disponible)
      const coincideBusqueda =
        !termino ||
        normalizarTexto(p.nombre).includes(termino) ||
        normalizarTexto(p.descripcion ?? "").includes(termino)
      return coincideCategoria && coincideDisponibilidad && coincideBusqueda
    })
  }, [catalogo, busqueda, categoria, disponibilidad])

  const resumen = React.useMemo<ResumenMenu>(() => {
    const productos = catalogo?.productos ?? []
    const disponibles = productos.filter((p) => p.disponible).length
    return { total: productos.length, disponibles, agotados: productos.length - disponibles }
  }, [catalogo])

  const limpiarFiltros = React.useCallback(() => {
    setBusqueda("")
    setCategoria(FILTRO_TODOS)
    setDisponibilidad("todos")
  }, [])

  /**
   * Cambia la disponibilidad con un solo toque.
   * La interfaz se actualiza al instante y se revierte si el guardado falla.
   */
  const toggleDisponibilidad = React.useCallback(
    async (producto: ProductoMenu) => {
      if (pendientes.has(producto.id_producto)) return
      const disponible = !producto.disponible

      aplicarProducto({ ...producto, disponible })
      setPendientes((prev) => new Set(prev).add(producto.id_producto))

      const respuesta = await toastResponse(cambiarDisponibilidadProducto(producto.id_producto, disponible), {
        loading: "Actualizando disponibilidad…",
        success: disponible
          ? `"${producto.nombre}" vuelve a estar disponible en el POS`
          : `"${producto.nombre}" marcado como Agotado`,
        successDescription: disponible ? undefined : "Ya no se puede seleccionar en el POS.",
        error: `No se pudo actualizar "${producto.nombre}"`,
      })
      if (!respuesta.isOk()) aplicarProducto(producto)

      setPendientes((prev) => {
        const siguiente = new Set(prev)
        siguiente.delete(producto.id_producto)
        return siguiente
      })
    },
    [pendientes, aplicarProducto],
  )

  /* ------------------------------ Productos -------------------------------- */

  /**
   * Crea o actualiza un producto y, si cambió, su lista de grupos de personalización.
   * Devuelve true si todo se guardó (el formulario se cierra solo en ese caso).
   */
  const guardarProducto = React.useCallback(
    async (values: ProductoFormValues, producto?: ProductoMenu): Promise<boolean> => {
      const base = {
        id_categoria: values.categoriaId,
        nombre: values.nombre.trim(),
        descripcion: values.descripcion.trim(),
        precio: values.precio.replace(",", "."),
        disponible: values.disponible,
      }
      const gruposAnteriores = producto?.grupos_modificadores.map((g) => g.id_grupo) ?? []
      const gruposCambiaron =
        values.grupos.length !== gruposAnteriores.length || values.grupos.some((id) => !gruposAnteriores.includes(id))

      const operacion = (async () => {
        const guardado = producto
          ? await actualizarProducto(producto.id_producto, base)
          : await crearProducto(base)
        if (!guardado.isOk()) return guardado
        const idProducto = (guardado.data as ProductoDto).id_producto
        if (gruposCambiaron) {
          const asignacion = await asignarGrupos(idProducto, {
            grupos: values.grupos.map((id_grupo, orden_visual) => ({ id_grupo, orden_visual })),
          })
          if (!asignacion.isOk()) return asignacion
        }
        return guardado
      })()

      const respuesta = await toastResponse(operacion, {
        loading: producto ? "Guardando los cambios…" : "Agregando el producto…",
        success: producto ? `"${base.nombre}" actualizado` : `"${base.nombre}" agregado al menú`,
        error: producto ? "No se pudo guardar el producto" : "No se pudo agregar el producto",
      })
      // Aunque la asignación de grupos falle, el producto ya existe: se vuelve a leer el catálogo
      refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  const quitarProducto = React.useCallback(
    async (producto: ProductoMenu): Promise<boolean> => {
      const respuesta = await toastResponse(eliminarProducto(producto.id_producto), {
        loading: "Eliminando el producto…",
        success: `"${producto.nombre}" eliminado`,
        error: "No se pudo eliminar el producto",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  /* ------------------------------ Categorías ------------------------------- */

  // Alta o renombrado de categoría
  const guardarCategoria = React.useCallback(
    async (nombre: string, id?: string): Promise<boolean> => {
      const respuesta = await toastResponse(id ? actualizarCategoria(id, { nombre }) : crearCategoria({ nombre }), {
        loading: id ? "Renombrando la categoría…" : "Creando la categoría…",
        success: id ? `Categoría renombrada a "${nombre}"` : `Categoría "${nombre}" creada`,
        error: id ? "No se pudo renombrar la categoría" : "No se pudo crear la categoría",
      })
      if (respuesta.isOk()) refrescar()
      return respuesta.isOk()
    },
    [refrescar],
  )

  const quitarCategoria = React.useCallback(
    async (id: string, nombre: string): Promise<boolean> => {
      const respuesta = await toastResponse(eliminarCategoria(id), {
        loading: "Eliminando la categoría…",
        success: `Categoría "${nombre}" eliminada`,
        error: "No se pudo eliminar la categoría",
      })
      if (respuesta.isOk()) {
        setCategoria((actual) => (actual === id ? FILTRO_TODOS : actual))
        refrescar()
      }
      return respuesta.isOk()
    },
    [refrescar],
  )

  /* ------------------------ Grupos de personalización ---------------------- */

  // Reemplaza un grupo en la lista local con el que devuelve la API y vuelve a leer el catálogo (los productos
  // incluyen sus grupos)
  const aplicarGrupo = React.useCallback(
    (grupo: GrupoMenu) => {
      setGrupos((prev) => (prev.some((g) => g.id_grupo === grupo.id_grupo) ? prev.map((g) => (g.id_grupo === grupo.id_grupo ? grupo : g)) : [...prev, grupo]))
      refrescar()
    },
    [refrescar],
  )

  const guardarGrupo = React.useCallback(
    async (values: GrupoFormValues, id?: string): Promise<boolean> => {
      const payload = {
        nombre: values.nombre.trim(),
        seleccion_minima: Number(values.seleccionMinima),
        seleccion_maxima: Number(values.seleccionMaxima),
      }
      const respuesta = await toastResponse(id ? actualizarGrupo(id, payload) : crearGrupo(payload), {
        loading: id ? "Guardando el grupo…" : "Creando el grupo…",
        success: id ? `Grupo "${payload.nombre}" actualizado` : `Grupo "${payload.nombre}" creado`,
        error: id ? "No se pudo guardar el grupo" : "No se pudo crear el grupo",
      })
      if (respuesta.isOk()) aplicarGrupo(respuesta.data)
      return respuesta.isOk()
    },
    [aplicarGrupo],
  )

  const quitarGrupo = React.useCallback(
    async (grupo: GrupoMenu): Promise<boolean> => {
      const respuesta = await toastResponse(eliminarGrupo(grupo.id_grupo), {
        loading: "Eliminando el grupo…",
        success: `Grupo "${grupo.nombre}" eliminado`,
        error: "No se pudo eliminar el grupo",
      })
      if (respuesta.isOk()) {
        setGrupos((prev) => prev.filter((g) => g.id_grupo !== grupo.id_grupo))
        refrescar()
      }
      return respuesta.isOk()
    },
    [refrescar],
  )

  const guardarOpcion = React.useCallback(
    async (idGrupo: string, values: OpcionFormValues, idOpcion?: string): Promise<boolean> => {
      const payload = { nombre: values.nombre.trim(), price_delta: deltaDesdeTexto(values.precioDelta) }
      const respuesta = await toastResponse(
        idOpcion ? actualizarOpcion(idOpcion, payload) : crearOpcion(idGrupo, payload),
        {
          loading: idOpcion ? "Guardando la opción…" : "Agregando la opción…",
          success: idOpcion ? `Opción "${payload.nombre}" actualizada` : `Opción "${payload.nombre}" agregada`,
          error: idOpcion ? "No se pudo guardar la opción" : "No se pudo agregar la opción",
        },
      )
      if (respuesta.isOk()) aplicarGrupo(respuesta.data)
      return respuesta.isOk()
    },
    [aplicarGrupo],
  )

  const alternarOpcion = React.useCallback(
    async (idOpcion: string, nombre: string, disponible: boolean): Promise<boolean> => {
      const respuesta = await toastResponse(cambiarDisponibilidadOpcion(idOpcion, disponible), {
        loading: "Actualizando la opción…",
        success: disponible ? `"${nombre}" disponible` : `"${nombre}" agotada`,
        error: "No se pudo actualizar la opción",
      })
      if (respuesta.isOk()) aplicarGrupo(respuesta.data)
      return respuesta.isOk()
    },
    [aplicarGrupo],
  )

  const quitarOpcion = React.useCallback(
    async (idOpcion: string, nombre: string): Promise<boolean> => {
      const respuesta = await toastResponse(eliminarOpcion(idOpcion), {
        loading: "Eliminando la opción…",
        success: `Opción "${nombre}" eliminada`,
        error: "No se pudo eliminar la opción",
      })
      if (respuesta.isOk()) aplicarGrupo(respuesta.data)
      return respuesta.isOk()
    },
    [aplicarGrupo],
  )

  return {
    catalogo,
    grupos,
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
    quitarProducto,
    guardarCategoria,
    quitarCategoria,
    guardarGrupo,
    quitarGrupo,
    guardarOpcion,
    alternarOpcion,
    quitarOpcion,
  }
}
