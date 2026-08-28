import React from 'react';
import { motion } from 'framer-motion';

export default function DeepSeaCreatures() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      
      {/* 🦈 1. Gran Tiburón / Leviatán de Datos (Wireframe Ámbar y Cian) */}
      <motion.div
        initial={{ x: '-35vw', y: '62vh', scale: 0.85, opacity: 0 }}
        animate={{
          // Nado serpenteante de izquierda a derecha
          x: ['-35vw', '115vw'],
          y: ['62vh', '54vh', '68vh', '58vh', '64vh'],
          opacity: [0, 0.28, 0.35, 0.25, 0]
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: 'linear',
          delay: 1,
        }}
        className="absolute w-80 h-36"
      >
        <svg viewBox="0 0 320 130" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(207,157,123,0.4)]">
          {/* Silueta vectorial poligonal del tiburón */}
          <path 
            d="M 15 65 Q 65 20 165 30 Q 240 45 295 15 Q 275 60 300 105 Q 245 80 165 90 Q 75 105 15 65 Z" 
            fill="none" 
            stroke="#CF9D7B" 
            strokeWidth="1.6" 
          />
          {/* Aleta dorsal geométrica */}
          <path d="M 135 32 L 170 5 L 180 30" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Aleta pectoral */}
          <path d="M 115 80 L 140 120 L 165 88" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Estructura interna / Red neuronal */}
          <line x1="95" y1="52" x2="95" y2="78" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />
          <line x1="110" y1="48" x2="110" y2="82" stroke="#CF9D7B" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.8" />
          <line x1="125" y1="46" x2="125" y2="85" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />
          <line x1="140" y1="44" x2="140" y2="87" stroke="#CF9D7B" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.8" />
          
          {/* Ojo bioluminiscente parpadeante */}
          <circle cx="50" cy="56" r="3" fill="#38BDF8" className="animate-pulse shadow-[0_0_8px_#38BDF8]" />
          <circle cx="50" cy="56" r="1.2" fill="#FFFFFF" />

          {/* Rastro de paquetes de datos (burbujas/haces) */}
          <circle cx="310" cy="58" r="1.5" fill="#38BDF8" opacity="0.6" />
          <circle cx="325" cy="62" r="1" fill="#CF9D7B" opacity="0.5" />
        </svg>
      </motion.div>

      {/* 🐟 2. Cardumen de Rayos / Haces de Luz Cian (Dirección opuesta) */}
      <motion.div
        initial={{ x: '115vw', y: '30vh', scale: 0.75, opacity: 0 }}
        animate={{
          // Nado rápido de derecha a izquierda en aguas medias
          x: ['115vw', '-30vw'],
          y: ['30vh', '38vh', '25vh', '34vh'],
          opacity: [0, 0.22, 0.3, 0.18, 0]
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'linear',
          delay: 8,
        }}
        className="absolute w-64 h-24"
      >
        <svg viewBox="0 0 240 90" className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">
          {/* Pez 1 */}
          <path d="M 25 30 Q 50 18 75 30 Q 60 40 25 30 Z" fill="none" stroke="#38BDF8" strokeWidth="1.3" />
          <polygon points="75,30 90,22 86,30 90,38" fill="none" stroke="#38BDF8" strokeWidth="1" />
          
          {/* Pez 2 */}
          <path d="M 90 55 Q 115 45 140 55 Q 125 65 90 55 Z" fill="none" stroke="#CF9D7B" strokeWidth="1.3" />
          <polygon points="140,55 155,48 151,55 155,62" fill="none" stroke="#CF9D7B" strokeWidth="1" />

          {/* Pez 3 */}
          <path d="M 60 70 Q 80 62 100 70 Q 90 78 60 70 Z" fill="none" stroke="#38BDF8" strokeWidth="1.2" />

          {/* Estelas de pulsos continuos */}
          <line x1="5" y1="30" x2="20" y2="30" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <line x1="70" y1="55" x2="85" y2="55" stroke="#CF9D7B" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        </svg>
      </motion.div>

      {/* 🌌 3. Partículas y Burbujas de Datos Flotantes */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: `${15 + i * 15}vw`, 
              y: '105vh', 
              opacity: 0 
            }}
            animate={{ 
              y: '-10vh',
              opacity: [0, 0.4, 0.6, 0.2, 0]
            }}
            transition={{
              duration: 14 + i * 3,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 2.5
            }}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#38BDF8]/40 shadow-[0_0_6px_#38BDF8]"
          />
        ))}
      </div>

    </div>
  );
}