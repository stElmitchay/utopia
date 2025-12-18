"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, Float } from "@react-three/drei"
import { motion } from "framer-motion"
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
        <div className="absolute bottom-16 md:bottom-20 left-6 md:left-8 right-6 md:right-8">
          {/* CTA in center */}
          <div className="flex justify-center items-end">
            {/* Get Started Button - Center */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <Link
                href="/create-poll"
                className="group inline-flex items-center gap-4 px-8 md:px-12 py-4 md:py-6 bg-accent text-background font-black uppercase tracking-wider text-sm md:text-base lg:text-lg border-4 border-accent hover:bg-transparent hover:text-accent transition-all duration-300"
              >
                <span>Get Started</span>
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 transform group-hover:translate-x-2 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
