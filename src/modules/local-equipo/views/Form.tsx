"use client"

import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Lock, Trash2 } from "lucide-react"

import { usePaginacionAjustada } from "@/shared/hooks"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { FormPanel } from "@/shared/components/composed/form-panel"
import { Input } from "@/shared/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select"
import { BarraPaginacion, GrillaAjustada } from "@/shared/components/ui/pagination"
import { useConfirm } from "@/shared/providers/confirm-provider"
import { cn } from "@/shared/utils/cn"

import {
  botonPrimario as botonPrimarioBase,
  botonSecundario as botonSecundarioBase,
  getAreaConfig,
  getModuloConfig,
  opcionClass,
  panelClass,
  selectClass,
  tarjetaClass,
} from "../components"
import {
  CAPACIDAD_MAXIMA_MESA,
  clavePermiso,
  empleadoFormSchema,
  empleadoToFormValues,
  mesaFormSchema,
  mesaToFormValues,
  rolFormSchema,
  rolToFormValues,
  todasLasClaves,
  type Cargo,
  type Empleado,
  type EmpleadoFormValues,
  type Mesa,
  type MesaFormValues,
  type ModuloCatalogo,
  type RolDetalle,
  type RolFormValues,
} from "../schema"

const labelClass = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
const etiquetaCampoClass = "text-sm font-semibold text-slate-800 dark:text-stone-200 [@media(max-height:700px)]:sr-only"
// En pantallas de poca altura se ocultan textos secundarios para que el contenido quepa sin scroll
const ocultarEnPantallaBaja = "[@media(max-height:700px)]:hidden"
const errorClass = "text-xs font-medium text-red-600 dark:text-red-400"
const inputClass = "h-11 rounded-xl"
const botonPrimario = cn(botonPrimarioBase, "px-5")
const botonSecundario = cn(botonSecundarioBase, "px-5")

/* -------------------------------------------------------------------------- */
/*            Componentes de apoyo: encabezado, chips y campos                */
/* -------------------------------------------------------------------------- */

// Encabezado estándar de las vistas de Local y Equipo (título, descripción y acciones)
export function EncabezadoSeccion({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion: string
  acciones?: React.ReactNode
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-stone-100">
          {titulo}
        </h1>
        <p className={cn("line-clamp-1 text-xs text-slate-500 sm:text-sm dark:text-stone-400", ocultarEnPantallaBaja)}>
          {descripcion}
        </p>
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  )
}

