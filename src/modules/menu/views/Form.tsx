"use client"

import * as React from "react"
import { Controller, useForm, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/utils/cn"

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
  onGuardar: (input: ProductoInput, id?: string) => Promise<unknown>
  onClose: () => void
}

const labelClass = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
const errorClass = "text-xs font-medium text-red-600 dark:text-red-400"

/**
 * Modal de alta y edición de productos del menú (React Hook Form + Zod).
 */
export default function ProductoForm({ producto, categorias, onGuardar, onClose }: ProductoFormProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()
  const esEdicion = Boolean(producto)
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoFormSchema),
    defaultValues: productoToFormValues(producto, categorias[0]?.id),
  })

  const cerrar = React.useCallback(() => {
    if (!isSubmitting) onClose()
  }, [isSubmitting, onClose])

  // Foco inicial dentro del modal (solo al abrir)
  React.useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  // Cierre con Escape
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [cerrar])

  const onSubmit = async (values: ProductoFormValues) => {
    setErrorGuardado(null)
    try {
      await onGuardar(productoFormToInput(values), producto?.id)
      onClose()
    } catch (e) {
      setErrorGuardado(e instanceof Error ? e.message : "No se pudo guardar el producto.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={cerrar}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <h2 id={tituloId} className="text-lg font-bold text-slate-900 dark:text-stone-100">
              {esEdicion ? "Editar producto" : "Nuevo producto"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-stone-400">
              {esEdicion ? "Actualiza los datos que verán los mozos en el POS." : "Agrega una bebida, postre o piqueo a la carta."}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="size-4" />
          </button>
        </div>

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

            {errorGuardado && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
              >
                {errorGuardado}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cerrar}
              disabled={isSubmitting}
              className="h-10 rounded-full px-5 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              className="h-10 rounded-full bg-[#4C0107] px-5 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              {esEdicion ? "Guardar cambios" : "Agregar producto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
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
  onGuardar: (nombre: string, id?: string) => Promise<unknown>
  onEliminar: (categoria: CategoriaMenu) => Promise<void>
  onClose: () => void
}

/**
 * Modal para crear, renombrar y eliminar categorías (React Hook Form + Zod).
 * Una categoría con productos asociados no se puede eliminar.
 */
export function CategoriasForm({
  categorias,
  productos,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onGuardar,
  onEliminar,
  onClose,
}: CategoriasFormProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()
  const [editandoId, setEditandoId] = React.useState<string | null>(null)
  const [errorAccion, setErrorAccion] = React.useState<string | null>(null)

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

  // Foco inicial dentro del modal (solo al abrir)
  React.useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  // Cierre con Escape
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const onCrear = async ({ nombre }: CategoriaFormValues) => {
    setErrorAccion(null)
    try {
      await onGuardar(nombre)
      reset({ nombre: "" })
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : "No se pudo crear la categoría.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <h2 id={tituloId} className="text-lg font-bold text-slate-900 dark:text-stone-100">
              Categorías del menú
            </h2>
            <p className="text-xs text-slate-500 dark:text-stone-400">
              Organiza la carta en bebidas, postres, piqueos y más.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="size-4" />
          </button>
        </div>

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
                  className="h-10 shrink-0 rounded-full bg-[#4C0107] px-4 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                >
                  Agregar
                </Button>
              </div>
              {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
            </form>
          )}

          {errorAccion && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              {errorAccion}
            </p>
          )}

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
                puedeEditar={puedeEditar}
                puedeEliminar={puedeEliminar}
                onEditar={() => {
                  setErrorAccion(null)
                  setEditandoId(categoria.id)
                }}
                onCancelarEdicion={() => setEditandoId(null)}
                onGuardar={async (nombre) => {
                  setErrorAccion(null)
                  try {
                    await onGuardar(nombre, categoria.id)
                    setEditandoId(null)
                  } catch (e) {
                    setErrorAccion(e instanceof Error ? e.message : "No se pudo renombrar la categoría.")
                  }
                }}
                onEliminar={async () => {
                  setErrorAccion(null)
                  try {
                    await onEliminar(categoria)
                  } catch (e) {
                    setErrorAccion(e instanceof Error ? e.message : "No se pudo eliminar la categoría.")
                  }
                }}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function CategoriaFila({
  categoria,
  totalProductos,
  editando,
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
  const [eliminando, setEliminando] = React.useState(false)
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
              setEliminando(true)
              await onEliminar()
              setEliminando(false)
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
