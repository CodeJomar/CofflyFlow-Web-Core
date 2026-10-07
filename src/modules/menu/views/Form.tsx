"use client"

import * as React from "react"
import { Controller, useForm, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"

import type { OneQuery } from "@/dtos/core/oneQuery.dto"
import { useEntityDelete, useEntityForm } from "@/shared/hooks"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/utils/cn"

import { actualizarProducto, crearProducto, eliminarCategoria } from "../actions/menu.actions"
import { getCategoriaConfig, opcionClass } from "../components"
import {
  categoriaFormSchema,
  productoFormSchema,
  productoFormToInput,
  productoToFormValues,
  type CategoriaFormValues,
  type CategoriaMenu,
  type ProductoFormValues,
  type ProductoInput,
  type ProductoMenu,
} from "../schema"

interface ProductoFormProps {
  // Producto a editar; si no se envía, el formulario crea uno nuevo
  producto?: ProductoMenu
  categorias: CategoriaMenu[]
  onGuardado: (producto: ProductoMenu, esNuevo: boolean) => void
  onClose: () => void
}

const labelClass = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
const errorClass = "text-xs font-medium text-red-600 dark:text-red-400"
const botonPrimario =
  "h-10 rounded-full bg-[#4C0107] px-5 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
const botonSecundario = "h-10 rounded-full px-5 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"

function ErrorGuardado({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
    >
      {mensaje}
    </p>
  )
}

/**
 * Modal de alta y edición de productos del menú.
 * Usa Dialog y useEntityForm de shared, con React Hook Form + Zod para la validación.
 */
export default function ProductoForm({ producto, categorias, onGuardado, onClose }: ProductoFormProps) {
  const esEdicion = Boolean(producto)
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  const { submit, isSubmitting } = useEntityForm<
    ProductoMenu,
    ProductoFormValues,
    ProductoInput,
    ProductoInput,
    ProductoMenu
  >({
    id: producto?.id,
    actionCreate: crearProducto,
    actionUpdate: actualizarProducto,
    mapEntityToForm: (entidad) => productoToFormValues(entidad),
    mapFormToCreatePayload: productoFormToInput,
    mapFormToUpdatePayload: (values) => productoFormToInput(values),
    onCreated: (creado) => {
      onGuardado(creado, true)
      onClose()
    },
    onUpdated: (values) => {
      if (producto) onGuardado({ ...producto, ...productoFormToInput(values) }, false)
      onClose()
    },
    onSaveError: setErrorGuardado,
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoFormSchema),
    defaultValues: productoToFormValues(producto, categorias[0]?.id),
  })

  const onSubmit = async (values: ProductoFormValues) => {
    setErrorGuardado(null)
    await submit(values)
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !isSubmitting) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {esEdicion ? "Actualiza los datos que verán los mozos en el POS." : "Agrega una bebida, postre o piqueo a la carta."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex flex-col gap-5 overflow-y-auto p-5">
            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="menu-nombre" className={labelClass}>
                Nombre
              </label>
              <Input
                id="menu-nombre"
                {...register("nombre")}
                placeholder="Ej. Capuccino"
                maxLength={60}
                autoComplete="off"
                state={errors.nombre ? "error" : "default"}
                aria-invalid={Boolean(errors.nombre)}
                className="h-11 rounded-xl"
              />
              {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="menu-descripcion" className={labelClass}>
                Descripción <span className="font-normal normal-case tracking-normal">(opcional)</span>
              </label>
              <Textarea
                id="menu-descripcion"
                {...register("descripcion")}
                placeholder="Ingredientes o detalle breve"
                maxLength={120}
                rows={2}
                aria-invalid={Boolean(errors.descripcion)}
                className="rounded-xl border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500"
              />
              {errors.descripcion && <p className={errorClass}>{errors.descripcion.message}</p>}
            </div>

            {/* Precio */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="menu-precio" className={labelClass}>
                Precio de venta <span className="font-normal normal-case tracking-normal">(IGV incluido)</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-stone-400">
                  S/
                </span>
                <Input
                  id="menu-precio"
                  {...register("precio")}
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  state={errors.precio ? "error" : "default"}
                  aria-invalid={Boolean(errors.precio)}
                  className="h-11 rounded-xl pl-10 tabular-nums"
                />
              </div>
              {errors.precio && <p className={errorClass}>{errors.precio.message}</p>}
            </div>

            {/* Categoría */}
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Categoría</span>
              <Controller
                control={control}
                name="categoriaId"
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Categoría" className="flex flex-wrap gap-2">
                    {categorias.map((c) => {
                      const Icono = getCategoriaConfig(c.id).icon
                      const activa = field.value === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={activa}
                          onClick={() => field.onChange(c.id)}
                          className={cn(
                            "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                            opcionClass(activa)
                          )}
                        >
                          <Icono className="size-3.5" />
                          {c.nombre}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              {errors.categoriaId && <p className={errorClass}>{errors.categoriaId.message}</p>}
            </div>

            {/* Opciones */}
            <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-stone-800 dark:border-stone-800">
              <OpcionSwitch
                control={control}
                name="disponible"
                titulo="Disponible para la venta"
                descripcion="Si está apagado, el producto aparece como Agotado en el POS."
              />
              <OpcionSwitch
                control={control}
                name="permitePersonalizacion"
                titulo="Permite personalización"
                descripcion="Habilita leche, endulzante y temperatura en la comanda."
              />
            </div>

            <ErrorGuardado mensaje={errorGuardado} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className={botonSecundario}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting} className={botonPrimario}>
              {esEdicion ? "Guardar cambios" : "Agregar producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OpcionSwitch({
  control,
  name,
  titulo,
  descripcion,
}: {
  control: Control<ProductoFormValues>
  name: "disponible" | "permitePersonalizacion"
  titulo: string
  descripcion: string
}) {
  const id = React.useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-col gap-0.5">
            <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-stone-100">
              {titulo}
            </label>
            <span className="text-xs text-slate-500 dark:text-stone-400">{descripcion}</span>
          </div>
          <Switch
            id={id}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked)}
            className="dark:data-checked:bg-emerald-500"
          />
        </div>
      )}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                RF-09: Administración de categorías del menú                */
/* -------------------------------------------------------------------------- */

interface CategoriasFormProps {
  categorias: CategoriaMenu[]
  productos: ProductoMenu[]
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  onGuardar: (nombre: string, id?: string) => Promise<OneQuery<CategoriaMenu>>
  onEliminada: (categoria: CategoriaMenu) => void
  onClose: () => void
}

/**
 * Modal para crear, renombrar y eliminar categorías.
 * Usa Dialog y useEntityDelete de shared, con React Hook Form + Zod para la validación.
 * Una categoría con productos asociados no se puede eliminar.
 */
export function CategoriasForm({
  categorias,
  productos,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onGuardar,
  onEliminada,
  onClose,
}: CategoriasFormProps) {
  const [editandoId, setEditandoId] = React.useState<string | null>(null)
  const [errorAccion, setErrorAccion] = React.useState<string | null>(null)

  const { entityToDelete, confirmDelete } = useEntityDelete<string>({
    actionDelete: eliminarCategoria,
    onSuccess: (id) => {
      const eliminada = categorias.find((c) => c.id === id)
      if (eliminada) onEliminada(eliminada)
    },
    onError: setErrorAccion,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: { nombre: "" },
  })

  const productosPorCategoria = React.useMemo(() => {
    const mapa = new Map<string, number>()
    for (const p of productos) mapa.set(p.categoriaId, (mapa.get(p.categoriaId) ?? 0) + 1)
    return mapa
  }, [productos])

  const onCrear = async ({ nombre }: CategoriaFormValues) => {
    setErrorAccion(null)
    const respuesta = await onGuardar(nombre)
    if (respuesta.isOk()) reset({ nombre: "" })
    else setErrorAccion(respuesta.getMessage())
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorías del menú</DialogTitle>
          <DialogDescription>Organiza la carta en bebidas, postres, piqueos y más.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          {/* Nueva categoría */}
          {puedeCrear && (
            <form onSubmit={handleSubmit(onCrear)} className="flex flex-col gap-1.5" noValidate>
              <label htmlFor="menu-categoria-nueva" className={labelClass}>
                Nueva categoría
              </label>
              <div className="flex items-start gap-2">
                <Input
                  id="menu-categoria-nueva"
                  {...register("nombre")}
                  placeholder="Ej. Piqueos"
                  maxLength={30}
                  autoComplete="off"
                  state={errors.nombre ? "error" : "default"}
                  aria-invalid={Boolean(errors.nombre)}
                  className="h-10 rounded-xl"
                />
                <Button
                  type="submit"
                  size="sm"
                  loading={isSubmitting}
                  leftIcon={<Plus className="size-4" />}
                  className={cn(botonPrimario, "shrink-0 px-4")}
                >
                  Agregar
                </Button>
              </div>
              {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
            </form>
          )}

          <ErrorGuardado mensaje={errorAccion} />

          {/* Listado */}
          <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-stone-800 dark:border-stone-800">
            {categorias.length === 0 && (
              <li className="p-4 text-center text-sm text-slate-500 dark:text-stone-400">
                Aún no hay categorías.
              </li>
            )}
            {categorias.map((categoria) => (
              <CategoriaFila
                key={categoria.id}
                categoria={categoria}
                totalProductos={productosPorCategoria.get(categoria.id) ?? 0}
                editando={editandoId === categoria.id}
                eliminando={entityToDelete === categoria.id}
                puedeEditar={puedeEditar}
                puedeEliminar={puedeEliminar}
                onEditar={() => {
                  setErrorAccion(null)
                  setEditandoId(categoria.id)
                }}
                onCancelarEdicion={() => setEditandoId(null)}
                onGuardar={async (nombre) => {
                  setErrorAccion(null)
                  const respuesta = await onGuardar(nombre, categoria.id)
                  if (respuesta.isOk()) setEditandoId(null)
                  else setErrorAccion(respuesta.getMessage())
                }}
                onEliminar={async () => {
                  setErrorAccion(null)
                  await confirmDelete(categoria.id)
                }}
              />
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CategoriaFila({
  categoria,
  totalProductos,
  editando,
  eliminando,
  puedeEditar,
  puedeEliminar,
  onEditar,
  onCancelarEdicion,
  onGuardar,
  onEliminar,
}: {
  categoria: CategoriaMenu
  totalProductos: number
  editando: boolean
  eliminando: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  onEditar: () => void
  onCancelarEdicion: () => void
  onGuardar: (nombre: string) => Promise<void>
  onEliminar: () => Promise<void>
}) {
  const config = getCategoriaConfig(categoria.id)
  const Icono = config.icon
  const [confirmando, setConfirmando] = React.useState(false)
  const enUso = totalProductos > 0
  const inputId = React.useId()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: { nombre: categoria.nombre },
  })

  const botonIcono =
    "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"

  if (editando) {
    return (
      <li className="p-3">
        <form onSubmit={handleSubmit(({ nombre }) => onGuardar(nombre))} className="flex flex-col gap-1.5" noValidate>
          <label htmlFor={inputId} className="sr-only">
            Nombre de la categoría
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={inputId}
              {...register("nombre")}
              maxLength={30}
              autoComplete="off"
              autoFocus
              state={errors.nombre ? "error" : "default"}
              aria-invalid={Boolean(errors.nombre)}
              className="h-9 rounded-xl"
            />
            <button type="submit" disabled={isSubmitting} aria-label="Guardar nombre" className={botonIcono}>
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={onCancelarEdicion}
              disabled={isSubmitting}
              aria-label="Cancelar edición"
              className={botonIcono}
            >
              <X className="size-4" />
            </button>
          </div>
          {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", config.className)}>
        <Icono className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">{categoria.nombre}</span>
        <span className="text-xs text-slate-500 dark:text-stone-400">
          {totalProductos} {totalProductos === 1 ? "producto" : "productos"}
        </span>
      </div>

      {confirmando ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-red-700 dark:text-red-300">¿Eliminar?</span>
          <button
            type="button"
            disabled={eliminando}
            onClick={async () => {
              await onEliminar()
              setConfirmando(false)
            }}
            className="h-8 cursor-pointer rounded-full bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
          >
            Sí
          </button>
          <button
            type="button"
            disabled={eliminando}
            onClick={() => setConfirmando(false)}
            className="h-8 cursor-pointer rounded-full px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {puedeEditar && (
            <button type="button" onClick={onEditar} aria-label={`Renombrar ${categoria.nombre}`} className={botonIcono}>
              <Pencil className="size-4" />
            </button>
          )}
          {puedeEliminar && (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={enUso}
              title={enUso ? "Tiene productos asociados" : undefined}
              aria-label={`Eliminar ${categoria.nombre}`}
              className={cn(botonIcono, "hover:text-red-600 dark:hover:text-red-400")}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </li>
  )
}
