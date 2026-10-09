"use client"

import * as React from "react"
import Link from "next/link"
import { FloatingInput } from "@/shared/components/composed/floating-input"
import { Button } from "@/shared/components/ui/button"
import { Mail, Lock, Eye, EyeOff, Coffee } from "lucide-react"
import { useLogin } from "../hooks/use-login"

interface LoginViewProps {
  /** Ruta a la que volver tras iniciar sesión (la fija el Proxy al redirigir), vía ?siguiente= */
  siguiente?: string
  /** La sesión se cerró por falta de actividad: se avisa al volver al login. */
  porInactividad?: boolean
}

export function LoginView({ siguiente, porInactividad }: LoginViewProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const { form, submit, bloqueoSegundos } = useLogin(siguiente)
  const {
    register,
    formState: { errors, isSubmitting },
  } = form

  const bloqueado = bloqueoSegundos > 0

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Identidad Coffy Flow con Icono de Café */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#4C0107] text-white shadow-sm">
          <Coffee size={30} strokeWidth={2.2} />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
          Coffy Flow
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Acceso de Personal
        </p>
        {porInactividad && (
          <p role="status" className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Tu sesión se cerró por inactividad. Ingresa de nuevo para continuar.
          </p>
        )}
      </div>

      {/* Formulario utilizando FloatingInput y Button base */}
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="space-y-1">
          <FloatingInput
            label="Correo Electrónico"
            type="email"
            leftIcon={<Mail size={18} />}
            state={errors.email ? "error" : "default"}
            disabled={isSubmitting}
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && <p className="px-2 text-[11px] text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <FloatingInput
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            leftIcon={<Lock size={18} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="flex items-center justify-center text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            state={errors.password ? "error" : "default"}
            disabled={isSubmitting}
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && <p className="px-2 text-[11px] text-red-600">{errors.password.message}</p>}
          <div className="flex justify-end pt-1">
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-slate-500 hover:text-[#4C0107] transition-colors cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="default"
          size="md"
          disabled={isSubmitting || bloqueado}
          className="mt-2 w-full font-semibold shadow-sm cursor-pointer"
        >
          <span>
            {bloqueado ? `Reintentar en ${bloqueoSegundos}s` : "Iniciar Sesión"}
          </span>
        </Button>
      </form>
    </div>
  )
}
