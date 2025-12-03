"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { ArrowRight } from "lucide-react"

export function ContactSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="contact" className="py-32 px-6 md:px-8 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <span className="text-accent font-mono text-sm mb-4 block">GET STARTED</span>
          <h2 className="brutalist-title text-5xl md:text-7xl lg:text-8xl text-foreground">
            Ready to
            <br />
            <span className="text-stroke">vote?</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-muted-foreground text-lg mb-8">
              Start creating transparent, decentralized elections in minutes. No coding required, just connect your
              wallet and create your first poll.
            </p>

            <div className="space-y-6">
              <div>
                <span className="text-sm text-muted-foreground block mb-2">For Organizations</span>
                <p className="text-foreground text-xl">Universities & Event Managers</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block mb-2">Blockchain</span>
                <p className="text-foreground text-xl">Solana Devnet</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block mb-2">Get Started</span>
                <a href="/voting" className="text-foreground text-xl hover:text-accent transition-colors">
                  Launch App →
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            <div className="bg-background border-2 border-border p-8 md:p-12">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Built for transparency
              </h3>
              <ul className="space-y-4 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  <span>Connect with Phantom, Solflare, or any Solana wallet</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  <span>Create unlimited polls with custom voting rules</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  <span>Real-time results visible to everyone</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">✓</span>
                  <span>Every vote cryptographically secured on-chain</span>
                </li>
              </ul>
              <div className="mt-8">
                <a
                  href="/voting"
                  className="inline-flex items-center gap-2 text-foreground border-2 border-foreground px-8 py-4 font-bold hover:bg-foreground hover:text-background transition-colors duration-300"
                >
                  GET STARTED
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
