import { z } from "zod"

// Tipo de atención del pedido
export const tipoPedidoSchema = z.enum(["mesa", "llevar"])
export type TipoPedido = z.infer<typeof tipoPedidoSchema>

export const TIPO_PEDIDO_LABELS: Record<TipoPedido, string> = {
  mesa: "En mesa",
  llevar: "Para llevar",
}

// Métodos de pago aceptados en caja
export const metodoPagoSchema = z.enum(["efectivo", "tarjeta", "yape"])
export type MetodoPago = z.infer<typeof metodoPagoSchema>

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  yape: "Yape / Plin",
}

/* -------------------------------------------------------------------------- */
/*                 RF-04: Selección de Mesas y Áreas Físicas                  */
/* -------------------------------------------------------------------------- */

export const areaMesaSchema = z.enum(["salon", "terraza", "barra"])
export type AreaMesa = z.infer<typeof areaMesaSchema>

export const AREA_MESA_LABELS: Record<AreaMesa, string> = {
  salon: "Salón",
  terraza: "Terraza",
  barra: "Barra",
}

export const estadoMesaSchema = z.enum(["libre", "ocupada", "por_cobrar"])
export type EstadoMesa = z.infer<typeof estadoMesaSchema>

export const ESTADO_MESA_LABELS: Record<EstadoMesa, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  por_cobrar: "Por cobrar",
}

export interface MesaPos {
  id: string
  nombre: string
  area: AreaMesa
  estado: EstadoMesa
  capacidad: number
  mozo?: string
  totalActual?: number
  tiempoOcupada?: string
}

/* -------------------------------------------------------------------------- */
/*               RF-05: Modificadores y Personalización de Comandas           */
/* -------------------------------------------------------------------------- */

export interface ModificadoresProducto {
  tipoLeche?: "Entera" | "Deslactosada" | "Almendras" | "Avena" | "Sin leche"
  endulzante?: "Sin azúcar" | "Azúcar rubia" | "Azúcar blanca" | "Stevia"
  temperatura?: "Caliente" | "Tibio" | "Extra caliente" | "Frío / Con hielo"
  notas?: string
  precioExtra?: number
}

// Identificadores de categoría del catálogo ("todos" es un filtro, no una categoría real)
// Son dinámicos: el Dueño puede crearlos desde el Menú (RF-09)
export type CategoriaId = string
export type FiltroCategoria = CategoriaId | "todos"

export interface CategoriaPos {
  id: CategoriaId
  nombre: string
}

export interface ProductoPos {
  id: string
  nombre: string
  descripcion: string
  // Precio de venta con IGV incluido
  precio: number
  categoriaId: CategoriaId
  disponible: boolean
  permitePersonalizacion?: boolean
}

export interface ItemCarrito {
  uid: string
  producto: ProductoPos
  cantidad: number
  modificadores?: ModificadoresProducto
}

export interface CatalogoPos {
  categorias: CategoriaPos[]
  productos: ProductoPos[]
  mesas: MesaPos[]
}

export interface TotalesCarrito {
  unidades: number
  // Base imponible (sin IGV)
  subtotal: number
  igv: number
  total: number
}

// Tasa de IGV vigente: los precios del catálogo ya la incluyen
export const IGV_TASA = 0.18

// Límite de unidades por producto en un mismo ticket
export const MAX_CANTIDAD_ITEM = 99

/* -------------------------------------------------------------------------- */
/*               RF-06: Envío Directo de Comanda a Cocina / Barra             */
/* -------------------------------------------------------------------------- */

export interface ComandaPayload {
  mesaId?: string
  mesaNombre?: string
  tipoPedido: TipoPedido
  mozoEmisor: string
  items: ItemCarrito[]
  notasGenerales?: string
}

export interface ComandaDespachada {
  codigoComanda: string
  mesa: string
  mozoEmisor: string
  horaEnvio: string
  itemsTotal: number
}

/* -------------------------------------------------------------------------- */
/*                                   Cobro                                    */
/* -------------------------------------------------------------------------- */

// Datos capturados en el formulario de cobro
export const cobroSchema = z.object({
  tipoPedido: tipoPedidoSchema,
  mesa: z.string().trim().optional(),
  cliente: z.string().trim().max(60, "Máximo 60 caracteres").optional(),
  metodoPago: metodoPagoSchema,
  montoRecibido: z.number().nonnegative().optional(),
})
export type CobroInput = z.infer<typeof cobroSchema>

/**
 * Esquema tipado para React Hook Form con Zod resolver.
 * Valida reglas de negocio según tipo de pedido, método de pago y monto recibido.
 */
export const crearCobroFormSchema = (total: number) =>
  z
    .object({
      tipoPedido: tipoPedidoSchema,
      mesa: z.string().trim().optional(),
      cliente: z.string().trim().max(60, "Máximo 60 caracteres").optional(),
      metodoPago: metodoPagoSchema,
      montoRecibido: z.union([z.string(), z.number()]).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.tipoPedido === "mesa" && !data.mesa) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona la mesa del pedido.",
          path: ["mesa"],
        })
      }
      if (data.metodoPago === "efectivo") {
        const num =
          data.montoRecibido === "" || data.montoRecibido === undefined
            ? undefined
            : Number(data.montoRecibido)

        if (num === undefined || Number.isNaN(num)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Ingresa el monto recibido.",
            path: ["montoRecibido"],
          })
        } else if (num < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El monto no puede ser negativo.",
            path: ["montoRecibido"],
          })
        } else if (num < total) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El monto recibido no cubre el total.",
            path: ["montoRecibido"],
          })
        }
      }
    })

export type CobroFormValues = z.infer<ReturnType<typeof crearCobroFormSchema>>

export interface VentaPayload extends CobroInput {
  items: { productoId: string; cantidad: number; precio: number }[]
  total: number
}

export interface VentaRegistrada {
  codigo: string
  total: number
  vuelto: number
  metodoPago: MetodoPago
  registradaEn: string
}

/**
 * Valida las reglas de negocio del cobro que dependen del total del ticket.
 * Devuelve el mensaje de error o null si los datos son válidos.
 */
export function validarCobro(datos: CobroInput, total: number): string | null {
  const schema = crearCobroFormSchema(total)
  const parsed = schema.safeParse(datos)
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos de cobro inválidos."
  if (total <= 0) return "El ticket está vacío."
  return null
}
