import { actualizarEstadoMesa } from "@/modules/pos/actions/pos.actions"
import {
  calcularEfectivoContado,
  calcularResumenTurno,
  desglosarIgv,
  obtenerResultadoArqueo,
  redondear,
  type CobroCuentaPayload,
  type Comanda,
  type ComprobanteInterno,
  type CuentaMesa,
  type EventoAuditoria,
  type LineaConsumo,
  type MovimientoCaja,
  type TipoMovimiento,
  type TurnoCaja,
} from "../schema"

// TODO: reemplazar por la consulta real al backend (cash.repository / stored procedures)
// cuando esté disponible. Por ahora Transacciones trabaja solo en front con datos en memoria.

const USUARIO_ACTUAL = "Jomar Peralta"

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const haceMinutos = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

const clonar = <T,>(valor: T): T => structuredClone(valor)

let secuenciaId = 1
const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${secuenciaId++}`

const linea = (productoId: string, nombre: string, cantidad: number, precioUnitario: number): LineaConsumo => ({
  productoId,
  nombre,
  cantidad,
  precioUnitario,
})

const totalLineas = (items: LineaConsumo[]) =>
  redondear(items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0))

const evento = (accion: EventoAuditoria["accion"], usuario: string, fecha: string, detalle?: string): EventoAuditoria => ({
  id: nuevoId("evt"),
  accion,
  usuario,
  fecha,
  detalle,
})

function crearComanda(
  codigo: string,
  mesaId: string,
  mesaNombre: string,
  mozo: string,
  minutos: number,
  items: LineaConsumo[]
): Comanda {
  const emitidaEn = haceMinutos(minutos)
  return {
    codigo,
    mesaId,
    mesaNombre,
    mozo,
    emitidaEn,
    items,
    total: totalLineas(items),
    estado: "emitida",
    auditoria: [evento("emitida", mozo, emitidaEn, `Enviada a cocina/barra desde ${mesaNombre}`)],
  }
}

/* -------------------------------------------------------------------------- */
/*                               Datos en memoria                             */
/* -------------------------------------------------------------------------- */

// Áreas alineadas con el plano de mesas del POS (RF-04 / RF-12)
const AREA_POR_MESA: Record<string, string> = {
  m02: "Salón",
  m04: "Salón",
  m05: "Salón",
  m06: "Salón",
  m08: "Terraza",
  m11: "Terraza",
  b02: "Barra",
}

function crearHistorialInicial(): { comandas: Comanda[]; comprobantes: ComprobanteInterno[]; turnos: TurnoCaja[] } {
  // Comandas vigentes: coinciden con las mesas ocupadas / por cobrar del POS
  const vigentes: Comanda[] = [
    crearComanda("COM-195", "m04", "Mesa 4", "Lucía Ramos", 45, [
      linea("p13", "Butifarra", 2, 12),
      linea("p06", "Frappé de Caramelo", 1, 12),
    ]),
    crearComanda("COM-196", "m11", "Mesa 11", "Andrea Paz", 55, [
      linea("p12", "Sándwich Triple", 2, 10.5),
      linea("p08", "Limonada Frozen", 2, 8.5),
    ]),
    crearComanda("COM-197", "m02", "Mesa 2", "Jomar Peralta", 30, [linea("p05", "Chocolate Caliente", 1, 9.5)]),
    crearComanda("COM-198", "m02", "Mesa 2", "Jomar Peralta", 25, [
      linea("p03", "Capuccino", 2, 9),
      linea("p09", "Croissant Artesanal", 1, 7),
    ]),
    crearComanda("COM-199", "m04", "Mesa 4", "Lucía Ramos", 30, [
      linea("p18", "Tequeños de Queso", 1, 14),
      linea("p20", "Papas Nativas", 1, 12),
    ]),
    crearComanda("COM-200", "m11", "Mesa 11", "Andrea Paz", 35, [linea("p17", "Alfajor de Maicena", 2, 4.5)]),
    crearComanda("COM-201", "m02", "Mesa 2", "Jomar Peralta", 12, [
      linea("p10", "Pan de Chocolate", 1, 7.5),
      linea("p01", "Espresso", 1, 6),
    ]),
    crearComanda("COM-203", "m08", "Mesa 8", "Carlos Mendoza", 15, [
      linea("p04", "Latte Vainilla", 1, 10.5),
      linea("p18", "Tequeños de Queso", 1, 14),
    ]),
    crearComanda("COM-204", "b02", "Barra 2", "Jomar Peralta", 10, [linea("p01", "Espresso", 2, 6)]),
  ]

  // COM-197 fue anulada (producto agotado): queda en el historial con su auditoría
  const anulada = vigentes.find((c) => c.codigo === "COM-197")!
  anulada.estado = "anulada"
  anulada.auditoria.push(
    evento("anulada", "Lucía Ramos", haceMinutos(28), "Motivo: Chocolate caliente agotado, el cliente cambió su pedido")
  )

  // Turno anterior ya cerrado con sus cobros y comandas cobradas
  const cobradasPrevias: Comanda[] = [
    crearComanda("COM-190", "m05", "Mesa 5", "Carlos Mendoza", 26 * 60, [
      linea("p02", "Americano Doble", 2, 7),
      linea("p09", "Croissant Artesanal", 2, 7),
    ]),
    crearComanda("COM-191", "m06", "Mesa 6", "Andrea Paz", 25 * 60, [
      linea("p15", "Cheesecake de Maracuyá", 2, 11.5),
      linea("p07", "Cold Brew", 2, 11),
    ]),
    crearComanda("COM-192", "b02", "Barra 2", "Jomar Peralta", 24 * 60, [linea("p01", "Espresso", 1, 6)]),
    crearComanda("COM-193", "m08", "Mesa 8", "Lucía Ramos", 23 * 60, [
      linea("p14", "Tostadas con Palta", 1, 13),
      linea("p04", "Latte Vainilla", 1, 10.5),
    ]),
  ]

  const metodos: ComprobanteInterno["metodoPago"][] = ["efectivo", "tarjeta", "efectivo", "billetera"]
  const comprobantes: ComprobanteInterno[] = []
  const movimientosPrevios: MovimientoCaja[] = []

  cobradasPrevias.forEach((comanda, index) => {
    const codigo = `CI-${String(1001 + index).padStart(6, "0")}`
    const emitidoEn = new Date(new Date(comanda.emitidaEn).getTime() + 40 * 60_000).toISOString()
    const metodoPago = metodos[index]
    const recibido = metodoPago === "efectivo" ? Math.ceil(comanda.total / 10) * 10 : comanda.total
    comprobantes.push({
      codigo,
      turnoCodigo: "TUR-0041",
      mesaNombre: comanda.mesaNombre,
      mozo: comanda.mozo,
      cajero: "Lucía Ramos",
      emitidoEn,
      comandas: [comanda.codigo],
      items: comanda.items,
      ...desglosarIgv(comanda.total),
      metodoPago,
      montoRecibido: recibido,
      vuelto: redondear(recibido - comanda.total),
      reimpresiones: 0,
    })
    comanda.estado = "cobrada"
    comanda.comprobante = codigo
    comanda.auditoria.push(evento("cobrada", "Lucía Ramos", emitidoEn, `Comprobante ${codigo}`))
    movimientosPrevios.push({
      id: nuevoId("mov"),
      tipo: "venta",
      concepto: `Cobro ${comanda.mesaNombre}`,
      monto: comanda.total,
      metodoPago,
      registradoEn: emitidoEn,
      registradoPor: "Lucía Ramos",
      referencia: codigo,
    })
  })

  const turnoPrevio: TurnoCaja = {
    id: "tur-41",
    codigo: "TUR-0041",
    cajero: "Lucía Ramos",
    abiertoEn: haceMinutos(27 * 60),
    cerradoEn: haceMinutos(21 * 60),
    montoInicial: 150,
    estado: "cerrado",
    movimientos: [
      ...movimientosPrevios,
      {
        id: nuevoId("mov"),
        tipo: "egreso",
        concepto: "Compra de leche y hielo",
        monto: 25,
        metodoPago: "efectivo",
        registradoEn: haceMinutos(24 * 60),
        registradoPor: "Lucía Ramos",
      },
    ],
  }
  const esperado = calcularResumenTurno(turnoPrevio).efectivoEsperado
  const contado = redondear(esperado - 0.5)
  turnoPrevio.arqueo = {
    conteo: {},
    efectivoContado: contado,
    efectivoEsperado: esperado,
    diferencia: redondear(contado - esperado),
    resultado: obtenerResultadoArqueo(redondear(contado - esperado)),
    observaciones: "Faltante por redondeo de vueltos en monedas",
  }

  return {
    comandas: [...cobradasPrevias, ...vigentes],
    comprobantes,
    turnos: [turnoPrevio],
  }
}

const STORE = crearHistorialInicial()

let correlativoTurno = 42
let correlativoComprobante = 1001 + STORE.comprobantes.length

const turnoAbierto = () => STORE.turnos.find((t) => t.estado === "abierto") ?? null

/* -------------------------------------------------------------------------- */
/*                 RF-13: Apertura y Cierre de Turnos de Caja                 */
/* -------------------------------------------------------------------------- */

export async function getTurnosCaja(): Promise<TurnoCaja[]> {
  await esperar(300)
  return clonar(STORE.turnos).sort((a, b) => b.abiertoEn.localeCompare(a.abiertoEn))
}

export async function abrirTurnoCaja(montoInicial: number, notaApertura?: string): Promise<TurnoCaja> {
  await esperar(400)
  if (turnoAbierto()) throw new Error("Ya existe un turno de caja abierto.")
  if (montoInicial < 0) throw new Error("El monto inicial no puede ser negativo.")

  const turno: TurnoCaja = {
    id: nuevoId("tur"),
    codigo: `TUR-${String(correlativoTurno++).padStart(4, "0")}`,
    cajero: USUARIO_ACTUAL,
    abiertoEn: new Date().toISOString(),
    montoInicial: redondear(montoInicial),
    notaApertura: notaApertura || undefined,
    estado: "abierto",
    movimientos: [],
  }
  STORE.turnos.push(turno)
  return clonar(turno)
}

export async function registrarMovimientoCaja(
  tipo: TipoMovimiento,
  concepto: string,
  monto: number
): Promise<TurnoCaja> {
  await esperar(300)
  const turno = turnoAbierto()
  if (!turno) throw new Error("No hay un turno de caja abierto.")
  if (monto <= 0) throw new Error("El monto debe ser mayor a cero.")
  if (tipo === "egreso" && monto > calcularResumenTurno(turno).efectivoEsperado) {
    throw new Error("La salida supera el efectivo disponible en caja.")
  }

  turno.movimientos.push({
    id: nuevoId("mov"),
    tipo,
    concepto,
    monto: redondear(monto),
    metodoPago: "efectivo",
    registradoEn: new Date().toISOString(),
    registradoPor: USUARIO_ACTUAL,
  })
  return clonar(turno)
}

export async function cerrarTurnoCaja(conteo: Record<string, number>, observaciones?: string): Promise<TurnoCaja> {
  await esperar(500)
  const turno = turnoAbierto()
  if (!turno) throw new Error("No hay un turno de caja abierto.")

  const efectivoEsperado = calcularResumenTurno(turno).efectivoEsperado
  const efectivoContado = calcularEfectivoContado(conteo)
  const diferencia = redondear(efectivoContado - efectivoEsperado)

  turno.arqueo = {
    conteo,
    efectivoContado,
    efectivoEsperado,
    diferencia,
    resultado: obtenerResultadoArqueo(diferencia),
    observaciones: observaciones || undefined,
  }
  turno.estado = "cerrado"
  turno.cerradoEn = new Date().toISOString()
  return clonar(turno)
}

/* -------------------------------------------------------------------------- */
/*                 RF-14: Cobro y Cierre de Cuentas por Mesa                  */
/* -------------------------------------------------------------------------- */

// Consolida los consumos de todas las comandas vigentes de cada mesa
export async function getCuentasAbiertas(): Promise<CuentaMesa[]> {
  await esperar(300)
  const porMesa = new Map<string, Comanda[]>()
  for (const comanda of STORE.comandas) {
    if (comanda.estado !== "emitida") continue
    porMesa.set(comanda.mesaId, [...(porMesa.get(comanda.mesaId) ?? []), comanda])
  }

  const cuentas: CuentaMesa[] = []
  for (const [mesaId, comandas] of porMesa) {
    const consolidado = new Map<string, LineaConsumo>()
    for (const item of comandas.flatMap((c) => c.items)) {
      const clave = `${item.productoId}-${item.precioUnitario}`
      const previo = consolidado.get(clave)
      consolidado.set(clave, previo ? { ...previo, cantidad: previo.cantidad + item.cantidad } : { ...item })
    }
    const items = [...consolidado.values()]
    const ordenadas = [...comandas].sort((a, b) => a.emitidaEn.localeCompare(b.emitidaEn))
    cuentas.push({
      mesaId,
      mesaNombre: ordenadas[0].mesaNombre,
      area: AREA_POR_MESA[mesaId] ?? "Sin área",
      mozo: ordenadas[ordenadas.length - 1].mozo,
      abiertaEn: ordenadas[0].emitidaEn,
      comandas: ordenadas.map((c) => c.codigo),
      items,
      total: totalLineas(items),
    })
  }
  return cuentas.sort((a, b) => a.abiertaEn.localeCompare(b.abiertaEn))
}

export async function cobrarCuentaMesa(payload: CobroCuentaPayload): Promise<ComprobanteInterno> {
  await esperar(500)
  const turno = turnoAbierto()
  if (!turno) throw new Error("Abre un turno de caja antes de cobrar.")

  const cuenta = (await getCuentasAbiertas()).find((c) => c.mesaId === payload.mesaId)
  if (!cuenta || cuenta.total <= 0) throw new Error("La mesa no tiene consumos pendientes de cobro.")

  const recibido = payload.metodoPago === "efectivo" ? payload.montoRecibido ?? cuenta.total : cuenta.total
  if (recibido < cuenta.total) throw new Error("El monto recibido no cubre el total.")

  const ahora = new Date().toISOString()
  const codigo = `CI-${String(correlativoComprobante++).padStart(6, "0")}`

  const comprobante: ComprobanteInterno = {
    codigo,
    turnoCodigo: turno.codigo,
    mesaNombre: cuenta.mesaNombre,
    mozo: cuenta.mozo,
    cajero: USUARIO_ACTUAL,
    emitidoEn: ahora,
    comandas: cuenta.comandas,
    items: cuenta.items,
    ...desglosarIgv(cuenta.total),
    metodoPago: payload.metodoPago,
    montoRecibido: redondear(recibido),
    vuelto: redondear(recibido - cuenta.total),
    referenciaPago: payload.referenciaPago || undefined,
    reimpresiones: 0,
  }
  STORE.comprobantes.push(comprobante)

  // Las comandas pasan a cobradas y se registra el evento en su bitácora
  for (const comanda of STORE.comandas) {
    if (!cuenta.comandas.includes(comanda.codigo)) continue
    comanda.estado = "cobrada"
    comanda.comprobante = codigo
    comanda.auditoria.push(evento("cobrada", USUARIO_ACTUAL, ahora, `Comprobante ${codigo}`))
  }

  turno.movimientos.push({
    id: nuevoId("mov"),
    tipo: "venta",
    concepto: `Cobro ${cuenta.mesaNombre}`,
    monto: cuenta.total,
    metodoPago: payload.metodoPago,
    registradoEn: ahora,
    registradoPor: USUARIO_ACTUAL,
    referencia: codigo,
  })

  // Libera la mesa en el plano del POS tras emitir el comprobante interno
  await actualizarEstadoMesa(cuenta.mesaId, "libre")

  return clonar(comprobante)
}

/* -------------------------------------------------------------------------- */
/*                   RF-15: Historial y Auditoría de Comandas                 */
/* -------------------------------------------------------------------------- */

export async function getHistorialComandas(): Promise<Comanda[]> {
  await esperar(300)
  return clonar(STORE.comandas).sort((a, b) => b.emitidaEn.localeCompare(a.emitidaEn))
}

export async function getComprobante(codigo: string): Promise<ComprobanteInterno> {
  await esperar(150)
  const comprobante = STORE.comprobantes.find((c) => c.codigo === codigo)
  if (!comprobante) throw new Error("No se encontró el comprobante interno.")
  return clonar(comprobante)
}

export async function anularComanda(codigo: string, motivo: string): Promise<Comanda> {
  await esperar(400)
  const comanda = STORE.comandas.find((c) => c.codigo === codigo)
  if (!comanda) throw new Error("No se encontró la comanda.")
  if (comanda.estado !== "emitida") {
    throw new Error("Solo se pueden anular comandas emitidas que aún no fueron cobradas.")
  }
  comanda.estado = "anulada"
  comanda.auditoria.push(evento("anulada", USUARIO_ACTUAL, new Date().toISOString(), `Motivo: ${motivo}`))
  return clonar(comanda)
}

export async function reimprimirComprobante(codigo: string): Promise<ComprobanteInterno> {
  await esperar(250)
  const comprobante = STORE.comprobantes.find((c) => c.codigo === codigo)
  if (!comprobante) throw new Error("No se encontró el comprobante interno.")
  comprobante.reimpresiones += 1

  const ahora = new Date().toISOString()
  for (const comanda of STORE.comandas) {
    if (comanda.comprobante !== codigo) continue
    comanda.auditoria.push(
      evento("reimpresa", USUARIO_ACTUAL, ahora, `Reimpresión N° ${comprobante.reimpresiones} de ${codigo}`)
    )
  }
  return clonar(comprobante)
}
