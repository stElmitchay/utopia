"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, Float } from "@react-three/drei"
import { motion } from "motion/react"
import { Suspense } from "react"
import { GeometricShapes } from "./geometric-shapes"

function Scene() {
  return (
    <>
      <Environment preset="night" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4ade80" />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <GeometricShapes />
      </Float>
    </>
  )
}

export function HeroSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-8">
        <div className="max-w-[95vw] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <h1 className="brutalist-title text-[18vw] md:text-[15vw] lg:text-[12vw] text-foreground leading-none tracking-tighter">
              Uto
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <h1 className="brutalist-title text-[18vw] md:text-[15vw] lg:text-[12vw] text-stroke text-foreground leading-none tracking-tighter">
              pia
            </h1>
          </motion.div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-8 left-6 md:left-8 right-6 md:right-8 flex justify-between items-end">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs md:text-sm text-muted-foreground max-w-xs"
          >
            Decentralized voting
            <br />
            on Solana blockchain
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs md:text-sm text-muted-foreground text-right"
          >
            Transparent, tamper-proof
            <br />
            elections for everyone.
          </motion.p>
        </div>
      </div>

      {/* Blockchain Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute top-6 md:top-8 right-6 md:right-8 text-xs font-mono text-muted-foreground"
      >
        SOLANA
      </motion.div>
    </section>
  )
}
