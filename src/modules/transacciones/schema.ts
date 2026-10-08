import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*                                  Generales                                 */
/* -------------------------------------------------------------------------- */

// Tasa de IGV vigente: los precios del catálogo ya la incluyen
export const IGV_TASA = 0.18

// Métodos de pago aceptados al cerrar una cuenta (RF-14)
export const metodoPagoSchema = z.enum(["efectivo", "tarjeta", "billetera"])
export type MetodoPago = z.infer<typeof metodoPagoSchema>

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  billetera: "Billetera digital",
}

export interface LineaConsumo {
  productoId: string
  nombre: string
  cantidad: number
  precioUnitario: number
}

/* -------------------------------------------------------------------------- */
/*                 RF-13: Apertura y Cierre de Turnos de Caja                 */
/* -------------------------------------------------------------------------- */

export const tipoMovimientoSchema = z.enum(["ingreso", "egreso"])
export type TipoMovimiento = z.infer<typeof tipoMovimientoSchema>

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimiento | "venta", string> = {
  ingreso: "Entrada de dinero",
  egreso: "Salida de dinero",
  venta: "Cobro de cuenta",
}

export interface MovimientoCaja {
  id: string
  tipo: TipoMovimiento | "venta"
  concepto: string
  monto: number
  metodoPago: MetodoPago
  registradoEn: string
  registradoPor: string
  // Código del comprobante interno cuando el movimiento proviene de un cobro
  referencia?: string
}

export type EstadoTurno = "abierto" | "cerrado"

export type ResultadoArqueo = "cuadrado" | "sobrante" | "faltante"

export const RESULTADO_ARQUEO_LABELS: Record<ResultadoArqueo, string> = {
  cuadrado: "Cuadrado",
  sobrante: "Sobrante",
  faltante: "Faltante",
}

export interface ArqueoCaja {
  // Cantidad contada por denominación (clave = valor de la denominación)
  conteo: Record<string, number>
  efectivoContado: number
  efectivoEsperado: number
  diferencia: number
  resultado: ResultadoArqueo
  observaciones?: string
}

export interface TurnoCaja {
  id: string
  codigo: string
  cajero: string
  abiertoEn: string
  cerradoEn?: string
  montoInicial: number
  notaApertura?: string
  estado: EstadoTurno
  movimientos: MovimientoCaja[]
  arqueo?: ArqueoCaja
}

export interface ResumenTurno {
  ventasEfectivo: number
  ventasTarjeta: number
  ventasBilletera: number
  ventasTotales: number
  ingresos: number
  egresos: number
  cuentasCobradas: number
  // Fondo inicial + ventas en efectivo + entradas - salidas
  efectivoEsperado: number
}

// Denominaciones en soles para el arqueo físico de caja.
// La clave no usa puntos para que React Hook Form no la interprete como ruta anidada.
export const DENOMINACIONES = [
  { clave: "b200", valor: 200, tipo: "billete" },
  { clave: "b100", valor: 100, tipo: "billete" },
  { clave: "b50", valor: 50, tipo: "billete" },
  { clave: "b20", valor: 20, tipo: "billete" },
  { clave: "b10", valor: 10, tipo: "billete" },
  { clave: "m5", valor: 5, tipo: "moneda" },
  { clave: "m2", valor: 2, tipo: "moneda" },
  { clave: "m1", valor: 1, tipo: "moneda" },
  { clave: "m050", valor: 0.5, tipo: "moneda" },
  { clave: "m020", valor: 0.2, tipo: "moneda" },
  { clave: "m010", valor: 0.1, tipo: "moneda" },
] as const

export type ClaveDenominacion = (typeof DENOMINACIONES)[number]["clave"]

// Límite razonable para el fondo de apertura de una cafetería
export const MAX_MONTO_CAJA = 10000

const montoTexto = z.union([z.string(), z.number()])

const aNumero = (valor: string | number | undefined) =>
  valor === "" || valor === undefined ? Number.NaN : Number(valor)

