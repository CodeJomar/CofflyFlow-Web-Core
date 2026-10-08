"use client"

import * as React from "react"
import { Controller, useForm, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { FormPanel } from "@/shared/components/composed/form-panel"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import { useConfirm } from "@/shared/providers/confirm-provider"
import { cn } from "@/shared/utils/cn"

import { getCategoriaConfig, opcionClass } from "../components"
import {
  categoriaFormSchema,
  etiquetaDelta,
  grupoFormSchema,
  opcionFormSchema,
  productoFormSchema,
  productoToFormValues,
  type CategoriaFormValues,
  type CategoriaMenu,
  type GrupoFormValues,
  type GrupoMenu,
  type OpcionFormValues,
  type ProductoFormValues,
  type ProductoMenu,
} from "../schema"

const labelClass = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
const errorClass = "text-xs font-medium text-red-600 dark:text-red-400"
const botonIcono =
  "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"

/* -------------------------------------------------------------------------- */
/*                         Alta y edición de productos                        */
/* -------------------------------------------------------------------------- */

interface ProductoFormProps {
  // Producto a editar; si no se envía, el formulario crea uno nuevo
  producto?: ProductoMenu
  categorias: CategoriaMenu[]
  grupos: GrupoMenu[]
  // Devuelve true si se guardó (entonces el panel se cierra)
  onGuardar: (values: ProductoFormValues, producto?: ProductoMenu) => Promise<boolean>
  onClose: () => void
}

/** Panel lateral de alta y edición de productos (React Hook Form + Zod). */
export default function ProductoForm({ producto, categorias, grupos, onGuardar, onClose }: ProductoFormProps) {
  const esEdicion = Boolean(producto)
  const formId = React.useId()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoFormSchema),
    defaultValues: productoToFormValues(producto, categorias[0]?.id_categoria),
  })

  const onSubmit = async (values: ProductoFormValues) => {
    if (await onGuardar(values, producto)) onClose()
  }

  return (
    <FormPanel
      open
      onOpenChange={(abierto) => {
        if (!abierto && !isSubmitting) onClose()
      }}
      title={esEdicion ? "Editar producto" : "Nuevo producto"}
      description={
        esEdicion ? "Actualiza los datos que verán los mozos en el POS." : "Agrega una bebida, postre o piqueo a la carta."
      }
      footer={
        <>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} size="md" disabled={isSubmitting}>
            {esEdicion ? "Guardar cambios" : "Agregar producto"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="menu-nombre" className={labelClass}>
            Nombre
          </label>
          <Input
            id="menu-nombre"
            {...register("nombre")}
            placeholder="Ej. Capuccino"
            maxLength={100}
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
            maxLength={500}
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
                  const Icono = getCategoriaConfig(c).icon
                  const activa = field.value === c.id_categoria
                  return (
                    <button
                      key={c.id_categoria}
                      type="button"
                      role="radio"
                      aria-checked={activa}
                      onClick={() => field.onChange(c.id_categoria)}
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

        {/* Personalización: grupos de opciones que se ofrecen al pedir el producto */}
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>
            Personalización <span className="font-normal normal-case tracking-normal">(opcional)</span>
          </span>
          {grupos.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-stone-400">
              Aún no hay grupos de personalización. Créalos desde el botón «Personalización» del menú.
            </p>
          ) : (
            <Controller
              control={control}
              name="grupos"
              render={({ field }) => (
                <div role="group" aria-label="Grupos de personalización" className="flex flex-wrap gap-2">
                  {grupos.map((g) => {
                    const activa = field.value.includes(g.id_grupo)
                    return (
                      <button
                        key={g.id_grupo}
                        type="button"
                        aria-pressed={activa}
                        onClick={() =>
                          field.onChange(activa ? field.value.filter((id) => id !== g.id_grupo) : [...field.value, g.id_grupo])
                        }
                        className={cn(
                          "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                          opcionClass(activa)
                        )}
                      >
                        {activa && <Check className="size-3.5" />}
                        {g.nombre}
                        <span className="font-normal opacity-70">{g.obligatorio ? "· obligatorio" : "· opcional"}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            />
          )}
        </div>

        {/* Disponibilidad */}
        <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-stone-800 dark:border-stone-800">
          <OpcionSwitch
            control={control}
            titulo="Disponible para la venta"
            descripcion="Si está apagado, el producto aparece como Agotado en el POS."
          />
        </div>
      </form>
    </FormPanel>
  )
}

function OpcionSwitch({
  control,
  titulo,
  descripcion,
}: {
  control: Control<ProductoFormValues>
  titulo: string
  descripcion: string
}) {
  const id = React.useId()

  return (
    <Controller
      control={control}
      name="disponible"
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
/*                   Administración de categorías del menú                    */
/* -------------------------------------------------------------------------- */

interface CategoriasFormProps {
  categorias: CategoriaMenu[]
  productos: ProductoMenu[]
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  onGuardar: (nombre: string, id?: string) => Promise<boolean>
  onEliminar: (categoria: CategoriaMenu) => Promise<boolean>
  onClose: () => void
}

/**
 * Panel lateral para crear, renombrar y eliminar categorías.
 * Una categoría con productos asociados no se puede eliminar (también lo valida la API).
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
  const confirm = useConfirm()
  const [editandoId, setEditandoId] = React.useState<string | null>(null)

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
    for (const p of productos) mapa.set(p.id_categoria, (mapa.get(p.id_categoria) ?? 0) + 1)
    return mapa
  }, [productos])

  const onCrear = async ({ nombre }: CategoriaFormValues) => {
    if (await onGuardar(nombre)) reset({ nombre: "" })
  }

  return (
    <FormPanel
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose()
      }}
      title="Categorías del menú"
      description="Organiza la carta en bebidas, postres, piqueos y más."
      footer={
        <Button type="button" variant="outline" size="md" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
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
                maxLength={50}
                autoComplete="off"
                state={errors.nombre ? "error" : "default"}
                aria-invalid={Boolean(errors.nombre)}
                className="h-10 rounded-xl"
              />
              <Button type="submit" size="sm" disabled={isSubmitting} leftIcon={<Plus className="size-4" />} className="shrink-0 px-4">
                Agregar
              </Button>
            </div>
            {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
          </form>
        )}

        {/* Listado */}
        <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-stone-800 dark:border-stone-800">
          {categorias.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500 dark:text-stone-400">Aún no hay categorías.</li>
          )}
          {categorias.map((categoria) => (
            <CategoriaFila
              key={categoria.id_categoria}
              categoria={categoria}
              totalProductos={productosPorCategoria.get(categoria.id_categoria) ?? 0}
              editando={editandoId === categoria.id_categoria}
              puedeEditar={puedeEditar}
              puedeEliminar={puedeEliminar}
              onEditar={() => setEditandoId(categoria.id_categoria)}
              onCancelarEdicion={() => setEditandoId(null)}
              onGuardar={async (nombre) => {
                if (await onGuardar(nombre, categoria.id_categoria)) setEditandoId(null)
              }}
              onEliminar={async () => {
                if (await confirm({ variant: "destructive" })) await onEliminar(categoria)
              }}
            />
          ))}
        </ul>
      </div>
    </FormPanel>
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
  const config = getCategoriaConfig(categoria)
  const Icono = config.icon
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
              maxLength={50}
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

      <div className="flex items-center gap-1">
        {puedeEditar && (
          <button type="button" onClick={onEditar} aria-label={`Renombrar ${categoria.nombre}`} className={botonIcono}>
            <Pencil className="size-4" />
          </button>
        )}
        {puedeEliminar && (
          <button
            type="button"
            onClick={() => void onEliminar()}
            disabled={enUso}
            title={enUso ? "Tiene productos asociados" : undefined}
            aria-label={`Eliminar ${categoria.nombre}`}
            className={cn(botonIcono, "hover:text-red-600 dark:hover:text-red-400")}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*              Grupos de personalización (leche, endulzante, etc.)           */
/* -------------------------------------------------------------------------- */

interface GruposFormProps {
  grupos: GrupoMenu[]
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  onGuardarGrupo: (values: GrupoFormValues, id?: string) => Promise<boolean>
  onEliminarGrupo: (grupo: GrupoMenu) => Promise<boolean>
  onGuardarOpcion: (idGrupo: string, values: OpcionFormValues, idOpcion?: string) => Promise<boolean>
  onAlternarOpcion: (idOpcion: string, nombre: string, disponible: boolean) => Promise<boolean>
  onEliminarOpcion: (idOpcion: string, nombre: string) => Promise<boolean>
  onClose: () => void
}

/**
 * Panel lateral para administrar los grupos de personalización y sus opciones. Cada opción puede sumar o restar
 * al precio del producto («+ S/ 1.50 por leche de avena»). Los grupos se asignan a cada producto desde su formulario.
 */
export function GruposForm({
  grupos,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onGuardarGrupo,
  onEliminarGrupo,
  onGuardarOpcion,
  onAlternarOpcion,
  onEliminarOpcion,
  onClose,
}: GruposFormProps) {
  const confirm = useConfirm()
  const [abiertoId, setAbiertoId] = React.useState<string | null>(null)

  return (
    <FormPanel
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose()
      }}
      title="Personalización"
      description="Grupos de opciones que el cliente elige al pedir: leche, endulzante, temperatura…"
      footer={
        <Button type="button" variant="outline" size="md" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {puedeCrear && <NuevoGrupoForm onCrear={(values) => onGuardarGrupo(values)} />}

        <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-stone-800 dark:border-stone-800">
          {grupos.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500 dark:text-stone-400">Aún no hay grupos.</li>
          )}
          {grupos.map((grupo) => (
            <GrupoFila
              key={grupo.id_grupo}
              grupo={grupo}
              abierto={abiertoId === grupo.id_grupo}
              puedeCrear={puedeCrear}
              puedeEditar={puedeEditar}
              puedeEliminar={puedeEliminar}
              onAlternar={() => setAbiertoId((actual) => (actual === grupo.id_grupo ? null : grupo.id_grupo))}
              onGuardarGrupo={(values) => onGuardarGrupo(values, grupo.id_grupo)}
              onEliminarGrupo={async () => {
                if (await confirm({ variant: "destructive" })) await onEliminarGrupo(grupo)
              }}
              onGuardarOpcion={(values, idOpcion) => onGuardarOpcion(grupo.id_grupo, values, idOpcion)}
              onAlternarOpcion={onAlternarOpcion}
              onEliminarOpcion={async (idOpcion, nombre) => {
                if (await confirm({ variant: "destructive" })) await onEliminarOpcion(idOpcion, nombre)
              }}
            />
          ))}
        </ul>
      </div>
    </FormPanel>
  )
}

const GRUPO_VACIO: GrupoFormValues = { nombre: "", seleccionMinima: "0", seleccionMaxima: "1" }

function NuevoGrupoForm({ onCrear }: { onCrear: (values: GrupoFormValues) => Promise<boolean> }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GrupoFormValues>({ resolver: zodResolver(grupoFormSchema), defaultValues: GRUPO_VACIO })

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        if (await onCrear(values)) reset(GRUPO_VACIO)
      })}
      className="flex flex-col gap-2"
      noValidate
    >
      <GrupoCampos register={register} errors={errors} idBase="grupo-nuevo" />
      <Button type="submit" size="sm" disabled={isSubmitting} leftIcon={<Plus className="size-4" />} className="self-start px-4">
        Crear grupo
      </Button>
    </form>
  )
}

/** Nombre y reglas de selección (cuántas opciones puede elegir el cliente). */
function GrupoCampos({
  register,
  errors,
  idBase,
}: {
  register: ReturnType<typeof useForm<GrupoFormValues>>["register"]
  errors: ReturnType<typeof useForm<GrupoFormValues>>["formState"]["errors"]
  idBase: string
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-nombre`} className={labelClass}>
          Nombre del grupo
        </label>
        <Input
          id={`${idBase}-nombre`}
          {...register("nombre")}
          placeholder="Ej. Tipo de leche"
          maxLength={60}
          autoComplete="off"
          state={errors.nombre ? "error" : "default"}
          className="h-10 rounded-xl"
        />
        {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-min`} className={labelClass}>
            Elegir mínimo
          </label>
          <Input
            id={`${idBase}-min`}
            {...register("seleccionMinima")}
            inputMode="numeric"
            state={errors.seleccionMinima ? "error" : "default"}
            className="h-10 rounded-xl tabular-nums"
          />
          {errors.seleccionMinima && <p className={errorClass}>{errors.seleccionMinima.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-max`} className={labelClass}>
            Elegir máximo
          </label>
          <Input
            id={`${idBase}-max`}
            {...register("seleccionMaxima")}
            inputMode="numeric"
            state={errors.seleccionMaxima ? "error" : "default"}
            className="h-10 rounded-xl tabular-nums"
          />
          {errors.seleccionMaxima && <p className={errorClass}>{errors.seleccionMaxima.message}</p>}
        </div>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-stone-400">
        Mínimo 0 = opcional; 1 o más = el cliente debe elegir al menos esa cantidad.
      </p>
    </>
  )
}

function GrupoFila({
  grupo,
  abierto,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onAlternar,
  onGuardarGrupo,
  onEliminarGrupo,
  onGuardarOpcion,
  onAlternarOpcion,
  onEliminarOpcion,
}: {
  grupo: GrupoMenu
  abierto: boolean
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  onAlternar: () => void
  onGuardarGrupo: (values: GrupoFormValues) => Promise<boolean>
  onEliminarGrupo: () => Promise<void>
  onGuardarOpcion: (values: OpcionFormValues, idOpcion?: string) => Promise<boolean>
  onAlternarOpcion: (idOpcion: string, nombre: string, disponible: boolean) => Promise<boolean>
  onEliminarOpcion: (idOpcion: string, nombre: string) => Promise<void>
}) {
  const [editando, setEditando] = React.useState(false)
  const [opcionEditando, setOpcionEditando] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GrupoFormValues>({
    resolver: zodResolver(grupoFormSchema),
    defaultValues: {
      nombre: grupo.nombre,
      seleccionMinima: String(grupo.seleccion_minima),
      seleccionMaxima: String(grupo.seleccion_maxima),
    },
  })

  return (
    <li className="flex flex-col">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", abierto && "rotate-180")} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">{grupo.nombre}</span>
            <span className="text-xs text-slate-500 dark:text-stone-400">
              {grupo.obligatorio ? "Obligatorio" : "Opcional"} · elegir {grupo.seleccion_minima}–{grupo.seleccion_maxima} ·{" "}
              {grupo.opciones.length} {grupo.opciones.length === 1 ? "opción" : "opciones"}
            </span>
          </span>
        </button>
        {puedeEditar && (
          <button
            type="button"
            onClick={() => {
              setEditando((v) => !v)
              if (!abierto) onAlternar()
            }}
            aria-label={`Editar ${grupo.nombre}`}
            className={botonIcono}
          >
            <Pencil className="size-4" />
          </button>
        )}
        {puedeEliminar && (
          <button
            type="button"
            onClick={() => void onEliminarGrupo()}
            aria-label={`Eliminar ${grupo.nombre}`}
            className={cn(botonIcono, "hover:text-red-600 dark:hover:text-red-400")}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {abierto && (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 p-3 dark:border-stone-800 dark:bg-stone-950/40">
          {editando && (
            <form
              onSubmit={handleSubmit(async (values) => {
                if (await onGuardarGrupo(values)) setEditando(false)
              })}
              className="flex flex-col gap-2"
              noValidate
            >
              <GrupoCampos register={register} errors={errors} idBase={`grupo-${grupo.id_grupo}`} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting} className="px-4">
                  Guardar grupo
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditando(false)} className="px-4">
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-stone-800">
            {grupo.opciones.length === 0 && (
              <li className="py-2 text-xs text-slate-500 dark:text-stone-400">Este grupo aún no tiene opciones.</li>
            )}
            {grupo.opciones.map((opcion) =>
              opcionEditando === opcion.id_opcion ? (
                <li key={opcion.id_opcion} className="py-2">
                  <OpcionForm
                    inicial={{ nombre: opcion.nombre, precioDelta: opcion.price_delta === "0.00" ? "" : opcion.price_delta }}
                    textoBoton="Guardar"
                    onGuardar={async (values) => {
                      if (await onGuardarOpcion(values, opcion.id_opcion)) setOpcionEditando(null)
                    }}
                    onCancelar={() => setOpcionEditando(null)}
                  />
                </li>
              ) : (
                <li key={opcion.id_opcion} className="flex items-center gap-2 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        "truncate text-sm text-slate-900 dark:text-stone-100",
                        !opcion.disponible && "text-slate-400 line-through dark:text-stone-500"
                      )}
                    >
                      {opcion.nombre}
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-500 dark:text-stone-400">
                      {etiquetaDelta(opcion.price_delta)}
                      {!opcion.disponible && " · agotada"}
                    </span>
                  </span>
                  {puedeEditar && (
                    <>
                      <Switch
                        checked={opcion.disponible}
                        onCheckedChange={(checked) => void onAlternarOpcion(opcion.id_opcion, opcion.nombre, checked)}
                        aria-label={`Disponibilidad de ${opcion.nombre}`}
                        className="dark:data-checked:bg-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setOpcionEditando(opcion.id_opcion)}
                        aria-label={`Editar ${opcion.nombre}`}
                        className={botonIcono}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </>
                  )}
                  {puedeEliminar && (
                    <button
                      type="button"
                      onClick={() => void onEliminarOpcion(opcion.id_opcion, opcion.nombre)}
                      aria-label={`Eliminar ${opcion.nombre}`}
                      className={cn(botonIcono, "hover:text-red-600 dark:hover:text-red-400")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              ),
            )}
          </ul>

          {puedeCrear && (
            <OpcionForm
              inicial={{ nombre: "", precioDelta: "" }}
              textoBoton="Agregar opción"
              limpiarAlGuardar
              onGuardar={async (values) => {
                await onGuardarOpcion(values)
              }}
            />
          )}
        </div>
      )}
    </li>
  )
}

function OpcionForm({
  inicial,
  textoBoton,
  limpiarAlGuardar = false,
  onGuardar,
  onCancelar,
}: {
  inicial: OpcionFormValues
  textoBoton: string
  limpiarAlGuardar?: boolean
  onGuardar: (values: OpcionFormValues) => Promise<void>
  onCancelar?: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OpcionFormValues>({ resolver: zodResolver(opcionFormSchema), defaultValues: inicial })

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onGuardar(values)
        if (limpiarAlGuardar) reset(inicial)
      })}
      className="flex flex-col gap-1.5"
      noValidate
    >
      <div className="flex items-start gap-2">
        <Input
          {...register("nombre")}
          placeholder="Ej. Avena"
          aria-label="Nombre de la opción"
          maxLength={60}
          autoComplete="off"
          state={errors.nombre ? "error" : "default"}
          className="h-9 min-w-0 flex-1 rounded-xl"
        />
        <Input
          {...register("precioDelta")}
          placeholder="+ S/"
          aria-label="Variación de precio"
          inputMode="decimal"
          autoComplete="off"
          state={errors.precioDelta ? "error" : "default"}
          className="h-9 w-24 shrink-0 rounded-xl tabular-nums"
        />
        <Button type="submit" size="sm" disabled={isSubmitting} className="shrink-0 px-3">
          {textoBoton}
        </Button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} aria-label="Cancelar" className={botonIcono}>
            <X className="size-4" />
          </button>
        )}
      </div>
      {(errors.nombre || errors.precioDelta) && (
        <p className={errorClass}>{errors.nombre?.message ?? errors.precioDelta?.message}</p>
      )}
    </form>
  )
}
