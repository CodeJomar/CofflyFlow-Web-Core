import type { Metadata } from "next"
import { Error403View } from "@/modules/errors/views/error-403-view"

export const metadata: Metadata = {
  title: "Error 403 | Coffy Flow",
  description: "Acceso denegado en Coffy Flow",
}

export default function Error403Page() {
  return <Error403View />
}
