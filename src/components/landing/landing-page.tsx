'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
import Link from 'next/link'
import { useMemo } from 'react'

const LandingPage = () => {
  const router = useRouter()
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()

  const solanaWallet = useMemo(() => {
    console.log('[LandingPage] Wallets:', wallets)
    return wallets[0] // First wallet is the embedded Solana wallet
  }, [wallets])

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  }

  const cardHover = {
    scale: 1.02,
    transition: { duration: 0.2 }
  }
  
  return (
    <div className="min-h-screen bg-[#2c5446] text-[#F5F5DC]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 relative" style={{ maxWidth: '1441px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center text-center lg:text-left"
          >
            <h1 className="font-courier font-bold mb-6 sm:mb-8 lg:mb-10">
              <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-[#F5F5DC] leading-tight">Voting</div>
              <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-[#F5F5DC] leading-tight">Reimagined.</div>
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl mb-6 sm:mb-8 text-[#F5F5DC] font-courier italic max-w-md mx-auto lg:mx-0">
              Make every vote count, literally.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start">
              {authenticated && solanaWallet ? (
                <motion.button
                  whileHover={cardHover}
                  onClick={() => router.push('/create-poll')}
                  className="btn bg-white text-[#0A1A14] hover:bg-[#A3E4D7] hover:text-[#0A1A14] px-6 sm:px-8 w-full sm:w-auto"
                >
                  Get started
                </motion.button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
                  <PrivyWalletButton />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] flex items-center justify-center mt-8 lg:mt-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <div className="absolute top-[25%] left-[1%] w-[280px] h-[280px] rounded-full bg-[#A3E4D7]/15 backdrop-blur-md flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-3">🗳️</div>
                <div className="text-lg font-medium">Secure</div>
              </div>
            </div>
            
            <div className="absolute top-[30%] right-[1%] w-[280px] h-[280px] rounded-full bg-[#2C5B4C]/80 backdrop-blur-md flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-3">⚡</div>
                <div className="text-lg font-medium">Fast</div>
              </div>
            </div>
            
            <div className="absolute bottom-[20%] left-[25%] w-[280px] h-[280px] rounded-full bg-[#143D28]/70 backdrop-blur-md flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-3">🔐</div>
                <div className="text-lg font-medium">Transparent</div>
              </div>
            </div>
            
            <motion.div 
              className="absolute h-full w-full"
              animate={{ 
                rotate: [0, 5, 0, -5, 0],
              }}
              transition={{ 
                duration: 20, 
                repeat: Infinity,
                ease: "linear" 
              }}
            >
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                <path 
                  d="M30,100 C30,50 50,30 100,30 C150,30 170,50 170,100 C170,150 150,170 100,170 C50,170 30,150 30,100" 
                  fill="none" 
                  stroke="#A3E4D7" 
                  strokeWidth="0.5"
                  strokeDasharray="5,5"
                />
                <path 
                  d="M40,100 C40,60 60,40 100,40 C140,40 160,60 160,100 C160,140 140,160 100,160 C60,160 40,140 40,100" 
                  fill="none" 
                  stroke="#A3E4D7" 
                  strokeWidth="0.5"
                  strokeDasharray="5,5"
                />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </div>
      

      {/* Why You'll Love It Section */}
      <section className="container mx-auto px-6 py-24 bg-[#2c5446]">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            className="text-5xl font-bold mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Why You&apos;ll Love It.
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                icon: "⚡",
                title: "Speed matters",
                description: "Solana confirms transactions in seconds, making voting quick and efficient for everyone involved."
              },
              {
                icon: "🔒",
                title: "Trustless by design",
                description: "Every vote is public, secure, and verifiable on the blockchain. No more questioning if your vote was counted."
              },
              {
                icon: "📈",
                title: "Built to scale",
                description: "Whether it's 10 voters or 10,000, our platform handles it without breaking a sweat or compromising security."
              },
              {
                icon: "🧭",
                title: "Simple to use",
                description: "Create a poll in seconds. The user-friendly interface guides you through the process with minimal steps required."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="flex gap-6"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <div className="text-5xl">{feature.icon}</div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[#A3E4D7]/70 text-lg">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Blockchain Section */}
      <section className="container mx-auto px-6 py-24 bg-[#2c5446]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl font-bold mb-6">Why Blockchain?</h2>
              <p className="text-xl mb-10 text-[#F5F5F5]/80">
                Traditional voting systems often rely on blind trust. With blockchain, 
                transparency is built in. Every vote is traceable, timestamped, and immutable.
              </p>
              
              <div className="flex flex-col gap-6">
                <div className="flex gap-4 items-center bg-[#143D28]/70 backdrop-blur-md p-6 rounded-xl">
                  <div className="bg-[#A3E4D7]/80 text-[#0A1A14] w-16 h-16 flex items-center justify-center rounded-xl text-2xl font-bold">
                    Free
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Tamperproof</h3>
                    <p className="text-[#A3E4D7]/70">Once recorded, votes can&apos;t be altered or deleted</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-center bg-[#2C5B4C]/80 backdrop-blur-md p-6 rounded-xl">
                  <div className="bg-[#2C5B4C] text-white w-16 h-16 flex items-center justify-center rounded-xl text-2xl font-bold">
                    24h
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Permissionless</h3>
                    <p className="text-[#A3E4D7]/70">You don&apos;t have to trust us, trust the chain</p>
                  </div>
                </div> 
                
                <div className="flex gap-4 items-center bg-[#A3E4D7]/30 backdrop-blur-md p-6 rounded-xl">
                  <div className="bg-[#0A1A14] text-[#A3E4D7] w-16 h-16 flex items-center justify-center rounded-xl text-2xl font-bold">
                    500K
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Decentralised</h3>
                    <p className="text-[#A3E4D7]/70">No central authority</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              className="relative h-[500px] flex items-center justify-center"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative w-full h-full">
                <div className="absolute top-[10%] right-[10%] w-[220px] h-[400px] bg-[#3751FF] rounded-3xl overflow-hidden transform rotate-6 shadow-xl">
                  <div className="bg-[#2C3FD9] p-3 text-white text-sm font-bold">Poll Vote</div>
                  <div className="p-5 flex flex-col items-center">
                    <div className="w-full h-[200px] bg-[#F5F5F5]/10 rounded-xl mb-4 overflow-hidden">
                      <Image 
                        src="/images/vote-illustration.png" 
                        alt="Voting illustration" 
                        width={220} 
                        height={200} 
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?q=80&w=2574&auto=format&fit=crop";
                        }}
                      />
                    </div>
                    <div className="w-full bg-[#4D63FF] p-3 rounded-xl text-white text-center mb-2">
                      I&apos;ll Vote!
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-[25%] left-[5%] w-[220px] h-[400px] bg-[#3751FF] rounded-3xl overflow-hidden transform -rotate-3 shadow-xl z-10">
                  <div className="bg-[#2C3FD9] p-3 text-white text-sm font-bold">Your Poll</div>
                  <div className="p-5 flex flex-col items-center">
                    <div className="w-full h-[200px] bg-[#F5F5F5]/10 rounded-xl mb-4 overflow-hidden">
                      <Image 
                        src="/images/create-poll-illustration.png" 
                        alt="Create poll illustration" 
                        width={220} 
                        height={200} 
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1614332287897-cdc485fa562d?q=80&w=2670&auto=format&fit=crop";
                        }}
                      />
                    </div>
                    <div className="w-full bg-[#4D63FF] p-3 rounded-xl text-white text-center mb-2">
                      Create Poll
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

       {/* How It Works Section */}
       <section id="how-it-works" className="container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            className="text-5xl font-bold mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            How It Works.
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: "Create poll",
                description: "Set up a secure voting poll in seconds. No complicated setup, just a few clicks and you're ready.",
                icon: "🗳️"
              },
              {
                title: "Vote",
                description: "Cast your vote with confidence. Every vote is recorded permanently on chain.",
                icon: "✅"
              },
              {
                title: "Pray",
                description: "You can pray for the outcome of the poll. Cz if you don't pray",
                icon: "🙏"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="text-6xl mb-6">{step.icon}</div>
                <h3 className="text-3xl font-bold mb-4">{step.title}</h3>
                <p className="text-[#A3E4D7]/80 text-xl">{step.description}</p>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            className="mt-24 flex justify-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.button
              whileHover={cardHover}
              onClick={() => router.push('/create-poll')}
              className="btn bg-[#A3E4D7] text-[#0A1A14] hover:opacity-90 text-lg px-8"
            >
              <div className="flex flex-col">
                <span>Create your first poll</span>
              </div>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="container mx-auto px-6 py-24 bg-[#2c5446]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              className="relative h-[500px] flex items-center justify-center order-2 lg:order-1"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative w-full h-full">
                <div className="absolute top-[5%] left-[10%] w-[280px] h-[500px] bg-[#111111] rounded-3xl overflow-hidden transform -rotate-6 shadow-xl">
                  <div className="bg-[#222222] p-3 text-white text-sm font-bold flex items-center">
                    <div className="w-2 h-2 rounded-full bg-[#A3E4D7] mr-2"></div>
                    Manage Your Poll
                  </div>
                  <div className="p-4">
                    <h3 className="text-white text-lg font-semibold mb-4">Hi Guy!</h3>
                    <p className="text-white/70 text-sm mb-4">Do you like this Car?</p>
                    <div className="flex gap-2 mb-6">
                      <div className="flex-1 bg-[#50C878] text-white p-2 rounded-lg text-center text-sm">Yes</div>
                      <div className="flex-1 bg-[#4D63FF] text-white p-2 rounded-lg text-center text-sm">No</div>
                    </div>
                    
                    <div className="bg-[#222222] rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white">Statistics Vote</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 9L12 15L18 9" stroke="#A3E4D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    
                    <div className="bg-[#222222] rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white">Viewers Poll</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 15L12 9L6 15" stroke="#A3E4D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-500"></div>
                        <div className="w-6 h-6 rounded-full bg-gray-600"></div>
                        <div className="w-6 h-6 rounded-full bg-gray-700"></div>
                        <div className="text-xs text-gray-400">+24 more</div>
                      </div>
                    </div>
                    
                    <div className="bg-[#222222] rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white">Share Poll Count</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 9L12 15L18 9" stroke="#A3E4D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-5xl font-bold mb-6">Use Cases</h2>
              <p className="text-xl mb-10 text-[#F5F5F5]/80">
                Our blockchain voting platform is versatile and can be used for various scenarios
                where transparent, secure decision-making is essential.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    title: "DAO Governance",
                    description: "Manage proposals and voting for decentralized autonomous organizations with complete transparency.",
                    isOpen: true
                  },
                  {
                    title: "Community Decision-Making",
                    description: "Engage community members in important decisions with verifiable results everyone can trust."
                  },
                  {
                    title: "Startup Pitch Contests",
                    description: "Run fair competitions where votes are visible and immutable, ensuring legitimate winners."
                  },
                  {
                    title: "Hackathon Judging",
                    description: "Evaluate projects with a transparent voting system that prevents favoritism."
                  },
                  {
                    title: "Tokenholder Voting",
                    description: "Let token holders participate in governance decisions proportional to their holdings."
                  }
                ].map((useCase, index) => (
                  <motion.div
                    key={index}
                    className={`bg-[${useCase.isOpen ? '#143D28' : '#143D28/50'}] backdrop-blur-md p-6 rounded-xl`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">{useCase.title}</h3>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${useCase.isOpen ? 'bg-[#A3E4D7]' : 'bg-[#A3E4D7]/30'}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d={useCase.isOpen ? "M18 15L12 9L6 15" : "M6 9L12 15L18 9"} stroke={useCase.isOpen ? "#0A1A14" : "#F5F5F5"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    {useCase.isOpen && (
                      <motion.p 
                        className="mt-3 text-[#A3E4D7]/70"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                      >
                        {useCase.description}
                      </motion.p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="container mx-auto px-4 py-16 text-center " style={{ maxWidth: '1441px', minHeight: '0px' }}>
        <motion.div
          initial={fadeIn.initial}
          whileInView={fadeIn.animate}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-6">Start your first vote today</h2>
          <p className="text-xl mb-8">No paperwork. No platforms. Just blockchain-backed decisions.</p>
          <div className="flex gap-4 justify-center">
            <motion.button
              whileHover={cardHover}
              onClick={() => router.push('/create-poll')}
              className="btn bg-[#A3E4D7] text-[#1A3C34] hover:bg-[#8CD0C3]"
            >
              🚀 Get Started
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Footer Section
      <footer className="bg-[#234D44] py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-center gap-8">
            {[
              { label: "About", href: "/about" },
              { label: "Documentation", href: "/docs" },
              { label: "GitHub", href: "https://github.com" },
              { label: "Community", href: "/community" },
              { label: "Twitter / X", href: "https://twitter.com" }
            ].map((link, index) => (
              <motion.a
                key={index}
                href={link.href}
                className="hover:text-[#A3E4D7] transition-colors"
                whileHover={cardHover}
              >
                {link.label}
              </motion.a>
            ))}
          </div>
        </div>
      </footer> */}
    </div>
  )
} 

export default LandingPage 