function Campo({
  id,
  label,
  error,
  children,
  className,
}: {
  id?: string
  label: React.ReactNode
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {id ? (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}

/** Pie estándar de los paneles de formulario: cancelar y guardar (el guardado envía el formulario por su id). */
function PieFormulario({
  formId,
  onCancelar,
  enviando,
  textoEnviar,
}: {
  formId: string
  onCancelar: () => void
  enviando: boolean
  textoEnviar: string
}) {
  return (
    <>
      <Button type="button" variant="outline" size="md" onClick={onCancelar} disabled={enviando}>
        Cancelar
      </Button>
      <Button type="submit" form={formId} size="md" disabled={enviando}>
        {textoEnviar}
      </Button>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*              Registro y actualización de empleados (usuarios)              */
/* -------------------------------------------------------------------------- */

interface EmpleadoFormProps {
  // Empleado a editar; si no se envía, el formulario registra uno nuevo
  empleado?: Empleado
  cargos: Cargo[]
  // Devuelve true si se guardó (entonces el panel se cierra)
  onGuardar: (values: EmpleadoFormValues, empleado?: Empleado) => Promise<boolean>
  onClose: () => void
}

export default function EmpleadoForm({ empleado, cargos, onGuardar, onClose }: EmpleadoFormProps) {
  const esEdicion = Boolean(empleado)
  const formId = React.useId()

  // Por defecto se propone el primer cargo de la lista
  const rolPorDefecto = cargos[0]?.id_rol ?? ""

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoFormSchema),
    defaultValues: empleadoToFormValues(empleado, rolPorDefecto),
  })

  const idRol = useWatch({ control, name: "idRol" })
  const cargoSeleccionado = cargos.find((c) => c.id_rol === idRol)

  const onSubmit = async (values: EmpleadoFormValues) => {
    if (await onGuardar(values, empleado)) onClose()
  }

  return (
    <FormPanel
      open
      onOpenChange={(abierto) => {
        if (!abierto && !isSubmitting) onClose()
      }}
      title={esEdicion ? "Actualizar empleado" : "Registrar empleado"}
      description="El cargo define a qué módulos podrá acceder en Coffy Flow."
      footer={
        <PieFormulario
          formId={formId}
          onCancelar={onClose}
          enviando={isSubmitting}
          textoEnviar={esEdicion ? "Guardar cambios" : "Registrar empleado"}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Campo id="emp-nombre" label="Nombre completo" error={errors.nombre?.message}>
          <Input
            id="emp-nombre"
            {...register("nombre")}
            placeholder="Ej. Lucía Ramírez Soto"
            autoComplete="off"
            maxLength={100}
            state={errors.nombre ? "error" : "default"}
            aria-invalid={Boolean(errors.nombre)}
            className={inputClass}
          />
        </Campo>

        <Campo id="emp-email" label="Correo electrónico" error={errors.email?.message}>
          <Input
            id="emp-email"
            {...register("email")}
            type="email"
            placeholder="nombre@coffyflow.pe"
            autoComplete="off"
            maxLength={150}
            state={errors.email ? "error" : "default"}
            aria-invalid={Boolean(errors.email)}
            className={inputClass}
          />
        </Campo>

        <Campo id="emp-rol" label="Cargo" error={errors.idRol?.message}>
          <NativeSelect
            id="emp-rol"
            {...register("idRol")}
            aria-invalid={Boolean(errors.idRol)}
            className={cn("w-full [&_select]:h-11", selectClass)}
          >
            {cargos.map((c) => (
              <NativeSelectOption key={c.id_rol} value={c.id_rol}>
                {c.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {cargoSeleccionado?.descripcion && (
            <p className="text-xs text-slate-500 dark:text-stone-400">{cargoSeleccionado.descripcion}</p>
          )}
        </Campo>

        <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-stone-950/60 dark:text-stone-300">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {esEdicion
            ? "Los cambios de cargo se aplican en cuanto el empleado vuelve a la pestaña o inicia sesión."
            : "La cuenta se crea como Pendiente de activación: el empleado recibe un correo para definir su contraseña."}
        </p>
      </form>
    </FormPanel>
  )
}

/* -------------------------------------------------------------------------- */
/*          Roles y permisos: vista «Crear nuevo rol» / «Editar permisos»     */
/* -------------------------------------------------------------------------- */

const ALTO_TARJETA_MODULO = 200

export function RolForm({
  rol,
  catalogo,
  puedeEditar,
  puedeEliminar,
  empleadosAsignados,
  onGuardar,
  onEliminar,
  onVolver,
}: {
  // Rol a editar; si no se envía, se crea uno nuevo
  rol?: RolDetalle
  catalogo: ModuloCatalogo[]
  puedeEditar: boolean
  puedeEliminar: boolean
  empleadosAsignados: number
  // Devuelven true si la operación terminó bien (entonces se vuelve a la lista)
  onGuardar: (values: RolFormValues, rol?: RolDetalle) => Promise<boolean>
  onEliminar: (rol: RolDetalle) => Promise<boolean>
  onVolver: () => void
}) {
  const esEdicion = Boolean(rol)
  const soloLectura = !puedeEditar
  const confirm = useConfirm()
  const [eliminando, setEliminando] = React.useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RolFormValues>({
    resolver: zodResolver(rolFormSchema),
    defaultValues: rolToFormValues(rol),
  })

  const permisos = useWatch({ control, name: "permisos" })
  const todas = React.useMemo(() => todasLasClaves(catalogo), [catalogo])
  const paginacion = usePaginacionAjustada(catalogo, { altoItem: ALTO_TARJETA_MODULO, anchoMinimo: 220 })

  const todosSeleccionados = todas.length > 0 && permisos.length === todas.length

  const onSubmit = async (values: RolFormValues) => {
    if (await onGuardar(values, rol)) onVolver()
  }

  const titulo = !esEdicion ? "Crear Nuevo Rol" : soloLectura ? `Permisos de ${rol?.nombre}` : "Editar Permisos"
  const descripcion = !esEdicion
    ? "Configura un nuevo cargo definiendo sus responsabilidades y permisos en el sistema."
    : soloLectura
      ? "Consulta los módulos y acciones habilitados para este cargo."
      : "Actualiza las responsabilidades y los permisos de este cargo."

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full min-h-0 flex-col gap-4 overflow-hidden [@media(max-height:700px)]:gap-2"
      noValidate
    >
      <EncabezadoSeccion titulo={titulo} descripcion={descripcion} />

      <div
        className={cn(
          panelClass,
          "flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5 [@media(max-height:700px)]:gap-2.5 [@media(max-height:700px)]:p-3"
        )}
      >
        {/* Datos del rol */}
        <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rol-nombre" className={etiquetaCampoClass}>
              Nombre del Rol
            </label>
            <Input
              id="rol-nombre"
              {...register("nombre")}
              placeholder="Ej. Encargado de Turno"
              maxLength={50}
              autoComplete="off"
              disabled={soloLectura}
              state={errors.nombre ? "error" : "default"}
              aria-invalid={Boolean(errors.nombre)}
              className={inputClass}
            />
            {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rol-descripcion" className={etiquetaCampoClass}>
              Descripción
            </label>
            <Input
              id="rol-descripcion"
              {...register("descripcion")}
              placeholder="Breve descripción de las responsabilidades..."
              maxLength={255}
              autoComplete="off"
              disabled={soloLectura}
              state={errors.descripcion ? "error" : "default"}
              aria-invalid={Boolean(errors.descripcion)}
              className={inputClass}
            />
            {errors.descripcion && <p className={errorClass}>{errors.descripcion.message}</p>}
          </div>
        </div>

        <div className="h-px shrink-0 bg-slate-200 dark:bg-stone-800" />

        {/* Permisos por módulo */}
        <div className="flex shrink-0 items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-stone-100">Permisos por Módulo</h2>
            <p className={cn("line-clamp-1 text-xs text-slate-500 dark:text-stone-400", ocultarEnPantallaBaja)}>
              Selecciona las áreas a las que este cargo tendrá acceso.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-500 tabular-nums sm:inline dark:text-stone-400">
              {permisos.length} de {todas.length}
            </span>
            {!soloLectura && (
              <button
                type="button"
                onClick={() =>
                  setValue("permisos", todosSeleccionados ? [] : [...todas], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="cursor-pointer text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC]"
              >
                {todosSeleccionados ? "Quitar todo" : "Seleccionar todo"}
              </button>
            )}
          </div>
        </div>
        {errors.permisos && <p className={cn(errorClass, "-mt-2 shrink-0")}>{errors.permisos.message}</p>}

        <Controller
          control={control}
          name="permisos"
          render={({ field }) => (
            <GrillaAjustada paginacion={paginacion} etiqueta="Permisos por módulo">
              {paginacion.visibles.map((modulo) => (
                <li key={modulo.modulo} className="min-h-0">
                  <TarjetaModulo
                    modulo={modulo}
                    seleccionados={field.value}
                    soloLectura={soloLectura}
                    onChange={(siguientes) => field.onChange(siguientes)}
                  />
                </li>
              ))}
            </GrillaAjustada>
          )}
        />

        <BarraPaginacion paginacion={paginacion} etiqueta="módulos" />

        {/* Acciones */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-stone-800 [@media(max-height:700px)]:pt-2.5">
          <div className="min-w-0">
            {esEdicion && !soloLectura && puedeEliminar && rol && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={eliminando}
                onClick={async () => {
                  if (!(await confirm({ variant: "destructive" }))) return
                  setEliminando(true)
                  const eliminado = await onEliminar(rol)
                  setEliminando(false)
                  if (eliminado) onVolver()
                }}
                disabled={empleadosAsignados > 0 || isSubmitting}
                title={empleadosAsignados > 0 ? "Tiene empleados asignados" : undefined}
                leftIcon={<Trash2 className="size-4" />}
                className="h-10 rounded-full px-3 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <span className="hidden sm:inline">Eliminar rol</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVolver}
              disabled={isSubmitting || eliminando}
              className={botonSecundario}
            >
              {soloLectura ? "Volver" : "Cancelar"}
            </Button>
            {!soloLectura && (
              <Button type="submit" size="sm" disabled={isSubmitting || eliminando} className={botonPrimario}>
                {esEdicion ? "Guardar cambios" : "Crear Rol"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

function TarjetaModulo({
  modulo,
  seleccionados,
  soloLectura,
  onChange,
}: {
  modulo: ModuloCatalogo
  seleccionados: string[]
  soloLectura: boolean
  onChange: (permisos: string[]) => void
}) {
  const config = getModuloConfig(modulo.modulo)
  const activos = modulo.acciones.filter((a) => seleccionados.includes(clavePermiso(modulo.modulo, a.accion))).length

  const alternar = (clave: string, marcado: boolean) =>
    onChange(marcado ? [...seleccionados, clave] : seleccionados.filter((p) => p !== clave))

  return (
    <article className={cn(tarjetaClass, "gap-3")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-stone-100">
          <config.icon className="size-4 shrink-0 text-[#4C0107] dark:text-[#E7B7BC]" />
          <span className="truncate">{modulo.etiqueta}</span>
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            activos > 0
              ? "bg-[#EDE5E6] text-[#4C0107] dark:bg-[#E7B7BC]/15 dark:text-[#E7B7BC]"
              : "bg-slate-100 text-slate-500 dark:bg-stone-800 dark:text-stone-400"
          )}
        >
          {activos}/{modulo.acciones.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2 overflow-y-auto">
        {modulo.acciones.map((accion) => {
          const clave = clavePermiso(modulo.modulo, accion.accion)
          const marcado = seleccionados.includes(clave)
          return (
            <li key={accion.accion}>
              <label
                className={cn(
                  "flex items-center gap-2.5 text-sm text-slate-700 dark:text-stone-300",
                  soloLectura ? "cursor-default" : "cursor-pointer"
                )}
              >
                <Checkbox
                  checked={marcado}
                  disabled={soloLectura}
                  onCheckedChange={(valor) => alternar(clave, valor === true)}
                  className="border-slate-300 data-checked:border-[#4C0107] data-checked:bg-[#4C0107] data-checked:text-white dark:border-stone-600 dark:data-checked:border-[#E7B7BC] dark:data-checked:bg-[#E7B7BC] dark:data-checked:text-stone-900"
                />
                <span className="truncate" title={accion.etiqueta}>
                  {accion.etiqueta}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                      Registro y edición de mesas                           */
/* -------------------------------------------------------------------------- */

export function MesaForm({
  mesa,
  areas,
  areaPorDefecto,
  onGuardar,
  onClose,
}: {
  // Mesa a editar; si no se envía, se registra una nueva
  mesa?: Mesa
  // Áreas que ya existen en el plano (para elegirlas con un toque)
  areas: string[]
  areaPorDefecto?: string
  // Devuelve true si se guardó (entonces el panel se cierra)
  onGuardar: (values: MesaFormValues, mesa?: Mesa) => Promise<boolean>
  onClose: () => void
}) {
  const esEdicion = Boolean(mesa)
  const formId = React.useId()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MesaFormValues>({
    resolver: zodResolver(mesaFormSchema),
    defaultValues: mesaToFormValues(mesa, areaPorDefecto ?? areas[0] ?? ""),
  })

  const areaActual = useWatch({ control, name: "area" })

  const onSubmit = async (values: MesaFormValues) => {
    if (await onGuardar(values, mesa)) onClose()
  }

  return (
    <FormPanel
      open
      onOpenChange={(abierto) => {
        if (!abierto && !isSubmitting) onClose()
      }}
      title={esEdicion ? "Editar mesa" : "Nueva mesa"}
      description="Los mozos verán este identificador en el mapa de mesas del POS."
      footer={
        <PieFormulario
          formId={formId}
          onCancelar={onClose}
          enviando={isSubmitting}
          textoEnviar={esEdicion ? "Guardar cambios" : "Registrar mesa"}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
          <Campo id="mesa-numero" label="Identificador" error={errors.numero?.message}>
            <Input
              id="mesa-numero"
              {...register("numero")}
              placeholder="Ej. M-10"
              autoComplete="off"
              maxLength={10}
              state={errors.numero ? "error" : "default"}
              aria-invalid={Boolean(errors.numero)}
              className={inputClass}
            />
          </Campo>
          <Campo id="mesa-capacidad" label="Capacidad" error={errors.capacidad?.message}>
            <Input
              id="mesa-capacidad"
              {...register("capacidad")}
              type="number"
              inputMode="numeric"
              min={1}
              max={CAPACIDAD_MAXIMA_MESA}
              state={errors.capacidad ? "error" : "default"}
              aria-invalid={Boolean(errors.capacidad)}
              className={cn(inputClass, "tabular-nums")}
            />
          </Campo>
        </div>

        <Campo id="mesa-area" label="Área de atención" error={errors.area?.message}>
          <Input
            id="mesa-area"
            {...register("area")}
            placeholder="Ej. Salón, Terraza, Barra…"
            autoComplete="off"
            maxLength={30}
            state={errors.area ? "error" : "default"}
            aria-invalid={Boolean(errors.area)}
            className={inputClass}
          />
          {areas.length > 0 && (
            <div role="group" aria-label="Áreas existentes" className="flex flex-wrap gap-2 pt-1">
              {areas.map((area) => {
                const config = getAreaConfig(area)
                const activa = areaActual.trim() === area
                return (
                  <button
                    key={area}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => setValue("area", area, { shouldValidate: true })}
                    className={cn(
                      "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                      opcionClass(activa)
                    )}
                  >
                    <config.icon className="size-3.5" />
                    {area}
                  </button>
                )
              })}
            </div>
          )}
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-stone-400">
            <Lock className="mt-0.5 size-3 shrink-0" />
            El área es un texto libre: escribe una nueva para crearla o toca una existente.
          </p>
        </Campo>
      </form>
    </FormPanel>
  )
}
