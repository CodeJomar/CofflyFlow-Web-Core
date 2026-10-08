import { CheckStatus } from "@/dtos/core/checkStatus.dto"
import { OneQuery } from "@/dtos/core/oneQuery.dto"
import { getCatalogoPos, notificarCambioCatalogo } from "@/modules/pos/actions/pos.actions"
import { slugCategoria, type CatalogoMenu, type CategoriaMenu, type ProductoInput, type ProductoMenu } from "../schema"

// TODO: reemplazar por las llamadas reales al backend cuando estén disponibles.
// Mientras tanto, el menú opera sobre el mismo catálogo en memoria que consume el POS
// y avisa a los terminales POS abiertos en cada cambio (RF-09 / RF-10).
// Las respuestas usan los DTOs de dtos/core para integrarse con los hooks de shared.

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const copiar = (producto: ProductoMenu): ProductoMenu => ({ ...producto })

const mismoNombre = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const mensajeDe = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto)

async function obtenerProducto(id: string) {
  const catalogo = await getCatalogoPos()
  const index = catalogo.productos.findIndex((p) => p.id === id)
  if (index === -1) throw new Error("El producto no existe o fue eliminado.")
  return { catalogo, index }
}

async function obtenerCategoria(id: string) {
  const catalogo = await getCatalogoPos()
  const index = catalogo.categorias.findIndex((c) => c.id === id)
  if (index === -1) throw new Error("La categoría no existe o fue eliminada.")
  return { catalogo, index }
}

export async function getCatalogoMenu(): Promise<OneQuery<CatalogoMenu>> {
  try {
    const catalogo = await getCatalogoPos()
    return OneQuery.ok({
      categorias: catalogo.categorias.map((c) => ({ ...c })),
      productos: catalogo.productos.map(copiar),
    })
  } catch (e) {
    return OneQuery.error(mensajeDe(e, "No se pudo cargar el catálogo del menú."))
  }
}

/* -------------------------------------------------------------------------- */
/*              RF-10: Control Rápido de Disponibilidad / Stock               */
/* -------------------------------------------------------------------------- */

/**
 * Marca un producto como disponible o "Agotado" con un solo toque.
 * Al quedar agotado, los terminales POS deshabilitan su selección al instante.
 */
export async function cambiarDisponibilidadProducto(id: string, disponible: boolean): Promise<OneQuery<ProductoMenu>> {
  try {
    await esperar(150)
    const { catalogo, index } = await obtenerProducto(id)
    const actualizado = { ...catalogo.productos[index], disponible }
    catalogo.productos[index] = actualizado
    notificarCambioCatalogo()
    return OneQuery.ok(copiar(actualizado))
  } catch (e) {
    return OneQuery.error(mensajeDe(e, "No se pudo actualizar la disponibilidad."))
  }
}

/* -------------------------------------------------------------------------- */
/*                 RF-09: Administración de productos                         */
/* -------------------------------------------------------------------------- */

async function validarProducto(input: ProductoInput, id?: string) {
  const catalogo = await getCatalogoPos()
  if (!catalogo.categorias.some((c) => c.id === input.categoriaId)) {
    throw new Error("La categoría seleccionada ya no existe.")
  }
  if (catalogo.productos.some((p) => p.id !== id && mismoNombre(p.nombre, input.nombre))) {
    throw new Error("Ya existe un producto con ese nombre.")
  }
  return catalogo
}

export async function crearProducto(input: ProductoInput): Promise<OneQuery<ProductoMenu>> {
  try {
    await esperar(300)
    const catalogo = await validarProducto(input)
    const nuevo: ProductoMenu = { id: `p${Date.now().toString(36)}`, ...input }
    catalogo.productos.push(nuevo)
    notificarCambioCatalogo()
    return OneQuery.ok(copiar(nuevo))
  } catch (e) {
    return OneQuery.error(mensajeDe(e, "No se pudo crear el producto."))
  }
}

export async function actualizarProducto(id: string, input: ProductoInput): Promise<CheckStatus> {
  try {
    await esperar(300)
    await validarProducto(input, id)
    const { catalogo, index } = await obtenerProducto(id)
    catalogo.productos[index] = { ...catalogo.productos[index], ...input }
    notificarCambioCatalogo()
    return CheckStatus.ok()
  } catch (e) {
    return CheckStatus.error(mensajeDe(e, "No se pudo actualizar el producto."))
  }
}

/* -------------------------------------------------------------------------- */
/*                 RF-09: Administración de categorías                        */
/* -------------------------------------------------------------------------- */

export async function crearCategoria(nombre: string): Promise<OneQuery<CategoriaMenu>> {
  try {
    await esperar(250)
    const catalogo = await getCatalogoPos()
    const limpio = nombre.trim()

    if (catalogo.categorias.some((c) => mismoNombre(c.nombre, limpio))) {
      throw new Error("Ya existe una categoría con ese nombre.")
    }

    // Evita colisiones de identificador (p. ej. dos nombres que generan el mismo slug)
    const base = slugCategoria(limpio) || "categoria"
    let id = base
    for (let i = 2; catalogo.categorias.some((c) => c.id === id); i++) id = `${base}-${i}`

    const nueva: CategoriaMenu = { id, nombre: limpio }
    catalogo.categorias.push(nueva)
    notificarCambioCatalogo()
    return OneQuery.ok({ ...nueva })
  } catch (e) {
    return OneQuery.error(mensajeDe(e, "No se pudo crear la categoría."))
  }
}

export async function actualizarCategoria(id: string, nombre: string): Promise<OneQuery<CategoriaMenu>> {
  try {
    await esperar(250)
    const { catalogo, index } = await obtenerCategoria(id)
    const limpio = nombre.trim()

    if (catalogo.categorias.some((c) => c.id !== id && mismoNombre(c.nombre, limpio))) {
      throw new Error("Ya existe otra categoría con ese nombre.")
    }

    const actualizada = { ...catalogo.categorias[index], nombre: limpio }
    catalogo.categorias[index] = actualizada
    notificarCambioCatalogo()
    return OneQuery.ok({ ...actualizada })
  } catch (e) {
    return OneQuery.error(mensajeDe(e, "No se pudo renombrar la categoría."))
  }
}

export async function eliminarCategoria(id: string): Promise<CheckStatus> {
  try {
    await esperar(250)
    const { catalogo, index } = await obtenerCategoria(id)

    const enUso = catalogo.productos.filter((p) => p.categoriaId === id).length
    if (enUso > 0) {
      throw new Error(
        `No se puede eliminar: tiene ${enUso} ${enUso === 1 ? "producto asociado" : "productos asociados"}. Muévelos a otra categoría primero.`
      )
    }

    catalogo.categorias.splice(index, 1)
    notificarCambioCatalogo()
    return CheckStatus.ok()
  } catch (e) {
    return CheckStatus.error(mensajeDe(e, "No se pudo eliminar la categoría."))
  }
}
