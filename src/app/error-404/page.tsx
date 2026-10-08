import type { Metadata } from "next"
import { Error404View } from "@/modules/errors/views/error-404-view"

export const metadata: Metadata = {
  title: "Error 404 | Coffy Flow",
  description: "Página no encontrada en Coffy Flow",
}

export default function Error404Page() {
  return <Error404View />
}
