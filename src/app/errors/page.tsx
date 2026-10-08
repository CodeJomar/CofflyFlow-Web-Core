import type { Metadata } from "next"
import { ErrorShowcaseView } from "@/modules/errors/views/error-showcase-view"

export const metadata: Metadata = {
  title: "Páginas de Error | Coffy Flow",
  description: "Auditoría visual de páginas de error 404, 403, 500 y 429 de Coffy Flow",
}

export default function ErrorsShowcasePage() {
  return <ErrorShowcaseView />
}
