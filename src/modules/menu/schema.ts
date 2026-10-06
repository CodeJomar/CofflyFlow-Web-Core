import { z } from "zod"
import type { CategoriaId, CategoriaPos, FiltroCategoria, ProductoPos } from "@/modules/pos/schema"

// El catálogo del menú es la misma fuente que consumen los terminales POS
export type ProductoMenu = ProductoPos
export type CategoriaMenu = CategoriaPos
export type { CategoriaId, FiltroCategoria }

export interface CatalogoMenu {
  categorias: CategoriaMenu[]
  productos: ProductoMenu[]
}

/* -------------------------------------------------------------------------- */
/*              RF-10: Control Rápido de Disponibilidad / Stock               */
/* -------------------------------------------------------------------------- */

export const filtroDisponibilidadSchema = z.enum(["todos", "disponibles", "agotados"])
export type FiltroDisponibilidad = z.infer<typeof filtroDisponibilidadSchema>

export const FILTRO_DISPONIBILIDAD_LABELS: Record<FiltroDisponibilidad, string> = {
  todos: "Todos",
  disponibles: "Disponibles",
  agotados: "Agotados",
}

export interface ResumenMenu {
  total: number
  disponibles: number
  agotados: number
}

/* -------------------------------------------------------------------------- */
/*                       Formulario de alta / edición                         */
/* -------------------------------------------------------------------------- */

export const PRECIO_MAXIMO = 999

export const productoFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(60, "El nombre no puede superar los 60 caracteres."),
  descripcion: z.string().trim().max(120, "La descripción no puede superar los 120 caracteres."),
  // Se maneja como texto en el input y se convierte a número al guardar
  precio: z
    .string()
    .trim()
    .min(1, "Ingresa el precio de venta.")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Usa un monto válido con hasta 2 decimales.")
    .refine((v) => Number(v) > 0, "El precio debe ser mayor a 0.")
    .refine((v) => Number(v) <= PRECIO_MAXIMO, `El precio no puede superar S/ ${PRECIO_MAXIMO}.`),
  categoriaId: z.string().min(1, "Selecciona una categoría."),
  permitePersonalizacion: z.boolean(),
  disponible: z.boolean(),
})

export type ProductoFormValues = z.infer<typeof productoFormSchema>

export interface ProductoInput {
  nombre: string
  descripcion: string
  precio: number
  categoriaId: CategoriaId
  permitePersonalizacion: boolean
  disponible: boolean
}

export const productoFormToInput = (values: ProductoFormValues): ProductoInput => ({
  nombre: values.nombre.trim(),
  descripcion: values.descripcion.trim(),
  precio: Math.round(Number(values.precio) * 100) / 100,
  categoriaId: values.categoriaId,
  permitePersonalizacion: values.permitePersonalizacion,
  disponible: values.disponible,
})

export const productoToFormValues = (producto?: ProductoMenu, categoriaPorDefecto = ""): ProductoFormValues => ({
  nombre: producto?.nombre ?? "",
  descripcion: producto?.descripcion ?? "",
  precio: producto ? String(producto.precio) : "",
  categoriaId: producto?.categoriaId ?? categoriaPorDefecto,
  permitePersonalizacion: producto?.permitePersonalizacion ?? false,
  disponible: producto?.disponible ?? true,
})

/* -------------------------------------------------------------------------- */
/*                 RF-09: Administración de categorías del menú               */
/* -------------------------------------------------------------------------- */

export const categoriaFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(30, "El nombre no puede superar los 30 caracteres."),
})

export type CategoriaFormValues = z.infer<typeof categoriaFormSchema>

// Genera un identificador legible a partir del nombre ("Bebidas Frías" → "bebidas-frias")
export const slugCategoria = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
