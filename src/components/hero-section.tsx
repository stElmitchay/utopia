"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, Float } from "@react-three/drei"
import { motion } from "motion/react"
import { Suspense } from "react"
import { GeometricShapes } from "./geometric-shapes"
import Link from "next/link"

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

        {/* Bottom Section with CTA */}
        <div className="absolute bottom-8 left-6 md:left-8 right-6 md:right-8">
          {/* Info texts on sides, CTA in center */}
          <div className="flex justify-between items-end">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs md:text-sm text-muted-foreground max-w-[120px] md:max-w-xs"
            >
              Decentralized voting
              <br />
              on Solana blockchain
            </motion.p>

            {/* Get Started Button - Center */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <Link
                href="/create-poll"
                className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-accent text-background font-bold uppercase tracking-wide text-xs md:text-sm border-2 border-accent hover:bg-transparent hover:text-accent transition-all duration-300"
              >
                <span>Get Started</span>
                <svg
                  className="w-4 h-4 md:w-5 md:h-5 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-[10px] md:text-xs text-muted-foreground mt-3 font-mono"
              >
                NO SIGNUP REQUIRED
              </motion.p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs md:text-sm text-muted-foreground text-right max-w-[120px] md:max-w-xs"
            >
              Transparent, tamper-proof
              <br />
              elections for everyone.
            </motion.p>
          </div>
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