export const aperturaCajaSchema = z
  .object({
    montoInicial: montoTexto,
    notaApertura: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
  })
  .superRefine((data, ctx) => {
    const monto = aNumero(data.montoInicial)
    if (Number.isNaN(monto)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresa el monto inicial en efectivo.", path: ["montoInicial"] })
    } else if (monto < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El monto no puede ser negativo.", path: ["montoInicial"] })
    } else if (monto > MAX_MONTO_CAJA) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El fondo inicial no puede superar S/ ${MAX_MONTO_CAJA.toLocaleString("es-PE")}.`,
        path: ["montoInicial"],
      })
    }
  })
export type AperturaCajaValues = z.infer<typeof aperturaCajaSchema>

/**
 * Esquema de entradas/salidas de dinero. Las salidas no pueden superar
 * el efectivo disponible en caja en ese momento.
 */
export const crearMovimientoSchema = (efectivoDisponible: number) =>
  z
    .object({
      tipo: tipoMovimientoSchema,
      concepto: z
        .string()
        .trim()
        .min(3, "Describe el motivo (mínimo 3 caracteres).")
        .max(80, "Máximo 80 caracteres"),
      monto: montoTexto,
    })
    .superRefine((data, ctx) => {
      const monto = aNumero(data.monto)
      if (Number.isNaN(monto) || monto <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresa un monto mayor a cero.", path: ["monto"] })
      } else if (monto > MAX_MONTO_CAJA) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El monto excede el límite permitido.", path: ["monto"] })
      } else if (data.tipo === "egreso" && monto > efectivoDisponible) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La salida supera el efectivo disponible en caja.",
          path: ["monto"],
        })
      }
    })
export type MovimientoValues = z.infer<ReturnType<typeof crearMovimientoSchema>>

/**
 * Esquema del arqueo de cierre. Si existe diferencia, se exige justificarla.
 */
export const crearCierreCajaSchema = (efectivoEsperado: number) =>
  z
    .object({
      conteo: z.record(z.string(), montoTexto),
      observaciones: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
    })
    .superRefine((data, ctx) => {
      for (const d of DENOMINACIONES) {
        const valor = data.conteo[d.clave]
        if (valor === "" || valor === undefined) continue
        const cantidad = Number(valor)
        if (!Number.isInteger(cantidad) || cantidad < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Usa cantidades enteras no negativas en el conteo.",
            path: ["conteo"],
          })
          return
        }
      }
      const contado = calcularEfectivoContado(data.conteo)
      const diferencia = redondear(contado - efectivoEsperado)
      if (diferencia !== 0 && (data.observaciones?.length ?? 0) < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Justifica la diferencia del arqueo (mínimo 5 caracteres).",
          path: ["observaciones"],
        })
      }
    })
export type CierreCajaValues = z.infer<ReturnType<typeof crearCierreCajaSchema>>

/* -------------------------------------------------------------------------- */
/*                 RF-14: Cobro y Cierre de Cuentas por Mesa                  */
/* -------------------------------------------------------------------------- */

export interface CuentaMesa {
  mesaId: string
  mesaNombre: string
  area: string
  mozo: string
  abiertaEn: string
  // Comandas vigentes (no anuladas ni cobradas) que componen la cuenta
  comandas: string[]
  // Consumos consolidados de todas las comandas de la mesa
  items: LineaConsumo[]
  total: number
}

export const crearCobroCuentaSchema = (total: number) =>
  z
    .object({
      metodoPago: metodoPagoSchema,
      montoRecibido: montoTexto.optional(),
      referenciaPago: z.string().trim().max(30, "Máximo 30 caracteres").optional(),
    })
    .superRefine((data, ctx) => {
      if (data.metodoPago === "efectivo") {
        const monto = aNumero(data.montoRecibido)
        if (Number.isNaN(monto)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresa el monto recibido.", path: ["montoRecibido"] })
        } else if (monto < total) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El monto recibido no cubre el total.",
            path: ["montoRecibido"],
          })
        }
      }
    })
export type CobroCuentaValues = z.infer<ReturnType<typeof crearCobroCuentaSchema>>

export interface CobroCuentaPayload {
  mesaId: string
  metodoPago: MetodoPago
  montoRecibido?: number
  referenciaPago?: string
}

export interface ComprobanteInterno {
  codigo: string
  turnoCodigo: string
  mesaNombre: string
  mozo: string
  cajero: string
  emitidoEn: string
  comandas: string[]
  items: LineaConsumo[]
  subtotal: number
  igv: number
  total: number
  metodoPago: MetodoPago
  montoRecibido: number
  vuelto: number
  referenciaPago?: string
  reimpresiones: number
}

/* -------------------------------------------------------------------------- */
/*                   RF-15: Historial y Auditoría de Comandas                 */
/* -------------------------------------------------------------------------- */

export const estadoComandaSchema = z.enum(["emitida", "cobrada", "anulada"])
export type EstadoComanda = z.infer<typeof estadoComandaSchema>

export const ESTADO_COMANDA_LABELS: Record<EstadoComanda, string> = {
  emitida: "Emitida",
  cobrada: "Cobrada",
  anulada: "Anulada",
}

export type AccionAuditoria = "emitida" | "cobrada" | "anulada" | "reimpresa"

export const ACCION_AUDITORIA_LABELS: Record<AccionAuditoria, string> = {
  emitida: "Comanda emitida",
  cobrada: "Cuenta cobrada",
  anulada: "Comanda anulada",
  reimpresa: "Comprobante reimpreso",
}

export interface EventoAuditoria {
  id: string
  accion: AccionAuditoria
  usuario: string
  fecha: string
  detalle?: string
}

export interface Comanda {
  codigo: string
  mesaId: string
  mesaNombre: string
  mozo: string
  emitidaEn: string
  items: LineaConsumo[]
  total: number
  estado: EstadoComanda
  comprobante?: string
  // Bitácora inmutable: solo se agregan eventos, nunca se editan ni eliminan
  auditoria: EventoAuditoria[]
}

export type FiltroEstadoComanda = EstadoComanda | "todas"

export const anulacionSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(5, "Indica el motivo de la anulación (mínimo 5 caracteres).")
    .max(120, "Máximo 120 caracteres"),
})
export type AnulacionValues = z.infer<typeof anulacionSchema>

/* -------------------------------------------------------------------------- */
/*                                 Utilidades                                 */
/* -------------------------------------------------------------------------- */

export const redondear = (valor: number) => Math.round(valor * 100) / 100

export function calcularEfectivoContado(conteo: Record<string, number | string>): number {
  return redondear(
    DENOMINACIONES.reduce((acc, d) => acc + d.valor * (Number(conteo[d.clave]) || 0), 0)
  )
}

export function obtenerResultadoArqueo(diferencia: number): ResultadoArqueo {
  if (diferencia === 0) return "cuadrado"
  return diferencia > 0 ? "sobrante" : "faltante"
}

export function desglosarIgv(total: number) {
  const subtotal = redondear(total / (1 + IGV_TASA))
  return { subtotal, igv: redondear(total - subtotal), total: redondear(total) }
}

export function calcularResumenTurno(turno: TurnoCaja): ResumenTurno {
  const suma = (filtro: (m: MovimientoCaja) => boolean) =>
    redondear(turno.movimientos.filter(filtro).reduce((acc, m) => acc + m.monto, 0))

  const ventasEfectivo = suma((m) => m.tipo === "venta" && m.metodoPago === "efectivo")
  const ventasTarjeta = suma((m) => m.tipo === "venta" && m.metodoPago === "tarjeta")
  const ventasBilletera = suma((m) => m.tipo === "venta" && m.metodoPago === "billetera")
  const ingresos = suma((m) => m.tipo === "ingreso")
  const egresos = suma((m) => m.tipo === "egreso")

  return {
    ventasEfectivo,
    ventasTarjeta,
    ventasBilletera,
    ventasTotales: redondear(ventasEfectivo + ventasTarjeta + ventasBilletera),
    ingresos,
    egresos,
    cuentasCobradas: turno.movimientos.filter((m) => m.tipo === "venta").length,
    efectivoEsperado: redondear(turno.montoInicial + ventasEfectivo + ingresos - egresos),
  }
}
