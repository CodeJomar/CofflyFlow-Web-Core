"use client"

import * as React from "react"

/**
 * 1. Ilustración Taza Error 404: Taza vacía con vapor enigmático y rastro de café desvanecido
 */
export function Cup404Illustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none w-full ${className}`}>
      {/* Fondo con aura suave */}
      <div className="absolute inset-0 bg-radial from-[#4C0107]/10 via-amber-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

      <svg
        viewBox="0 0 440 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="cupGrad404" x1="60" y1="120" x2="300" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#690F16" />
            <stop offset="0.6" stopColor="#4C0107" />
            <stop offset="1" stopColor="#2D0104" />
          </linearGradient>
          <linearGradient id="innerRim404" x1="100" y1="130" x2="260" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E2D6D8" />
            <stop offset="1" stopColor="#C9B7BA" />
          </linearGradient>
          <linearGradient id="saucerGrad404" x1="40" y1="280" x2="360" y2="330" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5EFEF" />
            <stop offset="0.5" stopColor="#EDE5E6" />
            <stop offset="1" stopColor="#D8CDCF" />
          </linearGradient>
          <linearGradient id="steamGrad404" x1="180" y1="140" x2="180" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9C7A80" stopOpacity="0.7" />
            <stop offset="0.8" stopColor="#C4B0B4" stopOpacity="0.2" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="shadowGrad404" cx="50%" cy="50%" r="50%">
            <stop stopColor="#1E0305" stopOpacity="0.35" />
            <stop offset="1" stopColor="#1E0305" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sombra de la base */}
        <ellipse cx="200" cy="340" rx="170" ry="24" fill="url(#shadowGrad404)" />

        {/* Plato / Saucer */}
        <ellipse cx="200" cy="305" rx="155" ry="32" fill="url(#saucerGrad404)" />
        <ellipse cx="200" cy="303" rx="145" ry="26" fill="#FBF8F8" />
        <ellipse cx="200" cy="303" rx="100" ry="16" fill="#EDE5E6" stroke="#D1C3C5" strokeWidth="1.5" />

        {/* Asa de la taza */}
        <path
          d="M260 180 C325 180 335 255 255 265"
          stroke="url(#cupGrad404)"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M260 180 C310 185 320 250 255 262"
          stroke="#7A151D"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* Cuerpo de la taza */}
        <path
          d="M100 155 C100 280 140 295 200 295 C260 295 300 280 300 155 Z"
          fill="url(#cupGrad404)"
        />

        {/* Reflejo vertical de cerámica pulida */}
        <path
          d="M125 165 C122 230 135 270 148 280 C143 270 136 230 138 165 Z"
          fill="#FFFFFF"
          opacity="0.18"
        />

        {/* Borde exterior superior */}
        <ellipse cx="200" cy="155" rx="100" ry="26" fill="#690F16" />

        {/* Interior de la taza (Vacío / Profundo) */}
        <ellipse cx="200" cy="155" rx="92" ry="22" fill="url(#innerRim404)" />
        <ellipse cx="200" cy="162" rx="76" ry="16" fill="#6B5B5E" />
        <ellipse cx="200" cy="164" rx="64" ry="12" fill="#4A3C3E" />

        {/* Círculo punteado de búsqueda / "Objeto no encontrado" en el fondo */}
        <ellipse
          cx="200"
          cy="164"
          rx="44"
          ry="8"
          fill="none"
          stroke="#EDE5E6"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.6"
        />

        {/* Grano de café fantasma en el fondo de la taza */}
        <path
          d="M196 161 C193 162 193 166 198 167 C203 168 206 165 205 163 C204 161 199 160 196 161 Z"
          fill="#3B1C1E"
        />
        <path d="M196 161 Q200 164 204 164" stroke="#EDE5E6" strokeWidth="0.8" opacity="0.7" fill="none" />

        {/* Volutas de vapor disipándose en formas de signos de interrogación */}
        <g opacity="0.85">
          {/* Vapor 1 (Interrogación izquierda) */}
          <path
            d="M165 140 C155 110 140 85 158 60 C170 42 192 48 184 70 C180 80 172 88 174 100"
            stroke="url(#steamGrad404)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="174" cy="115" r="2.5" fill="#C4B0B4" opacity="0.6" />

          {/* Vapor 2 central alto */}
          <path
            d="M205 135 C200 100 230 80 215 45 C205 25 210 15 205 10"
            stroke="url(#steamGrad404)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Vapor 3 derecha */}
          <path
            d="M245 140 C260 115 255 90 240 68 C230 52 245 35 255 30"
            stroke="url(#steamGrad404)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Granos de café en el plato */}
        <g transform="translate(85, 290) rotate(-20)">
          <ellipse cx="12" cy="7" rx="9" ry="5.5" fill="#3E1A1D" />
          <path d="M5 7 Q12 10 19 6" stroke="#EDE5E6" strokeWidth="1" opacity="0.6" fill="none" />
        </g>
        <g transform="translate(105, 305) rotate(15)">
          <ellipse cx="10" cy="6" rx="8" ry="5" fill="#4C2226" />
          <path d="M4 6 Q10 4 16 7" stroke="#EDE5E6" strokeWidth="0.9" opacity="0.6" fill="none" />
        </g>
      </svg>
    </div>
  )
}

/**
 * 2. Ilustración Taza Error 403: Taza blindada con candado dorado de barista y sello de acceso denegado
 */
export function Cup403Illustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none w-full ${className}`}>
      {/* Resplandor ámbar de seguridad */}
      <div className="absolute inset-0 bg-radial from-amber-600/15 via-[#4C0107]/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      <svg
        viewBox="0 0 440 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="cupGrad403" x1="60" y1="120" x2="300" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#690F16" />
            <stop offset="0.6" stopColor="#4C0107" />
            <stop offset="1" stopColor="#250204" />
          </linearGradient>
          <linearGradient id="coffeeSurface403" x1="120" y1="150" x2="280" y2="165" gradientUnits="userSpaceOnUse">
            <stop stopColor="#31140F" />
            <stop offset="0.5" stopColor="#4A1E14" />
            <stop offset="1" stopColor="#260C08" />
          </linearGradient>
          <linearGradient id="goldPadlockGrad" x1="160" y1="210" x2="240" y2="285" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FCD34D" />
            <stop offset="0.3" stopColor="#F59E0B" />
            <stop offset="0.8" stopColor="#D97706" />
            <stop offset="1" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="shackleGrad" x1="175" y1="180" x2="225" y2="230" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E2E8F0" />
            <stop offset="0.5" stopColor="#94A3B8" />
            <stop offset="1" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="saucerGrad403" x1="40" y1="280" x2="360" y2="330" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5EFEF" />
            <stop offset="0.5" stopColor="#EDE5E6" />
            <stop offset="1" stopColor="#D8CDCF" />
          </linearGradient>
          <radialGradient id="shadowGrad403" cx="50%" cy="50%" r="50%">
            <stop stopColor="#1E0305" stopOpacity="0.35" />
            <stop offset="1" stopColor="#1E0305" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sombra base */}
        <ellipse cx="200" cy="340" rx="170" ry="24" fill="url(#shadowGrad403)" />

        {/* Plato / Saucer */}
        <ellipse cx="200" cy="305" rx="155" ry="32" fill="url(#saucerGrad403)" />
        <ellipse cx="200" cy="303" rx="145" ry="26" fill="#FBF8F8" />
        <ellipse cx="200" cy="303" rx="100" ry="16" fill="#EDE5E6" stroke="#D1C3C5" strokeWidth="1.5" />

        {/* Asa de la taza */}
        <path
          d="M260 180 C325 180 335 255 255 265"
          stroke="url(#cupGrad403)"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cuerpo de la taza */}
        <path
          d="M100 155 C100 280 140 295 200 295 C260 295 300 280 300 155 Z"
          fill="url(#cupGrad403)"
        />

        {/* Borde exterior superior */}
        <ellipse cx="200" cy="155" rx="100" ry="26" fill="#690F16" />

        {/* Superficie de café premium */}
        <ellipse cx="200" cy="156" rx="90" ry="21" fill="url(#coffeeSurface403)" />
        <ellipse cx="195" cy="156" rx="72" ry="14" fill="#62281C" opacity="0.75" />

        {/* Cadena protectora que rodea la taza */}
        <path
          d="M102 215 C130 235 270 235 298 215"
          stroke="#475569"
          strokeWidth="7"
          strokeDasharray="9 5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M104 218 C132 238 268 238 296 218"
          stroke="#94A3B8"
          strokeWidth="3"
          strokeDasharray="9 5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Candado dorado elegante en el centro de la taza */}
        <g id="padlock-group" className="filter drop-shadow-lg">
          {/* Arco del candado (Shackle) */}
          <path
            d="M178 220 V194 C178 178 222 178 222 194 V220"
            stroke="url(#shackleGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cuerpo del candado */}
          <rect
            x="166"
            y="214"
            width="68"
            height="58"
            rx="12"
            fill="url(#goldPadlockGrad)"
            stroke="#92400E"
            strokeWidth="2"
          />

          {/* Brillo en el candado */}
          <rect
            x="172"
            y="219"
            width="56"
            height="5"
            rx="2.5"
            fill="#FEF3C7"
            opacity="0.8"
          />

          {/* Ojo de la cerradura */}
          <circle cx="200" cy="237" r="5.5" fill="#451A03" />
          <polygon points="196,240 204,240 202,254 198,254" fill="#451A03" />
        </g>

        {/* Cinta / Etiqueta "Restringido" colgante - Cuadro rojo extendido y centrado */}
        <g transform="translate(118, 131) rotate(-8)">
          <rect x="0" y="0" width="164" height="28" rx="7" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="1.5" />
          <text x="82" y="18" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" letterSpacing="0.08em">
            ACCESO RESTRINGIDO
          </text>
        </g>
      </svg>
    </div>
  )
}

