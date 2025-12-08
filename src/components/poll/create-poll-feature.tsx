'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
import toast from 'react-hot-toast'
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { usePrivyAnchorProvider } from '../solana/privy-anchor-provider'
import { getVotingapplicationProgramId } from '@project/anchor'
import { ConfirmationModal } from '../ui/confirmation-modal'
import { useCluster } from '../cluster/cluster-data-access'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { uploadPollImage } from '@/lib/storage-service'
import { createPollMetadata } from '@/lib/polls-service'
import { useUserCredits } from '../credits/credits-data-access'
import { InsufficientCreditsWarning, CreditBalanceDisplay } from '../credits/credits-ui'

// Types
interface PollDetails {
  pollId: number
  description: string
  pollStart: number
  pollEnd: number
  imageUrl?: string
  creditsPerVote: number
}

interface Candidate {
  id: string
  name: string
}

type CreationMode = 'select' | 'templates' | 'ai' | 'canvas'

// Template definitions
const POLL_TEMPLATES = [
  {
    id: 'university',
    icon: '🎓',
    title: 'University Election',
    description: 'Student council, class representatives, club officers',
    defaultDescription: 'University Student Council Election 2025',
    suggestedCandidates: ['President', 'Vice President', 'Secretary', 'Treasurer'],
    duration: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  {
    id: 'corporate',
    icon: '🏢',
    title: 'Corporate Decision',
    description: 'Board votes, team decisions, project selection',
    defaultDescription: 'Q1 Project Priority Vote',
    suggestedCandidates: ['Option A', 'Option B', 'Option C'],
    duration: 3 * 24 * 60 * 60, // 3 days
  },
  {
    id: 'event',
    icon: '🎉',
    title: 'Event Poll',
    description: 'Venue selection, date voting, activity choices',
    defaultDescription: 'Team Event Location Vote',
    suggestedCandidates: ['Location 1', 'Location 2', 'Location 3'],
    duration: 2 * 24 * 60 * 60, // 2 days
  },
  {
    id: 'community',
    icon: '🏘️',
    title: 'Community Vote',
    description: 'HOA decisions, neighborhood initiatives',
    defaultDescription: 'Community Initiative Proposal',
    suggestedCandidates: ['Approve', 'Reject', 'Defer'],
    duration: 14 * 24 * 60 * 60, // 14 days
  },
  {
    id: 'quick',
    icon: '⚡',
    title: 'Quick Poll',
    description: 'Fast yes/no or simple choice voting',
    defaultDescription: 'Quick Decision Poll',
    suggestedCandidates: ['Yes', 'No'],
    duration: 24 * 60 * 60, // 1 day
  },
  {
    id: 'custom',
    icon: '✨',
    title: 'Start Fresh',
    description: 'Build your poll from scratch with full control',
    defaultDescription: '',
    suggestedCandidates: [],
    duration: 7 * 24 * 60 * 60,
  },
]

// Mode Selection Component
function ModeSelector({ onSelect }: { onSelect: (mode: CreationMode) => void }) {
  const modes = [
    {
      id: 'templates' as CreationMode,
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      title: 'Templates',
      description: 'Start with a pre-designed template for common poll types',
      color: 'from-emerald-500/20 to-teal-500/20',
      borderColor: 'hover:border-emerald-500',
    },
    {
      id: 'ai' as CreationMode,
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'AI Assistant',
      description: 'Describe your poll in plain language and let AI set it up',
      color: 'from-blue-500/20 to-indigo-500/20',
      borderColor: 'hover:border-blue-500',
    },
    {
      id: 'canvas' as CreationMode,
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ),
      title: 'Visual Canvas',
      description: 'Drag and drop to build your poll with a live preview',
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'hover:border-blue-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">How would you like to create your poll?</h2>
        <p className="text-muted-foreground">Choose your preferred creation method</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modes.map((mode, index) => (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(mode.id)}
            className={`group relative p-8 bg-card border-2 border-border ${mode.borderColor} transition-all duration-300 text-left`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative">
              <div className="text-accent mb-4 group-hover:scale-110 transition-transform">
                {mode.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{mode.title}</h3>
              <p className="text-sm text-muted-foreground">{mode.description}</p>
            </div>
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// Template Gallery Component
function TemplateGallery({
  onSelect,
  onBack
}: {
  onSelect: (template: typeof POLL_TEMPLATES[0]) => void
  onBack: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 border-2 border-border hover:border-accent transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Choose a Template</h2>
          <p className="text-muted-foreground text-sm">Select a template to get started quickly</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {POLL_TEMPLATES.map((template, index) => (
          <motion.button
            key={template.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(template)}
            className="group p-6 bg-card border-2 border-border hover:border-accent transition-all text-left"
          >
            <div className="text-4xl mb-4">{template.icon}</div>
            <h3 className="text-lg font-bold text-foreground mb-1">{template.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
            {template.suggestedCandidates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.suggestedCandidates.slice(0, 3).map((c, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-accent/10 text-accent border border-accent/30">
                    {c}
                  </span>
                ))}
                {template.suggestedCandidates.length > 3 && (
                  <span className="text-xs px-2 py-1 text-muted-foreground">
                    +{template.suggestedCandidates.length - 3} more
                  </span>
                )}
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

// AI Assistant Component
function AIAssistant({
  onGenerate,
  onBack,
}: {
  onGenerate: (details: PollDetails, candidates: string[]) => void
  onBack: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPoll, setGeneratedPoll] = useState<{ details: PollDetails; candidates: string[] } | null>(null)

  const parsePrompt = useCallback((text: string) => {
    const lowerText = text.toLowerCase()

    // ============ EXTRACT DURATION ============
    let duration = 7 * 24 * 60 * 60 // default 7 days
    const durationPatterns: [RegExp, number][] = [
      [/(\d+)\s*hours?/i, 60 * 60],
      [/(\d+)\s*days?/i, 24 * 60 * 60],
      [/(\d+)\s*weeks?/i, 7 * 24 * 60 * 60],
      [/(\d+)\s*months?/i, 30 * 24 * 60 * 60],
      [/one\s*day|24\s*hour/i, 24 * 60 * 60],
      [/two\s*days?|2\s*days?/i, 2 * 24 * 60 * 60],
      [/three\s*days?|3\s*days?/i, 3 * 24 * 60 * 60],
      [/one\s*week|a\s*week/i, 7 * 24 * 60 * 60],
      [/two\s*weeks?|2\s*weeks?/i, 14 * 24 * 60 * 60],
      [/one\s*month|a\s*month/i, 30 * 24 * 60 * 60],
    ]

    for (const [pattern, multiplier] of durationPatterns) {
      const match = text.match(pattern)
      if (match) {
        const num = match[1] ? parseInt(match[1]) : 1
        duration = num * multiplier
        break
      }
    }

    // ============ EXTRACT CANDIDATES ============
    let candidates: string[] = []

    // Pattern 1: Explicit candidate lists
    const explicitPatterns = [
      /candidates?[:\s]+([^.]+?)(?:\.|$|voting|poll|election|for\s+\d)/i,
      /options?[:\s]+([^.]+?)(?:\.|$|voting|poll)/i,
      /choices?[:\s]+([^.]+?)(?:\.|$|voting|poll)/i,
    ]

    for (const pattern of explicitPatterns) {
      const match = text.match(pattern)
      if (match) {
        candidates = match[1]
          .split(/,|\band\b|\bor\b|&|\//)
          .map(c => c.trim())
          .filter(c => c.length > 0 && c.length < 50 && !c.match(/^\d+$/))
        if (candidates.length >= 2) break
      }
    }

    // Pattern 2: Named people patterns (4 candidates: John, Sarah, Mike, Lisa)
    if (candidates.length < 2) {
      const namedPattern = /(\d+)\s*candidates?[:\s]+([^.]+)/i
      const namedMatch = text.match(namedPattern)
      if (namedMatch) {
        candidates = namedMatch[2]
          .split(/,|\band\b|\bor\b|&/)
          .map(c => c.trim())
          .filter(c => c.length > 0 && c.length < 50)
      }
    }

    // Pattern 3: "between X and Y" or "X vs Y" or "X or Y"
    if (candidates.length < 2) {
      const vsPattern = /between\s+(.+?)\s+and\s+(.+?)(?:\.|,|$)/i
      const vsMatch = text.match(vsPattern)
      if (vsMatch) {
        candidates = [vsMatch[1].trim(), vsMatch[2].trim()]
      }
    }

    if (candidates.length < 2) {
      const orPattern = /(?:choose|pick|select|vote)\s+(?:between\s+)?(.+?)\s+(?:vs\.?|or)\s+(.+?)(?:\.|,|$)/i
      const orMatch = text.match(orPattern)
      if (orMatch) {
        candidates = [orMatch[1].trim(), orMatch[2].trim()]
      }
    }

    // Pattern 4: Context-based defaults
    if (candidates.length < 2) {
      if (lowerText.includes('yes') && lowerText.includes('no')) {
        candidates = ['Yes', 'No']
      } else if (lowerText.match(/approve|reject|accept|decline/)) {
        candidates = ['Approve', 'Reject']
      } else if (lowerText.match(/agree|disagree/)) {
        candidates = ['Agree', 'Disagree']
      } else if (lowerText.match(/president|council|election|representative/)) {
        candidates = ['Candidate A', 'Candidate B', 'Candidate C']
      } else if (lowerText.match(/location|venue|place/)) {
        candidates = ['Location A', 'Location B', 'Location C']
      } else if (lowerText.match(/date|time|when|schedule/)) {
        candidates = ['Option A', 'Option B', 'Option C']
      } else {
        candidates = ['Option 1', 'Option 2']
      }
    }

    // Clean up candidates - capitalize first letter, remove extra spaces
    candidates = candidates
      .map(c => c.replace(/^\W+|\W+$/g, '').trim()) // Remove leading/trailing non-word chars
      .map(c => c.charAt(0).toUpperCase() + c.slice(1)) // Capitalize first letter
      .filter(c => c.length > 0)

    // ============ EXTRACT POLL TITLE ============
    let description = ''

    // Pattern 1: Explicit poll/election/vote subject
    const titlePatterns = [
      /(?:poll|vote|election|survey|ballot)\s+(?:for|about|on|to\s+(?:decide|choose|select))\s+(.+?)(?:\.|,|with|candidates|options|between|\d+\s*(?:day|week|hour|month))/i,
      /(?:run|create|start|need)\s+(?:a|an)?\s*(?:poll|vote|election|survey)\s+(?:for|about|on|to)\s+(.+?)(?:\.|,|with|candidates|options|\d+\s*(?:day|week|hour|month))/i,
      /(?:voting|decide|choose|select)\s+(?:on|for|between)?\s*(.+?)(?:\.|,|candidates|options|between|\d+\s*(?:day|week|hour|month))/i,
      /(?:who|which|what)\s+(?:should|will|to)\s+(.+?)(?:\?|\.|,|candidates|options)/i,
    ]

    for (const pattern of titlePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        description = match[1].trim()
        // Clean up trailing words
        description = description.replace(/\s+(the|a|an|for|with|and|or)$/i, '')
        break
      }
    }

    // Pattern 2: Generate title from context keywords
    if (!description || description.length < 5) {
      if (lowerText.includes('student council') || lowerText.includes('student president')) {
        description = 'Student Council Election'
      } else if (lowerText.includes('class president') || lowerText.includes('class rep')) {
        description = 'Class Representative Election'
      } else if (lowerText.includes('president')) {
        description = 'Presidential Election'
      } else if (lowerText.includes('team lead') || lowerText.includes('team leader')) {
        description = 'Team Leader Selection'
      } else if (lowerText.match(/location|venue|where/)) {
        description = 'Location Selection Vote'
      } else if (lowerText.match(/date|when|schedule/)) {
        description = 'Date Selection Vote'
      } else if (lowerText.match(/project|feature|priority/)) {
        description = 'Project Priority Vote'
      } else if (lowerText.match(/approve|approval|proposal/)) {
        description = 'Proposal Approval Vote'
      } else if (lowerText.match(/team|group|department/)) {
        description = 'Team Decision Vote'
      } else if (lowerText.match(/event|party|celebration/)) {
        description = 'Event Planning Vote'
      }
    }

    // Pattern 3: Extract the main noun phrase as fallback
    if (!description || description.length < 5) {
      // Try to find a meaningful noun phrase
      const nounPhraseMatch = text.match(/(?:for|about|on)\s+(?:the\s+)?([A-Za-z][A-Za-z\s]{3,30}?)(?:\.|,|$)/i)
      if (nounPhraseMatch) {
        description = nounPhraseMatch[1].trim()
      }
    }

    // Final cleanup and formatting
    if (description) {
      // Remove candidate names from description if they got included
      for (const candidate of candidates) {
        description = description.replace(new RegExp(`\\b${candidate}\\b`, 'gi'), '').trim()
      }
      // Clean up extra spaces and punctuation
      description = description.replace(/\s+/g, ' ').replace(/[,.:]+$/, '').trim()
      // Capitalize each word for title case
      description = description
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }

    // Default fallback
    if (!description || description.length < 5) {
      description = 'Community Poll'
    }

    // Ensure max length
    if (description.length > 200) {
      description = description.substring(0, 197) + '...'
    }

    // ============ GENERATE POLL ID ============
    const pollId = Math.floor(Math.random() * 900000) + 100000

    // ============ CALCULATE DATES ============
    const now = new Date()
    const startDate = new Date(now.getTime() + 60 * 60 * 1000) // Start in 1 hour
    const endDate = new Date(startDate.getTime() + duration * 1000)

    return {
      details: {
        pollId,
        description,
        pollStart: Math.floor(startDate.getTime() / 1000),
        pollEnd: Math.floor(endDate.getTime() / 1000),
        creditsPerVote: 10,
      },
      candidates,
    }
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe your poll')
      return
    }

    setIsGenerating(true)

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500))

    const result = parsePrompt(prompt)
    setGeneratedPoll(result)
    setIsGenerating(false)
  }

  const handleAccept = () => {
    if (generatedPoll) {
      onGenerate(generatedPoll.details, generatedPoll.candidates)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 border-2 border-border hover:border-accent transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Poll Creator</h2>
          <p className="text-muted-foreground text-sm">Describe your poll in plain language</p>
        </div>
      </div>

      <div className="bg-card border-2 border-border p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-foreground mb-4">
              Tell me about your poll. Include details like:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• What you&apos;re voting on</li>
              <li>• Who the candidates or options are</li>
              <li>• How long the poll should run</li>
            </ul>
          </div>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: I need to run a student council election with 4 candidates: John, Sarah, Mike, and Lisa. The voting should run for one week starting tomorrow."
          className="w-full h-32 px-4 py-3 bg-background border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent resize-none"
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Poll</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Result */}
      <AnimatePresence>
        {generatedPoll && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-card border-2 border-accent p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-lg font-bold text-foreground">Generated Poll</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Description</label>
                <p className="text-foreground font-medium">{generatedPoll.details.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Start</label>
                  <p className="text-foreground text-sm">
                    {new Date(generatedPoll.details.pollStart * 1000).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">End</label>
                  <p className="text-foreground text-sm">
                    {new Date(generatedPoll.details.pollEnd * 1000).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Candidates ({generatedPoll.candidates.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {generatedPoll.candidates.map((c, i) => (
                    <span key={i} className="px-3 py-1 bg-accent/10 text-accent border border-accent/30 text-sm">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setGeneratedPoll(null)}
                className="flex-1 px-4 py-3 border-2 border-border text-foreground font-bold hover:border-accent transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 px-4 py-3 bg-accent border-2 border-accent text-background font-bold hover:bg-accent/90 transition-colors"
              >
                Edit in Canvas →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Visual Date Range Selector
function DateRangeSelector({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: Date
  endDate: Date
  onStartChange: (date: Date) => void
  onEndChange: (date: Date) => void
}) {
  const presets = [
    { label: '24 hours', duration: 24 * 60 * 60 * 1000 },
    { label: '3 days', duration: 3 * 24 * 60 * 60 * 1000 },
    { label: '1 week', duration: 7 * 24 * 60 * 60 * 1000 },
    { label: '2 weeks', duration: 14 * 24 * 60 * 60 * 1000 },
    { label: '1 month', duration: 30 * 24 * 60 * 60 * 1000 },
  ]

  const calculateDuration = () => {
    const diff = endDate.getTime() - startDate.getTime()
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}${hours > 0 ? `, ${hours} hour${hours > 1 ? 's' : ''}` : ''}`
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }

  const applyPreset = (duration: number) => {
    const newEnd = new Date(startDate.getTime() + duration)
    onEndChange(newEnd)
  }

  const formatDateForInput = (date: Date) => {
    return date.toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Schedule</h3>
        <div className="text-sm text-accent font-mono">{calculateDuration()}</div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset.duration)}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wide border-2 border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">Start</label>
          <input
            type="datetime-local"
            value={formatDateForInput(startDate)}
            onChange={(e) => onStartChange(new Date(e.target.value))}
            className="w-full px-3 py-2 bg-background border-2 border-border text-foreground text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">End</label>
          <input
            type="datetime-local"
            value={formatDateForInput(endDate)}
            onChange={(e) => onEndChange(new Date(e.target.value))}
            min={formatDateForInput(startDate)}
            className="w-full px-3 py-2 bg-background border-2 border-border text-foreground text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Visual timeline */}
      <div className="relative pt-4">
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-accent/50 w-full" />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>{startDate.toLocaleDateString()}</span>
          <span>{endDate.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}

// Live Preview Component
function LivePreview({
  description,
  candidates,
  startDate,
  endDate,
}: {
  description: string
  candidates: Candidate[]
  startDate: Date
  endDate: Date
}) {
  const now = new Date()
  const isUpcoming = startDate > now
  const status = isUpcoming ? 'UPCOMING' : 'LIVE'

  return (
    <div className="bg-card border-2 border-border h-full">
      <div className="p-4 border-b-2 border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Live Preview</h3>
          <span className={`text-xs px-2 py-1 border font-bold ${
            status === 'LIVE' ? 'border-accent text-accent' : 'border-yellow-500 text-yellow-500'
          }`}>
            {status}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Poll Title */}
        <div>
          <h4 className="text-lg font-bold text-foreground line-clamp-2">
            {description || 'Your poll title will appear here'}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>

        {/* Candidates */}
        <div className="space-y-2">
          {candidates.length > 0 ? (
            candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="p-3 bg-background border-2 border-border flex items-center justify-between"
              >
                <span className="text-foreground font-medium">{candidate.name}</span>
                <button className="px-4 py-1 bg-accent/10 text-accent text-xs font-bold uppercase tracking-wide border border-accent/30">
                  Vote
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 border-2 border-dashed border-border text-center">
              <p className="text-muted-foreground text-sm">
                Add candidates to see them here
              </p>
            </div>
          )}
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t-2 border-border">
          <div className="text-center p-2 bg-background border border-border">
            <div className="text-2xl font-bold text-foreground">{candidates.length}</div>
            <div className="text-xs text-muted-foreground uppercase">Candidates</div>
          </div>
          <div className="text-center p-2 bg-background border border-border">
            <div className="text-2xl font-bold text-foreground">0</div>
            <div className="text-xs text-muted-foreground uppercase">Votes</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Image Upload Component
function ImageUpload({
  image,
  imagePreview,
  onImageChange,
  onImageRemove,
}: {
  image: File | null
  imagePreview: string | null
  onImageChange: (file: File) => void
  onImageRemove: () => void
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast.error('Image must be JPEG, PNG, WebP, or GIF')
        return
      }
      onImageChange(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast.error('Image must be JPEG, PNG, WebP, or GIF')
        return
      }
      onImageChange(file)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground uppercase tracking-wide block">
        Poll Image (Optional)
      </label>
      {imagePreview ? (
        <div className="relative">
          <img
            src={imagePreview}
            alt="Poll preview"
            className="w-full h-40 object-cover border-2 border-border"
          />
          <button
            onClick={onImageRemove}
            className="absolute top-2 right-2 p-1 bg-background/80 border border-border hover:bg-destructive hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border hover:border-accent cursor-pointer transition-colors bg-background"
        >
          <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm text-muted-foreground">Click or drag to upload</span>
          <span className="text-xs text-muted-foreground mt-1">Max 5MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}
    </div>
  )
}

// Interactive Canvas Component
function InteractiveCanvas({
  initialDetails,
  initialCandidates,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  initialDetails?: PollDetails
  initialCandidates?: string[]
  onSubmit: (details: PollDetails, candidates: string[], image: File | null) => void
  onBack: () => void
  isSubmitting: boolean
}) {
  const [pollId] = useState(() => initialDetails?.pollId || Math.floor(Math.random() * 900000) + 100000)
  const [description, setDescription] = useState(initialDetails?.description || '')
  const [newCandidate, setNewCandidate] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>(() =>
    (initialCandidates || []).map((name, i) => ({ id: `candidate-${i}`, name }))
  )
  const [pollImage, setPollImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (file: File) => {
    setPollImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageRemove = () => {
    setPollImage(null)
    setImagePreview(null)
  }

  const now = new Date()
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
  const defaultEnd = new Date(defaultStart.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days later

  const [startDate, setStartDate] = useState(() =>
    initialDetails ? new Date(initialDetails.pollStart * 1000) : defaultStart
  )
  const [endDate, setEndDate] = useState(() =>
    initialDetails ? new Date(initialDetails.pollEnd * 1000) : defaultEnd
  )
  const [creditsPerVote, setCreditsPerVote] = useState(initialDetails?.creditsPerVote || 10)

  // Current active step (1 = title, 2 = candidates, 3 = schedule)
  const [activeStep, setActiveStep] = useState(() => {
    // If coming from template/AI with data, start at appropriate step
    if (initialDetails && initialCandidates && initialCandidates.length >= 2) return 3
    if (initialDetails) return 2
    return 1
  })

  // Completion status
  const step1Complete = description.trim().length >= 5
  const step2Complete = candidates.length >= 2
  const step3Complete = true // Schedule always has defaults
  const allComplete = step1Complete && step2Complete && step3Complete

  const handleAddCandidate = () => {
    const trimmed = newCandidate.trim()
    if (!trimmed) return

    if (candidates.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Candidate already exists')
      return
    }

    setCandidates([...candidates, { id: `candidate-${Date.now()}`, name: trimmed }])
    setNewCandidate('')
  }

  const handleRemoveCandidate = (id: string) => {
    setCandidates(candidates.filter(c => c.id !== id))
  }

  const handleReorder = (newOrder: Candidate[]) => {
    setCandidates(newOrder)
  }

  const handleNextStep = () => {
    if (activeStep === 1 && step1Complete) {
      setActiveStep(2)
    } else if (activeStep === 2 && step2Complete) {
      setActiveStep(3)
    }
  }

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error('Please enter a poll description')
      return
    }
    if (candidates.length < 2) {
      toast.error('Please add at least 2 candidates')
      return
    }
    if (startDate <= new Date()) {
      toast.error('Start date must be in the future')
      return
    }
    if (endDate <= startDate) {
      toast.error('End date must be after start date')
      return
    }

    onSubmit(
      {
        pollId,
        description: description.trim(),
        pollStart: Math.floor(startDate.getTime() / 1000),
        pollEnd: Math.floor(endDate.getTime() / 1000),
        creditsPerVote,
      },
      candidates.map(c => c.name),
      pollImage
    )
  }

  const handleClearForm = () => {
    setDescription('')
    setCandidates([])
    setNewCandidate('')
    const now = new Date()
    const newStart = new Date(now.getTime() + 60 * 60 * 1000)
    const newEnd = new Date(newStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    setStartDate(newStart)
    setEndDate(newEnd)
    setActiveStep(1)
  }

  // Completed step summary component
  const CompletedStepSummary = ({ step, title, summary, onEdit }: { step: number; title: string; summary: string; onEdit: () => void }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="bg-card border-2 border-accent/30 p-4 flex items-center gap-4"
    >
      <div className="w-8 h-8 bg-accent text-background flex items-center justify-center font-bold text-sm flex-shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-foreground font-medium truncate">{summary}</p>
      </div>
      <button
        onClick={onEdit}
        className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent border-2 border-accent/30 hover:border-accent hover:bg-accent/10 transition-colors"
      >
        Edit
      </button>
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 border-2 border-border hover:border-accent transition-colors"
          title="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">Build Your Poll</h2>
          <p className="text-muted-foreground text-sm">Step {activeStep} of 3</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <button
              onClick={() => {
                if (step === 1 || (step === 2 && step1Complete) || (step === 3 && step1Complete && step2Complete)) {
                  setActiveStep(step)
                }
              }}
              disabled={step > 1 && !step1Complete || step > 2 && !step2Complete}
              className={`flex items-center justify-center w-10 h-10 border-2 font-bold text-sm transition-all ${
                step < activeStep || (step === 1 && step1Complete) || (step === 2 && step2Complete)
                  ? 'bg-accent border-accent text-background cursor-pointer'
                  : step === activeStep
                    ? 'border-accent text-accent'
                    : 'border-border text-muted-foreground cursor-not-allowed'
              }`}
            >
              {(step < activeStep) || (step === 1 && step1Complete && activeStep > 1) || (step === 2 && step2Complete && activeStep > 2) ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : step}
            </button>
            {step < 3 && (
              <div className={`flex-1 h-1 mx-1 transition-all ${
                step < activeStep || (step === 1 && step1Complete) ? 'bg-accent' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-xs font-mono">
        <span className={activeStep === 1 ? 'text-accent font-bold' : step1Complete ? 'text-foreground' : 'text-muted-foreground'}>
          Title
        </span>
        <span className={activeStep === 2 ? 'text-accent font-bold' : step2Complete ? 'text-foreground' : 'text-muted-foreground'}>
          Candidates
        </span>
        <span className={activeStep === 3 ? 'text-accent font-bold' : 'text-muted-foreground'}>
          Schedule
        </span>
      </div>

      {/* Main Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Building Tools */}
        <div className="space-y-4">
          {/* Completed Steps Summaries */}
          <AnimatePresence>
            {activeStep > 1 && step1Complete && (
              <CompletedStepSummary
                step={1}
                title="Poll Title"
                summary={description}
                onEdit={() => setActiveStep(1)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {activeStep > 2 && step2Complete && (
              <CompletedStepSummary
                step={2}
                title="Candidates"
                summary={candidates.map(c => c.name).join(', ')}
                onEdit={() => setActiveStep(2)}
              />
            )}
          </AnimatePresence>

          {/* Active Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 1: Poll Description */}
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-card border-2 border-border p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/10 border-2 border-accent text-accent flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground uppercase tracking-wide block">
                      Poll Question / Title
                    </label>
                    <p className="text-xs text-muted-foreground">What would you like people to vote on?</p>
                  </div>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Student Council President Election 2025"
                  maxLength={280}
                  autoFocus
                  className="w-full h-32 px-4 py-3 bg-background border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent resize-none text-lg"
                />

                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-muted-foreground">
                    {description.trim().length < 5 ? `${5 - description.trim().length} more characters needed` : 'Looking good!'}
                  </p>
                  <span className="text-xs text-muted-foreground font-mono">
                    {description.length}/280
                  </span>
                </div>

                {/* Image Upload Section */}
                <div className="mt-6 pt-6 border-t-2 border-border">
                  <ImageUpload
                    image={pollImage}
                    imagePreview={imagePreview}
                    onImageChange={handleImageChange}
                    onImageRemove={handleImageRemove}
                  />
                </div>

                <button
                  onClick={handleNextStep}
                  disabled={!step1Complete}
                  className="w-full mt-6 px-6 py-3 bg-accent border-2 border-accent text-background font-bold uppercase tracking-wide hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue to Candidates
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </motion.div>
            )}

            {/* Step 2: Candidates */}
            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-card border-2 border-border p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/10 border-2 border-accent text-accent flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-bold text-foreground uppercase tracking-wide block">
                      Candidates / Options
                    </label>
                    <p className="text-xs text-muted-foreground">Add at least 2 options for voters to choose from</p>
                  </div>
                  <span className={`text-sm font-bold ${candidates.length >= 2 ? 'text-accent' : 'text-muted-foreground'}`}>
                    {candidates.length}/2
                  </span>
                </div>

                {/* Add candidate input */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newCandidate}
                    onChange={(e) => setNewCandidate(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCandidate()}
                    placeholder="Enter candidate name"
                    maxLength={64}
                    autoFocus
                    className="flex-1 px-4 py-3 bg-background border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleAddCandidate}
                    disabled={!newCandidate.trim()}
                    className="px-6 py-3 bg-accent text-background font-bold uppercase tracking-wide hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {/* Draggable candidates list */}
                {candidates.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={candidates}
                    onReorder={handleReorder}
                    className="space-y-2 mb-4"
                  >
                    {candidates.map((candidate, index) => (
                      <Reorder.Item
                        key={candidate.id}
                        value={candidate}
                        className="bg-background border-2 border-border p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-muted-foreground">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <div className="w-8 h-8 bg-accent text-background flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="flex-1 font-medium text-foreground">{candidate.name}</span>
                        <button
                          onClick={() => handleRemoveCandidate(candidate.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="border-2 border-dashed border-border p-8 text-center mb-4">
                    <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-muted-foreground text-sm">
                      No candidates yet. Add your first one above.
                    </p>
                  </div>
                )}

                {candidates.length === 1 && (
                  <p className="text-xs text-yellow-500 mb-4 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Add one more candidate to continue
                  </p>
                )}

                <button
                  onClick={handleNextStep}
                  disabled={!step2Complete}
                  className="w-full px-6 py-3 bg-accent border-2 border-accent text-background font-bold uppercase tracking-wide hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue to Schedule
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </motion.div>
            )}

            {/* Step 3: Schedule */}
            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-card border-2 border-border p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/10 border-2 border-accent text-accent flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground uppercase tracking-wide block">
                      Schedule Your Poll
                    </label>
                    <p className="text-xs text-muted-foreground">Set when voting starts and ends</p>
                  </div>
                </div>

                <DateRangeSelector
                  startDate={startDate}
                  endDate={endDate}
                  onStartChange={setStartDate}
                  onEndChange={setEndDate}
                />

                {/* Credits Per Vote */}
                <div className="mt-6 pt-6 border-t-2 border-border space-y-4">
                  <div>
                    <label className="text-sm font-bold text-foreground uppercase tracking-wide block mb-2">
                      Credits Per Vote
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      How many credits will voters need to cast a vote?
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={creditsPerVote}
                      onChange={(e) => setCreditsPerVote(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-32 px-4 py-3 bg-background border-2 border-border text-foreground text-center text-lg font-bold focus:outline-none focus:border-accent"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        Voters will spend <span className="font-bold text-accent">{creditsPerVote} credits</span> per vote
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Higher costs may reduce spam but lower participation
                      </p>
                    </div>
                  </div>
                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 20, 50].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setCreditsPerVote(preset)}
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wide border-2 transition-colors ${
                          creditsPerVote === preset
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-muted-foreground hover:border-accent/50 hover:text-accent'
                        }`}
                      >
                        {preset} credits
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !allComplete}
                  className="w-full mt-6 px-6 py-4 bg-accent border-2 border-accent text-background font-bold uppercase tracking-wide text-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-background border-t-transparent rounded-full" />
                      <span>Creating Poll...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Create Poll</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear Form Button - Bottom */}
          {(description || candidates.length > 0) && (
            <button
              onClick={handleClearForm}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground border-2 border-dashed border-border hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear Form & Start Over</span>
            </button>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <LivePreview
            description={description}
            candidates={candidates}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </motion.div>
  )
}

// Main Component
export default function CreatePollFeature() {
  const { authenticated } = usePrivy()
  const { cluster } = useCluster()
  const {
    publicKey: walletPublicKey,
    solanaWallet,
    signAndSendTransaction,
    connection,
  } = usePrivyAnchorProvider()

  const router = useRouter()
  const [mode, setMode] = useState<CreationMode>('select')
  const [pendingDetails, setPendingDetails] = useState<PollDetails | undefined>()
  const [pendingCandidates, setPendingCandidates] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [finalDetails, setFinalDetails] = useState<PollDetails | null>(null)
  const [finalCandidates, setFinalCandidates] = useState<string[]>([])
  const [finalImage, setFinalImage] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showInsufficientCredits, setShowInsufficientCredits] = useState(false)
  const programId = getVotingapplicationProgramId(cluster.network as any)

  // Get user credits
  const { data: userCredits } = useUserCredits()
  const currentBalance = userCredits?.balance || 0

  const handleTemplateSelect = (template: typeof POLL_TEMPLATES[0]) => {
    const now = new Date()
    const startDate = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    const endDate = new Date(startDate.getTime() + template.duration * 1000)

    setPendingDetails({
      pollId: Math.floor(Math.random() * 900000) + 100000,
      description: template.defaultDescription,
      pollStart: Math.floor(startDate.getTime() / 1000),
      pollEnd: Math.floor(endDate.getTime() / 1000),
      creditsPerVote: 10,
    })
    setPendingCandidates(template.suggestedCandidates)
    setMode('canvas')
  }

  const handleAIGenerate = (details: PollDetails, candidates: string[]) => {
    setPendingDetails(details)
    setPendingCandidates(candidates)
    setMode('canvas')
  }

  const handleCanvasSubmit = (details: PollDetails, candidates: string[], image: File | null) => {
    setFinalDetails(details)
    setFinalCandidates(candidates)
    setFinalImage(image)
    setShowConfirmation(true)
  }

  const handleConfirmCreate = async () => {
    if (!finalDetails || !walletPublicKey) return

    setShowConfirmation(false)
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // ✅ STEP 1: Check and deduct credits FIRST
      toast.loading('Checking credit balance...', { id: 'credits-check' })

      const balanceResponse = await fetch(
        `/api/credits/balance?wallet=${walletPublicKey.toString()}`
      )
      const { balance } = await balanceResponse.json()

      if (balance < 2) {
        toast.dismiss('credits-check')
        setShowInsufficientCredits(true)
        setIsSubmitting(false)
        return
      }

      toast.dismiss('credits-check')
      toast.loading('Deducting 2 credits...', { id: 'deduct-credits' })

      // Deduct 2 credits via internal transfer
      const deductResponse = await fetch('/api/credits/deduct-poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletPublicKey.toString(),
          pollId: finalDetails.pollId,
          pollDescription: finalDetails.description
        })
      })

      if (!deductResponse.ok) {
        const error = await deductResponse.json()
        throw new Error(error.error || 'Failed to deduct credits')
      }

      const { newBalance } = await deductResponse.json()
      toast.dismiss('deduct-credits')
      toast.success(`Credits deducted! New balance: ${newBalance}`)

      // ✅ STEP 2: Now proceed with on-chain poll creation
      toast.loading('Creating poll on-chain...', { id: 'on-chain' })

      // Build poll initialization instruction
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(finalDetails.pollId).toArray('le', 8))],
        programId
      )

      const initPollDiscriminator = Buffer.from([193, 22, 99, 197, 18, 33, 115, 117])
      const pollIdBytes = Buffer.from(new BN(finalDetails.pollId).toArray('le', 8))
      const descriptionBytes = Buffer.from(finalDetails.description, 'utf8')
      const descriptionLen = Buffer.alloc(4)
      descriptionLen.writeUInt32LE(descriptionBytes.length, 0)
      const pollStartBytes = Buffer.from(new BN(finalDetails.pollStart).toArray('le', 8))
      const pollEndBytes = Buffer.from(new BN(finalDetails.pollEnd).toArray('le', 8))
      const initPollData = Buffer.concat([initPollDiscriminator, pollIdBytes, descriptionLen, descriptionBytes, pollStartBytes, pollEndBytes])

      const initializePollIx = new TransactionInstruction({
        keys: [
          { pubkey: walletPublicKey, isSigner: true, isWritable: true },
          { pubkey: pollPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: initPollData,
      })

      const instructions: TransactionInstruction[] = [initializePollIx]

      // Add candidate instructions
      const initCandidateDiscriminator = Buffer.from([210, 107, 118, 204, 255, 97, 112, 26])

      for (const candidate of finalCandidates) {
        const [candidatePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(new BN(finalDetails.pollId).toArray('le', 8)),
            Buffer.from(candidate)
          ],
          programId
        )

        const candidateNameBytes = Buffer.from(candidate, 'utf8')
        const candidateNameLen = Buffer.alloc(4)
        candidateNameLen.writeUInt32LE(candidateNameBytes.length, 0)
        const initCandidateData = Buffer.concat([initCandidateDiscriminator, candidateNameLen, candidateNameBytes, pollIdBytes])

        const initializeCandidateIx = new TransactionInstruction({
          keys: [
            { pubkey: walletPublicKey, isSigner: true, isWritable: true },
            { pubkey: pollPda, isSigner: false, isWritable: true },
            { pubkey: candidatePda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: programId,
          data: initCandidateData,
        })

        instructions.push(initializeCandidateIx)
      }

      const { blockhash } = await connection.getLatestBlockhash('confirmed')

      const messageV0 = new TransactionMessage({
        payerKey: walletPublicKey,
        recentBlockhash: blockhash,
        instructions: instructions,
      }).compileToV0Message()

      const versionedTransaction = new VersionedTransaction(messageV0)

      await signAndSendTransaction(versionedTransaction)

      toast.dismiss('on-chain')
      toast.success('Poll created on-chain!')

      // Upload image and save metadata to Supabase
      let imageUrl: string | null = null
      if (finalImage) {
        toast.loading('Uploading poll image...', { id: 'upload-image' })
        const uploadResult = await uploadPollImage(finalDetails.pollId, finalImage)
        if (uploadResult.url) {
          imageUrl = uploadResult.url
          toast.dismiss('upload-image')
        } else {
          toast.dismiss('upload-image')
          console.warn('Failed to upload image:', uploadResult.error)
        }
      }

      // Save poll metadata to Supabase with creditsPerVote
      await createPollMetadata(
        finalDetails.pollId,
        walletPublicKey.toString(),
        imageUrl,
        finalDetails.creditsPerVote
      )

      toast.success('Poll created successfully!')
      await new Promise(resolve => setTimeout(resolve, 2000))
      router.push('/voting')
    } catch (error: any) {
      // Refund credits if on-chain transaction failed
      if (error.message && !error.message.includes('Insufficient credits')) {
        toast.loading('Refunding credits...', { id: 'refund' })
        try {
          await fetch('/api/credits/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: walletPublicKey?.toString(),
              amount: 2,
              reason: 'Poll creation failed'
            })
          })
          toast.dismiss('refund')
          toast.success('Credits refunded')
        } catch (refundError) {
          console.error('Failed to refund credits:', refundError)
          toast.dismiss('refund')
        }
      }

      console.error('Error creating poll:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      if (errorMsg.includes('already in use')) {
        setErrorMessage(`This poll ID is already taken. Please try again.`)
        setIsSubmitting(false)
        return
      } else if (errorMsg.includes('already been processed')) {
        toast.success('Poll created successfully!')
        router.push('/voting')
        return
      }

      setErrorMessage(`Failed to create poll: ${errorMsg}`)
      toast.error('Failed to create poll')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Unauthenticated state
  if (!authenticated || !solanaWallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-card border-2 border-border p-12 text-center">
            <h1 className="brutalist-title text-5xl text-foreground mb-6">
              CREATE
              <br />
              <span className="text-stroke">POLL</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Connect your wallet to create a new poll on the Solana blockchain.
            </p>
            <div className="mb-6">
              <PrivyWalletButton />
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              SECURE • TRANSPARENT • ON-CHAIN
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmCreate}
        isLoading={isSubmitting}
        title="Create Poll & Add Candidates?"
        message={
          <div className="space-y-4">
            {/* Poll Details */}
            <div className="bg-background border-2 border-border p-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Poll Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">ID</span>
                  <span className="text-foreground font-mono text-sm">{finalDetails?.pollId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Description</span>
                  <span className="text-foreground text-sm text-right max-w-[200px] truncate">{finalDetails?.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Start</span>
                  <span className="text-foreground font-mono text-xs">{finalDetails && new Date(finalDetails.pollStart * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">End</span>
                  <span className="text-foreground font-mono text-xs">{finalDetails && new Date(finalDetails.pollEnd * 1000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Poll Image */}
            {finalImage && (
              <div className="bg-background border-2 border-border p-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Poll Image</h4>
                <img
                  src={URL.createObjectURL(finalImage)}
                  alt="Poll preview"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}

            {/* Candidates */}
            <div className="bg-background border-2 border-border p-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                Candidates ({finalCandidates.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {finalCandidates.map((c, i) => (
                  <span key={i} className="px-3 py-1 bg-accent/10 text-accent border border-accent/30 text-sm font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border-2 border-yellow-500/40 p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-foreground">
                  <strong className="text-yellow-500">Permanent Action:</strong> Poll and candidates cannot be edited or deleted after creation.
                </p>
              </div>
            </div>
          </div>
        }
        confirmText="Create Poll"
        cancelText="Review Again"
      />

      <div className="min-h-screen bg-background py-8 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="brutalist-title text-4xl md:text-5xl text-foreground mb-2">
              CREATE POLL
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              {mode === 'select' && 'Choose your creation method'}
              {mode === 'templates' && 'Select a template'}
              {mode === 'ai' && 'AI-powered poll creation'}
              {mode === 'canvas' && 'Visual poll builder'}
            </p>
          </motion.div>

          {/* Credit Balance Display */}
          <div className="flex justify-end mb-4">
            <CreditBalanceDisplay />
          </div>

          {/* Insufficient Credits Warning */}
          {showInsufficientCredits && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <InsufficientCreditsWarning
                required={2}
                current={currentBalance}
                action="create a poll"
                onPurchase={() => setShowInsufficientCredits(false)}
              />
            </motion.div>
          )}

          {/* Error Message */}
          {errorMessage && !showInsufficientCredits && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border-2 border-destructive text-destructive p-4 text-sm mb-6"
            >
              {errorMessage}
            </motion.div>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            {mode === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ModeSelector onSelect={setMode} />
              </motion.div>
            )}

            {mode === 'templates' && (
              <TemplateGallery
                onSelect={handleTemplateSelect}
                onBack={() => setMode('select')}
              />
            )}

            {mode === 'ai' && (
              <AIAssistant
                onGenerate={handleAIGenerate}
                onBack={() => setMode('select')}
              />
            )}

            {mode === 'canvas' && (
              <InteractiveCanvas
                initialDetails={pendingDetails}
                initialCandidates={pendingCandidates}
                onSubmit={handleCanvasSubmit}
                onBack={() => {
                  setPendingDetails(undefined)
                  setPendingCandidates([])
                  setMode('select')
                }}
                isSubmitting={isSubmitting}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
