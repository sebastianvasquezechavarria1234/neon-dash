import React from 'react'
import { motion } from 'framer-motion'

const RainbowCrystal = () => {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Outer Glow Layer */}
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-4px] rounded-full blur-xl bg-[conic-gradient(from_0deg,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5,#002bff,#7a00ff,#ff00c8,#ff0000)]"
      />
      
      {/* Prismatic Crystal Body */}
      <motion.div
        animate={{ 
          rotateY: [0, 180, 360],
          rotateX: [15, -15, 15],
          filter: [
            "hue-rotate(0deg) brightness(1)", 
            "hue-rotate(180deg) brightness(1.5)", 
            "hue-rotate(360deg) brightness(1)"
          ]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-8 h-8 flex items-center justify-center"
      >
        {/* Hexagonal Core */}
        <div 
          className="w-full h-full bg-[conic-gradient(from_0deg,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5,#002bff,#7a00ff,#ff00c8,#ff0000)]"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: 'inset 0 0 10px rgba(255,255,255,0.8)'
          }}
        >
          {/* Inner Light Flare */}
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-white/40 mix-blend-overlay"
          />
        </div>
      </motion.div>

      {/* Floating Sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-10, 10, -10],
            x: [-5, 5, -5],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.4
          }}
          className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

export default RainbowCrystal
