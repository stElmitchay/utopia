"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { ArrowUpRight } from "lucide-react"

const services = [
  {
    number: "01",
    title: "Self-Serve Poll Creation",
    description: "Create custom polls in minutes with configurable voting rules, time limits, and candidate options.",
  },
  {
    number: "02",
    title: "Blockchain Transparency",
    description: "Every vote is recorded on-chain, ensuring complete transparency and tamper-proof results.",
  },
  {
    number: "03",
    title: "Real-Time Results",
    description: "Watch votes come in live with instant on-chain verification and automatic tallying.",
  },
  {
    number: "04",
    title: "Decentralized Security",
    description: "Built on Solana for high-speed transactions, low fees, and cryptographic security.",
  },
]

export function ServicesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="features" className="py-32 px-6 md:px-8 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <span className="text-accent font-mono text-sm mb-4 block">FEATURES</span>
          <h2 className="brutalist-title text-5xl md:text-7xl lg:text-8xl text-foreground">
            Why choose
            <br />
            <span className="text-stroke">Utopia</span>
          </h2>
        </motion.div>

        <div className="space-y-0">
          {services.map((service, index) => (
            <motion.div
              key={service.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group border-t border-border py-8 md:py-12 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-8">
                <div className="flex items-start gap-6 md:gap-12 flex-1">
                  <span className="text-muted-foreground font-mono text-sm">{service.number}</span>
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-4xl font-bold text-foreground group-hover:text-accent transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground mt-3 max-w-md text-sm md:text-base">{service.description}</p>
                  </div>
                </div>
                <ArrowUpRight
                  className="text-muted-foreground group-hover:text-accent group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300"
                  size={24}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
