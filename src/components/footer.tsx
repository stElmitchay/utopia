"use client"

import { motion } from "framer-motion"

const socialLinks = [
  { label: "GitHub", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "Discord", href: "#" },
  { label: "Docs", href: "#" },
]

export function Footer() {
  return (
    <footer className="py-12 px-6 md:px-8 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <a
              href="/"
              className="text-foreground font-bold text-2xl tracking-tight underline underline-offset-4 decoration-accent"
            >
              UTOPIA
            </a>
            <p className="text-muted-foreground text-sm mt-2">© 2025. All rights reserved.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex gap-6"
          >
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-accent transition-colors text-sm"
              >
                {link.label}
              </a>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-right"
          >
            <p className="text-muted-foreground text-sm">
              Transparent voting
              <br />
              for everyone
            </p>
          </motion.div>
        </div>

        {/* Large footer text */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-16 overflow-hidden"
        >
          <h2 className="brutalist-title text-[15vw] md:text-[12vw] text-foreground/5 leading-none tracking-tighter text-center select-none">
            UTOPIA
          </h2>
        </motion.div>
      </div>
    </footer>
  )
}
