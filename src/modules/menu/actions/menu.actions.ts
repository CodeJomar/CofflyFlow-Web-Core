import { getCatalogoPos, notificarCambioCatalogo } from "@/modules/pos/actions/pos.actions"
import { slugCategoria, type CatalogoMenu, type CategoriaMenu, type ProductoInput, type ProductoMenu } from "../schema"

// TODO: reemplazar por las llamadas reales al backend cuando estén disponibles.
// Mientras tanto, el menú opera sobre el mismo catálogo en memoria que consume el POS
// y avisa a los terminales POS abiertos en cada cambio (RF-09 / RF-10).

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const copiar = (producto: ProductoMenu): ProductoMenu => ({ ...producto })

const mismoNombre = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

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

export async function getCatalogoMenu(): Promise<CatalogoMenu> {
  const catalogo = await getCatalogoPos()
  return {
    categorias: catalogo.categorias.map((c) => ({ ...c })),
    productos: catalogo.productos.map(copiar),
  }
}

/* -------------------------------------------------------------------------- */
/*              RF-10: Control Rápido de Disponibilidad / Stock               */
/* -------------------------------------------------------------------------- */

/**
 * Marca un producto como disponible o "Agotado" con un solo toque.
 * Al quedar agotado, los terminales POS deshabilitan su selección al instante.
 */
export async function cambiarDisponibilidadProducto(id: string, disponible: boolean): Promise<ProductoMenu> {
  await esperar(150)
  const { catalogo, index } = await obtenerProducto(id)
  const actualizado = { ...catalogo.productos[index], disponible }
  catalogo.productos[index] = actualizado
  notificarCambioCatalogo()
  return copiar(actualizado)
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
}

export async function crearProducto(input: ProductoInput): Promise<ProductoMenu> {
  await esperar(300)
  await validarProducto(input)
  const catalogo = await getCatalogoPos()

  const nuevo: ProductoMenu = { id: `p${Date.now().toString(36)}`, ...input }
  catalogo.productos.push(nuevo)
  notificarCambioCatalogo()
  return copiar(nuevo)
}

export async function actualizarProducto(id: string, input: ProductoInput): Promise<ProductoMenu> {
  await esperar(300)
  await validarProducto(input, id)
  const { catalogo, index } = await obtenerProducto(id)

  const actualizado = { ...catalogo.productos[index], ...input }
  catalogo.productos[index] = actualizado
  notificarCambioCatalogo()
  return copiar(actualizado)
}

/* -------------------------------------------------------------------------- */
/*                 RF-09: Administración de categorías                        */
/* -------------------------------------------------------------------------- */

export async function crearCategoria(nombre: string): Promise<CategoriaMenu> {
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
  return { ...nueva }
}

export async function actualizarCategoria(id: string, nombre: string): Promise<CategoriaMenu> {
  await esperar(250)
  const { catalogo, index } = await obtenerCategoria(id)
  const limpio = nombre.trim()

  if (catalogo.categorias.some((c) => c.id !== id && mismoNombre(c.nombre, limpio))) {
    throw new Error("Ya existe otra categoría con ese nombre.")
  }

  const actualizada = { ...catalogo.categorias[index], nombre: limpio }
  catalogo.categorias[index] = actualizada
  notificarCambioCatalogo()
  return { ...actualizada }
}

export async function eliminarCategoria(id: string): Promise<void> {
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
}
