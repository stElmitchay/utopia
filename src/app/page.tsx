"use client"

import dynamic from "next/dynamic"
import { Navigation } from "@/components/navigation"
import { ServicesSection } from "@/components/services-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"

// Dynamically import components that use 3D graphics with no SSR
const HeroSection = dynamic(() => import("@/components/hero-section").then(mod => ({ default: mod.HeroSection })), {
  ssr: false,
  loading: () => (
    <section className="relative h-screen w-full overflow-hidden bg-background">
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="brutalist-title text-[18vw] md:text-[15vw] lg:text-[12vw] text-foreground leading-none tracking-tighter">
            Utopia
          </h1>
        </div>
      </div>
    </section>
  ),
})

const AboutSection = dynamic(() => import("@/components/about-section").then(mod => ({ default: mod.AboutSection })), {
  ssr: false,
})

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  )
}
