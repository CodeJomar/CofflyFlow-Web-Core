"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { grupoFormSchema, type GrupoFormValues } from "../schema"
import { GrupoCampos } from "./grupo-campos"

const GRUPO_VACIO: GrupoFormValues = { nombre: "", seleccionMinima: "0", seleccionMaxima: "1" }

export function NuevoGrupoForm({ onCrear }: { onCrear: (values: GrupoFormValues) => Promise<boolean> }) {
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
