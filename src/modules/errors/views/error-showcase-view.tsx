"use client"

import * as React from "react"
import Link from "next/link"
import { Error404View } from "./error-404-view"
import { Error403View } from "./error-403-view"
import { Error500View } from "./error-500-view"
import { Error429View } from "./error-429-view"
import { Layers, ExternalLink } from "lucide-react"
import type { ButtonProps } from "@/shared/components/ui/button"

type TabType = "404" | "403" | "500" | "429"
type ButtonVariantType = NonNullable<ButtonProps["variant"]>

/**
 * Vista de Auditoría y Exhibición de todas las páginas de error.
 * Permite auditar y verificar visualmente las 4 pantallas y alternar entre los botones predefinidos.
 */
export function ErrorShowcaseView() {
  const [activeTab, setActiveTab] = React.useState<TabType>("404")
  const [activeVariant, setActiveVariant] = React.useState<ButtonVariantType>("default")

  const tabs: Array<{ id: TabType; label: string; path: string }> = [
    { id: "404", label: "404 Vacía", path: "/error-404" },
    { id: "403", label: "403 Candado", path: "/error-403" },
    { id: "500", label: "500 Rota", path: "/error-500" },
    { id: "429", label: "429 Desbordada", path: "/error-429" },
  ]

  const variants: Array<{ id: ButtonVariantType; label: string }> = [
    { id: "default", label: "default" },
    { id: "outline", label: "outline" },
    { id: "ghost", label: "ghost" },
    { id: "link", label: "link" },
  ]

  return (
    <div className="relative min-h-screen">
      {/* Barra de control superior para auditar cada página y sus variantes de botón */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-slate-200 dark:border-stone-800 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-[#4C0107] dark:text-red-400" />
            <span className="font-bold text-sm text-slate-950 dark:text-white">
              Auditoría Páginas de Error (Coffy Flow)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de error */}
            <div className="flex items-center gap-1 p-1 bg-slate-200 dark:bg-stone-800 rounded-full">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-[#4C0107] text-white shadow-xs"
                      : "text-slate-950 dark:text-white hover:bg-slate-300 dark:hover:bg-stone-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Selector de variante de botón */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-stone-800/60 rounded-full border border-slate-200 dark:border-stone-700">
              <span className="text-[11px] font-bold text-slate-700 dark:text-stone-300 px-2">Botón:</span>
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVariant(v.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    activeVariant === v.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "text-slate-700 dark:text-stone-300 hover:bg-slate-200 dark:hover:bg-stone-700"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enlace directo a la ruta singular actual */}
          <div className="flex items-center gap-2">
            <Link
              href={tabs.find((t) => t.id === activeTab)?.path || "/error-404"}
              className="inline-flex items-center gap-1 text-xs text-slate-950 dark:text-white hover:text-[#4C0107] dark:hover:text-amber-400 font-bold"
            >
              <span>Ver {tabs.find((t) => t.id === activeTab)?.path}</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Renderizado de la vista de error con la variante seleccionada */}
      <div>
        {activeTab === "404" && <Error404View buttonVariant={activeVariant} />}
        {activeTab === "403" && <Error403View buttonVariant={activeVariant} />}
        {activeTab === "500" && <Error500View buttonVariant={activeVariant} />}
        {activeTab === "429" && <Error429View buttonVariant={activeVariant} />}
      </div>
    </div>
  )
}
