import type { NextConfig } from "next";

// URL de la API NestJS vista desde el servidor de Next (en Docker: http://api-core:4000).
// Se fija en tiempo de build (las reglas de rewrites se serializan en el build standalone).
const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // El navegador habla SIEMPRE con su propio origen (/api/...) y Next reenvía a NestJS.
  // Así las cookies de sesión son de primera parte (sin SameSite=None ni CORS, que Safari/iPad bloquea)
  // y el Proxy de Next puede ver si existe sesión.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_INTERNAL_URL}/api/:path*` },
      // Latido de la API (público, sin prefijo /api): lo usa el aviso de conexión para saber si volvió.
      { source: "/estado-api", destination: `${API_INTERNAL_URL}/health` },
    ];
  },
};

export default nextConfig;
