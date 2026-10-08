"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Switch } from "@/shared/components/ui/switch"
import { cn } from "@/shared/utils/cn"
import { etiquetaDelta, grupoFormSchema, type GrupoFormValues, type GrupoMenu, type OpcionFormValues } from "../schema"
import { botonIcono } from "./estilos"
import { GrupoCampos } from "./grupo-campos"
import { OpcionForm } from "./opcion-form"

export function GrupoFila({
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
