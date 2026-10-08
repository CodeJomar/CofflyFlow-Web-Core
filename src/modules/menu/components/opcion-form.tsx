"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FloatingInput } from "@/shared/components/composed/floating-input"
import { opcionFormSchema, type OpcionFormValues } from "../schema"
import { botonIcono, errorClass } from "./estilos"

export function OpcionForm({
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
        <FloatingInput
          label="Nombre de la opción"
          {...register("nombre")}
          maxLength={60}
          autoComplete="off"
          state={errors.nombre ? "error" : "default"}
          className="min-w-0 flex-1"
        />
        <FloatingInput
          label="± S/"
          {...register("precioDelta")}
          inputMode="decimal"
          autoComplete="off"
          state={errors.precioDelta ? "error" : "default"}
          className="w-28 shrink-0"
        />
        <Button type="submit" size="md" disabled={isSubmitting} className="h-14 shrink-0 px-3">
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
