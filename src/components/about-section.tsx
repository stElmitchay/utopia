"use client"

import { Canvas } from "@react-three/fiber"
import { Float, MeshDistortMaterial } from "@react-three/drei"
import { motion, useInView } from "framer-motion"
import { useRef, Suspense } from "react"

function FloatingSphere() {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <MeshDistortMaterial color="#4ade80" speed={2} distort={0.4} radius={1} metalness={0.8} roughness={0.2} />
      </mesh>
    </Float>
  )
}

export function AboutSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="about" className="py-32 px-6 md:px-8 border-t border-border relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="text-accent font-mono text-sm mb-4 block">ABOUT</span>
            <h2 className="brutalist-title text-4xl md:text-6xl lg:text-7xl text-foreground mb-8">
              Democracy
              <br />
              <span className="text-stroke">on-chain</span>
            </h2>

            <div className="space-y-6 text-muted-foreground">
              <p className="text-lg">
                Utopia is a no-code, decentralized voting platform that brings transparency and security to elections
                through blockchain technology.
              </p>
              <p>
                Built on Solana, we enable universities, organizations, and event managers to create tamper-proof
                elections with self-serve poll creation, configurable voting rules, and real-time results.
              </p>
              <p>
                Every vote is recorded on-chain, ensuring complete transparency and cryptographic security. No central
                authority, no manipulation — just pure, verifiable democracy.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-border">
              <div>
                <div className="text-4xl md:text-5xl font-bold text-foreground">100%</div>
                <div className="text-sm text-muted-foreground mt-1">Transparent</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-foreground">0.01s</div>
                <div className="text-sm text-muted-foreground mt-1">Per Vote</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-foreground">$0.01</div>
                <div className="text-sm text-muted-foreground mt-1">Transaction Fee</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.2 }}
            className="h-[400px] md:h-[500px] hidden lg:block"
          >
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <pointLight position={[-5, -5, -5]} intensity={0.5} color="#4ade80" />
                <FloatingSphere />
              </Suspense>
            </Canvas>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