/**
 * 3. Ilustración Taza Error 500: Taza rota con café derramado (Concepto específico requerido)
 */
export function Cup500Illustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none w-full ${className}`}>
      {/* Resplandor rojo/cálido de emergencia */}
      <div className="absolute inset-0 bg-radial from-red-600/15 via-[#4C0107]/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      <svg
        viewBox="0 0 440 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="cupGrad500" x1="60" y1="120" x2="300" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#690F16" />
            <stop offset="0.6" stopColor="#4C0107" />
            <stop offset="1" stopColor="#220103" />
          </linearGradient>
          <linearGradient id="crackGlow" x1="160" y1="140" x2="230" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EF4444" />
            <stop offset="0.5" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="spillCoffeeGrad" x1="140" y1="280" x2="320" y2="340" gradientUnits="userSpaceOnUse">
            <stop stopColor="#31140F" />
            <stop offset="0.6" stopColor="#4A1E14" />
            <stop offset="1" stopColor="#260C08" />
          </linearGradient>
          <linearGradient id="saucerGrad500" x1="40" y1="280" x2="360" y2="330" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5EFEF" />
            <stop offset="0.5" stopColor="#EDE5E6" />
            <stop offset="1" stopColor="#D8CDCF" />
          </linearGradient>
          <radialGradient id="shadowGrad500" cx="50%" cy="50%" r="50%">
            <stop stopColor="#1E0305" stopOpacity="0.4" />
            <stop offset="1" stopColor="#1E0305" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sombra base */}
        <ellipse cx="200" cy="340" rx="170" ry="24" fill="url(#shadowGrad500)" />

        {/* Charco de café derramado en el plato y mesa */}
        <path
          d="M130 310 C150 295 190 290 240 295 C295 300 340 310 330 325 C320 338 270 345 210 343 C155 342 110 332 120 318 C123 313 126 311 130 310 Z"
          fill="url(#spillCoffeeGrad)"
          className="filter drop-shadow-md"
        />

        {/* Gotas de café derramadas dispersas */}
        <ellipse cx="350" cy="326" rx="8" ry="4.5" fill="#3B150F" />
        <ellipse cx="365" cy="331" rx="4" ry="2.5" fill="#4A1E14" />
        <ellipse cx="98" cy="328" rx="7" ry="3.8" fill="#3B150F" />
        <ellipse cx="86" cy="334" rx="3.5" ry="2" fill="#4A1E14" />

        {/* Plato / Saucer */}
        <ellipse cx="200" cy="305" rx="155" ry="32" fill="url(#saucerGrad500)" />
        <ellipse cx="200" cy="303" rx="145" ry="26" fill="#FBF8F8" />
        <ellipse cx="200" cy="303" rx="100" ry="16" fill="#EDE5E6" stroke="#D1C3C5" strokeWidth="1.5" />

        {/* Asa de la taza */}
        <path
          d="M260 180 C325 180 335 255 255 265"
          stroke="url(#cupGrad500)"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
        />

        {/* MITAD IZQUIERDA DE LA TAZA (Ligeramente inclinada por la fractura) */}
        <g id="left-cup-half">
          <path
            d="M100 155 C100 280 135 295 190 295 L182 250 L198 215 L185 180 L200 155 Z"
            fill="url(#cupGrad500)"
          />
          {/* Borde superior izquierdo */}
          <path
            d="M100 155 C100 142 145 133 200 133 L185 155 C145 155 105 150 100 155 Z"
            fill="#690F16"
          />
        </g>

        {/* MITAD DERECHA DE LA TAZA (Separada por la grieta y desplazada) */}
        <g id="right-cup-half" transform="translate(6, 2) rotate(2 250 220)">
          <path
            d="M205 155 L190 180 L203 215 L188 250 L196 295 C250 295 300 280 300 155 Z"
            fill="url(#cupGrad500)"
          />
          {/* Borde superior derecho */}
          <path
            d="M205 155 C255 155 295 145 300 155 C300 168 255 178 205 178 Z"
            fill="#560A10"
          />
        </g>

        {/* LA GRAN GRIETA CENTRAL (Kintsugi roto / quiebre nítido) */}
        <path
          d="M198 135 L184 178 L201 214 L186 250 L194 298"
          stroke="#EF4444"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="bevel"
          fill="none"
        />
        {/* Resplandor interno de la fractura */}
        <path
          d="M198 135 L184 178 L201 214 L186 250 L194 298"
          stroke="#FCD34D"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="bevel"
          fill="none"
        />

        {/* Café escurriendo por la grieta exterior */}
        <path
          d="M187 235 Q192 260 193 295"
          stroke="#31140F"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="193" cy="285" r="3" fill="#4A1E14" />

        {/* Fragmento / Trozo de cerámica roto en el plato */}
        <polygon
          points="270,305 288,298 296,312 278,315"
          fill="#690F16"
          stroke="#4C0107"
          strokeWidth="1.5"
          className="filter drop-shadow-sm"
        />
        <polygon
          points="272,306 286,300 292,308 278,312"
          fill="#831821"
        />

        {/* Vapor errático y cortado */}
        <path
          d="M150 120 C140 100 155 85 145 65"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
          opacity="0.6"
          fill="none"
        />
        <path
          d="M240 120 C250 95 235 80 250 55"
          stroke="#9CA3AF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
          opacity="0.5"
          fill="none"
        />

        {/* Pequeño icono de advertencia sobre la rotura */}
        <g transform="translate(186, 92)">
          <circle cx="14" cy="14" r="14" fill="#FEF2F2" stroke="#EF4444" strokeWidth="2" />
          <path d="M14 8 V16" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="14" cy="20" r="1.5" fill="#DC2626" />
        </g>
      </svg>
    </div>
  )
}

/**
 * 4. Ilustración Taza Error 429: Taza desbordándose a borbotones por demasiadas solicitudes
 */
export function Cup429Illustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none w-full ${className}`}>
      {/* Resplandor ámbar/naranja de sobrecarga */}
      <div className="absolute inset-0 bg-radial from-amber-500/15 via-[#4C0107]/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      <svg
        viewBox="0 0 440 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="cupGrad429" x1="60" y1="120" x2="300" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#690F16" />
            <stop offset="0.6" stopColor="#4C0107" />
            <stop offset="1" stopColor="#250204" />
          </linearGradient>
          <linearGradient id="cremaGrad429" x1="100" y1="130" x2="300" y2="190" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="0.4" stopColor="#D97706" />
            <stop offset="0.8" stopColor="#92400E" />
            <stop offset="1" stopColor="#451A03" />
          </linearGradient>
          <linearGradient id="saucerGrad429" x1="40" y1="280" x2="360" y2="330" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5EFEF" />
            <stop offset="0.5" stopColor="#EDE5E6" />
            <stop offset="1" stopColor="#D8CDCF" />
          </linearGradient>
          <radialGradient id="shadowGrad429" cx="50%" cy="50%" r="50%">
            <stop stopColor="#1E0305" stopOpacity="0.35" />
            <stop offset="1" stopColor="#1E0305" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sombra base */}
        <ellipse cx="200" cy="340" rx="170" ry="24" fill="url(#shadowGrad429)" />

        {/* Charco desbordado en el plato */}
        <ellipse cx="200" cy="305" rx="140" ry="24" fill="#3D1811" opacity="0.6" />

        {/* Plato / Saucer */}
        <ellipse cx="200" cy="305" rx="155" ry="32" fill="url(#saucerGrad429)" />
        <ellipse cx="200" cy="303" rx="145" ry="26" fill="#FBF8F8" />
        <ellipse cx="200" cy="303" rx="100" ry="16" fill="#EDE5E6" stroke="#D1C3C5" strokeWidth="1.5" />

        {/* Asa de la taza */}
        <path
          d="M260 180 C325 180 335 255 255 265"
          stroke="url(#cupGrad429)"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cuerpo de la taza */}
        <path
          d="M100 155 C100 280 140 295 200 295 C260 295 300 280 300 155 Z"
          fill="url(#cupGrad429)"
        />

        {/* Borde exterior superior */}
        <ellipse cx="200" cy="155" rx="100" ry="26" fill="#690F16" />

        {/* CREMA Y CAFÉ DESBORDÁNDOSE (Gran cúpula de espuma y olas de café) */}
        <ellipse cx="200" cy="152" rx="94" ry="28" fill="url(#cremaGrad429)" />

        {/* Oleaje y burbujas de desborde por los lados */}
        {/* Desborde lado izquierdo */}
        <path
          d="M96 155 C90 170 102 195 106 230 C108 245 100 260 108 280 L115 280 C118 250 115 220 112 180 Z"
          fill="#D97706"
        />
        <path
          d="M98 158 C94 172 104 195 108 228 C110 240 104 252 110 270"
          stroke="#78350F"
          strokeWidth="2"
          fill="none"
        />

        {/* Desborde lado derecho */}
        <path
          d="M298 155 C308 175 296 205 292 235 C290 250 296 265 290 285 L284 285 C286 255 288 220 289 180 Z"
          fill="#D97706"
        />

        {/* Cascada de café frontal que rebalsa el borde */}
        <path
          d="M170 170 C165 195 160 215 168 240 C172 252 168 262 170 275 L178 275 C180 255 178 230 178 190 Z"
          fill="#B45309"
          opacity="0.85"
        />

        {/* Burbujas y espuma en la superficie (Espuma rica de café a borbotones) */}
        <circle cx="170" cy="148" r="14" fill="#FBBF24" opacity="0.9" />
        <circle cx="195" cy="142" r="18" fill="#F59E0B" />
        <circle cx="225" cy="146" r="15" fill="#D97706" />
        <circle cx="150" cy="154" r="9" fill="#FCD34D" />
        <circle cx="245" cy="153" r="11" fill="#F59E0B" />
        <circle cx="190" cy="158" r="12" fill="#B45309" />
        <circle cx="212" cy="156" r="10" fill="#92400E" />

        {/* Gotas y salpicaduras saliendo enérgicamente en el aire */}
        <circle cx="70" cy="120" r="5" fill="#D97706" />
        <circle cx="82" cy="98" r="3.5" fill="#F59E0B" />
        <circle cx="95" cy="115" r="4" fill="#B45309" />

        <circle cx="320" cy="115" r="5" fill="#D97706" />
        <circle cx="335" cy="95" r="3.5" fill="#F59E0B" />
        <circle cx="310" cy="85" r="4" fill="#B45309" />

        {/* Vapor rápido y denso a alta presión */}
        <path
          d="M175 125 C160 90 185 60 170 25"
          stroke="#F59E0B"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.75"
          fill="none"
        />
        <path
          d="M205 120 C220 85 195 50 215 15"
          stroke="#D97706"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.8"
          fill="none"
        />
        <path
          d="M235 125 C250 95 230 65 245 35"
          stroke="#FBBF24"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.7"
          fill="none"
        />

        {/* Indicador de medidor de presión en rojo/ámbar */}
        <g transform="translate(186, 210)">
          <rect x="-35" y="0" width="70" height="24" rx="12" fill="#78350F" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="0" y="16" textAnchor="middle" fill="#FEF3C7" fontSize="10" fontWeight="bold">
            MAX FLOW
          </text>
        </g>
      </svg>
    </div>
  )
}
