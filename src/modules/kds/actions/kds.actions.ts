import type {
  ComandaKds,
  EstadoComanda,
} from "../schema"

// TODO: reemplazar por la consulta real al backend cuando esté disponible.
// Por ahora el KDS trabaja solo en front con datos y estados en memoria.

const generarHora = (minutosAtras: number) => {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - minutosAtras)
  return ahora.toISOString()
}

const COMANDAS_INICIALES: ComandaKds[] = [
  {
    id: "kds-01",
    codigo: "COM-201",
    mesa: "Mesa 2",
    mozo: "Jomar Peralta",
    tipoPedido: "mesa",
    estado: "pendiente",
    items: [
      { id: "i01", nombre: "Americano Doble", cantidad: 2, modificadores: "Leche de avena · Caliente" },
      { id: "i02", nombre: "Croissant Artesanal", cantidad: 1 },
      { id: "i03", nombre: "Cheesecake de Maracuyá", cantidad: 1 },
    ],
    creadaEn: generarHora(3),
    tiempoTranscurrido: "3 min",
    minutosTranscurridos: 3,
  },
  {
    id: "kds-02",
    codigo: "COM-202",
    mesa: "Mesa 8",
    mozo: "Carlos Mendoza",
    tipoPedido: "mesa",
    estado: "pendiente",
    items: [
      { id: "i04", nombre: "Capuccino", cantidad: 1, modificadores: "Leche deslactosada · Extra caliente" },
      { id: "i05", nombre: "Sándwich Triple", cantidad: 2, notas: "Sin tomate en uno" },
    ],
    creadaEn: generarHora(7),
    tiempoTranscurrido: "7 min",
    minutosTranscurridos: 7,
  },
  {
    id: "kds-03",
    codigo: "COM-203",
    mesa: "Para llevar",
    mozo: "Lucía Ramos",
    tipoPedido: "llevar",
    estado: "en_preparacion",
    items: [
      { id: "i06", nombre: "Cold Brew", cantidad: 1 },
      { id: "i07", nombre: "Alfajor de Maicena", cantidad: 3 },
    ],
    creadaEn: generarHora(12),
    tiempoTranscurrido: "12 min",
    minutosTranscurridos: 12,
  },
  {
    id: "kds-04",
    codigo: "COM-204",
    mesa: "Barra 2",
    mozo: "Jomar Peralta",
    tipoPedido: "mesa",
    estado: "en_preparacion",
    items: [
      { id: "i08", nombre: "Espresso", cantidad: 1 },
      { id: "i09", nombre: "Torta de Chocolate", cantidad: 1 },
    ],
    creadaEn: generarHora(15),
    tiempoTranscurrido: "15 min",
    minutosTranscurridos: 15,
  },
  {
    id: "kds-05",
    codigo: "COM-205",
    mesa: "Mesa 4",
    mozo: "Andrea Paz",
    tipoPedido: "mesa",
    estado: "lista",
    items: [
      { id: "i10", nombre: "Latte Vainilla", cantidad: 2, modificadores: "Leche de almendras · Tibio" },
      { id: "i11", nombre: "Pan de Chocolate", cantidad: 2 },
      { id: "i12", nombre: "Butifarra", cantidad: 1, notas: "Extra salsa criolla" },
    ],
    creadaEn: generarHora(22),
    tiempoTranscurrido: "22 min",
    minutosTranscurridos: 22,
  },
  {
    id: "kds-06",
    codigo: "COM-200",
    mesa: "Mesa 11",
    mozo: "Andrea Paz",
    tipoPedido: "mesa",
    estado: "entregada",
    items: [
      { id: "i13", nombre: "Frappé de Caramelo", cantidad: 1 },
      { id: "i14", nombre: "Empanada de Carne", cantidad: 2 },
    ],
    creadaEn: generarHora(35),
    tiempoTranscurrido: "35 min",
    minutosTranscurridos: 35,
  },
]

// Estado mutable en memoria
let comandas = [...COMANDAS_INICIALES]

let correlativoComandaKds = 205

export async function getComandasKds(): Promise<ComandaKds[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return comandas.map((c) => ({ ...c, items: [...c.items] }))
}

export async function avanzarEstadoComanda(
  comandaId: string
): Promise<{ nuevoEstado: EstadoComanda }> {
  await new Promise((resolve) => setTimeout(resolve, 250))

  const comanda = comandas.find((c) => c.id === comandaId)
  if (!comanda) throw new Error("Comanda no encontrada.")

  const transiciones: Record<EstadoComanda, EstadoComanda | null> = {
    pendiente: "en_preparacion",
    en_preparacion: "lista",
    lista: "entregada",
    entregada: null,
  }

  const siguiente = transiciones[comanda.estado]
  if (!siguiente) throw new Error("La comanda ya fue entregada.")

  comanda.estado = siguiente
  return { nuevoEstado: siguiente }
}

export async function retrocederEstadoComanda(
  comandaId: string
): Promise<{ nuevoEstado: EstadoComanda }> {
  await new Promise((resolve) => setTimeout(resolve, 250))

  const comanda = comandas.find((c) => c.id === comandaId)
  if (!comanda) throw new Error("Comanda no encontrada.")

  const transiciones: Record<EstadoComanda, EstadoComanda | null> = {
    pendiente: null,
    en_preparacion: "pendiente",
    lista: "en_preparacion",
    entregada: "lista",
  }

  const anterior = transiciones[comanda.estado]
  if (!anterior) throw new Error("La comanda ya está en estado inicial.")

  comanda.estado = anterior
  return { nuevoEstado: anterior }
}
