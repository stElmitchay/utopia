'use client'

import { useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Candidate {
  id: string
  name: string
}

interface PollData {
  pollId: string
  description: string
  imageUrl: string
  pollStart: string
  pollEnd: string
  candidates: Candidate[]
}

export function CreatePollWizard({ onPollCreated }: { onPollCreated?: (details: any) => void }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [pollData, setPollData] = useState<PollData>({
    pollId: '',
    description: '',
    imageUrl: '',
    pollStart: '',
    pollEnd: '',
    candidates: []
  })
  const [newCandidateName, setNewCandidateName] = useState('')

  const steps = [
    { number: 1, title: 'Poll Details', desc: 'Basic information' },
    { number: 2, title: 'Schedule', desc: 'Start and end times' },
    { number: 3, title: 'Candidates', desc: 'Add and arrange' },
    { number: 4, title: 'Review', desc: 'Preview and publish' }
  ]

  const handleAddCandidate = () => {
    if (!newCandidateName.trim()) {
      toast.error('Please enter a candidate name')
      return
    }

    if (pollData.candidates.some(c => c.name.toLowerCase() === newCandidateName.trim().toLowerCase())) {
      toast.error('Candidate already exists')
      return
    }

    setPollData({
      ...pollData,
      candidates: [...pollData.candidates, { id: Date.now().toString(), name: newCandidateName.trim() }]
    })
    setNewCandidateName('')
  }

  const handleRemoveCandidate = (id: string) => {
    setPollData({
      ...pollData,
      candidates: pollData.candidates.filter(c => c.id !== id)
    })
  }

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!pollData.pollId || !pollData.description) {
        toast.error('Please fill in all required fields')
        return
      }
    }
    if (currentStep === 2) {
      if (!pollData.pollStart || !pollData.pollEnd) {
        toast.error('Please select start and end dates')
        return
      }
      const startDate = new Date(pollData.pollStart)
      const endDate = new Date(pollData.pollEnd)
      const now = new Date()

      if (startDate < now) {
        toast.error('Start date cannot be in the past')
        return
      }
      if (endDate <= startDate) {
        toast.error('End date must be after start date')
        return
      }
    }
    if (currentStep === 3) {
      if (pollData.candidates.length < 2) {
        toast.error('Please add at least 2 candidates')
        return
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handlePublish = async () => {
    try {
      const startTimestamp = Math.floor(new Date(pollData.pollStart).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(pollData.pollEnd).getTime() / 1000)

      const pollDetails = {
        pollId: parseInt(pollData.pollId),
        description: pollData.description,
        pollStart: startTimestamp,
        pollEnd: endTimestamp,
        imageUrl: pollData.imageUrl.trim() || undefined,
        candidates: pollData.candidates.map(c => c.name)
      }

      if (onPollCreated) {
        onPollCreated(pollDetails)
      }

      toast.success('Poll created! Redirecting to add candidates...')
      router.push(`/voting`)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create poll')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 border-2 flex items-center justify-center font-bold text-xl ${
                    currentStep >= step.number
                      ? 'bg-accent border-accent text-background'
                      : 'bg-card border-border text-muted-foreground'
                  }`}>
                    {step.number}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-bold uppercase tracking-wide ${
                      currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{step.desc}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-accent' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Step 1: Poll Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-bold text-foreground uppercase tracking-wide brutalist-title mb-2">
                    Poll Details
                  </h2>
                  <p className="text-muted-foreground font-mono">What&apos;s your poll about?</p>
                </div>

                <div className="space-y-6 bg-card border-2 border-border p-6">
                  <div>
                    <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                      Poll ID *
                    </label>
                    <input
                      type="number"
                      placeholder="Enter a unique number (e.g., 123)"
                      className="w-full px-4 py-3 bg-background border-2 border-border text-foreground font-mono focus:outline-none focus:border-accent transition-colors"
                      value={pollData.pollId}
                      onChange={(e) => setPollData({ ...pollData, pollId: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground font-mono">Must be unique across all polls</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                      Poll Question *
                    </label>
                    <textarea
                      placeholder="What do you want people to vote on?"
                      className="w-full px-4 py-3 bg-background border-2 border-border text-foreground font-mono focus:outline-none focus:border-accent transition-colors resize-none"
                      rows={4}
                      maxLength={280}
                      value={pollData.description}
                      onChange={(e) => setPollData({ ...pollData, description: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground font-mono text-right">
                      {pollData.description.length}/280 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                      Poll Image (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-3 bg-background border-2 border-border text-foreground font-mono focus:outline-none focus:border-accent transition-colors"
                      value={pollData.imageUrl}
                      onChange={(e) => setPollData({ ...pollData, imageUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Schedule */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-bold text-foreground uppercase tracking-wide brutalist-title mb-2">
                    Schedule
                  </h2>
                  <p className="text-muted-foreground font-mono">When should voting take place?</p>
                </div>

                <div className="space-y-6 bg-card border-2 border-border p-6">
                  <div className="bg-yellow-500/10 border-2 border-yellow-500 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-bold text-yellow-500 uppercase tracking-wide mb-1">Important</p>
                        <p className="text-xs text-foreground font-mono">
                          You must add all candidates before the start time. Candidates cannot be added after voting begins.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full px-4 py-3 bg-background border-2 border-border text-foreground font-mono focus:outline-none focus:border-accent transition-colors"
                        value={pollData.pollStart}
                        onChange={(e) => setPollData({ ...pollData, pollStart: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                        End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full px-4 py-3 bg-background border-2 border-border text-foreground font-mono focus:outline-none focus:border-accent transition-colors"
                        value={pollData.pollEnd}
                        onChange={(e) => setPollData({ ...pollData, pollEnd: e.target.value })}
                      />
                    </div>
                  </div>

                  {pollData.pollStart && pollData.pollEnd && (
                    <div className="bg-muted/20 border-2 border-border p-4">
                      <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">Duration</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {(() => {
                          const start = new Date(pollData.pollStart)
                          const end = new Date(pollData.pollEnd)
                          const diff = end.getTime() - start.getTime()
                          const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                          return `${days > 0 ? `${days} days, ` : ''}${hours} hours`
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Candidates with Drag & Drop */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-bold text-foreground uppercase tracking-wide brutalist-title mb-2">
                    Candidates
                  </h2>
                  <p className="text-muted-foreground font-mono">Who should people vote for? Drag to reorder.</p>
                </div>

                <div className="space-y-6">
                  {/* Add Candidate Input */}
                  <div className="bg-card border-2 border-border p-6">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Enter candidate name"
                        className="flex-1 px-4 py-3 bg-background border-2 border-border text-foreground font-mono focus:outline-none focus:border-accent transition-colors"
                        value={newCandidateName}
                        onChange={(e) => setNewCandidateName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCandidate()}
                        maxLength={64}
                      />
                      <button
                        onClick={handleAddCandidate}
                        className="px-6 py-3 bg-accent text-background border-2 border-accent font-bold uppercase tracking-wide hover:bg-accent/90 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground font-mono">
                      {pollData.candidates.length} candidates added (minimum 2 required)
                    </p>
                  </div>

                  {/* Drag & Drop List */}
                  {pollData.candidates.length > 0 && (
                    <div className="bg-card border-2 border-border p-6">
                      <Reorder.Group
                        axis="y"
                        values={pollData.candidates}
                        onReorder={(newOrder) => setPollData({ ...pollData, candidates: newOrder })}
                        className="space-y-3"
                      >
                        {pollData.candidates.map((candidate, index) => (
                          <Reorder.Item
                            key={candidate.id}
                            value={candidate}
                            className="bg-background border-2 border-border p-4 cursor-move hover:border-accent transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center">
                                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-mono font-bold">
                                    Candidate {index + 1}
                                  </p>
                                  <p className="text-lg font-bold text-foreground">{candidate.name}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveCandidate(candidate.id)}
                                className="px-4 py-2 border-2 border-red-500 text-red-500 font-bold uppercase tracking-wide hover:bg-red-500/10 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  )}

                  {pollData.candidates.length === 0 && (
                    <div className="bg-muted/20 border-2 border-dashed border-border p-12 text-center">
                      <p className="text-muted-foreground font-mono">No candidates added yet. Add at least 2 to continue.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-bold text-foreground uppercase tracking-wide brutalist-title mb-2">
                    Review & Publish
                  </h2>
                  <p className="text-muted-foreground font-mono">Review your poll before publishing</p>
                </div>

                <div className="space-y-4">
                  {/* Poll Preview */}
                  <div className="bg-card border-2 border-border p-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">Poll Preview</h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">Question</p>
                        <p className="text-lg font-bold text-foreground">{pollData.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">Poll ID</p>
                          <p className="text-foreground font-mono">#{pollData.pollId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">Candidates</p>
                          <p className="text-foreground font-mono">{pollData.candidates.length}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">Voting Period</p>
                        <div className="text-xs text-foreground font-mono space-y-1">
                          <p>Start: {new Date(pollData.pollStart).toLocaleString()}</p>
                          <p>End: {new Date(pollData.pollEnd).toLocaleString()}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">Candidates</p>
                        <div className="space-y-2">
                          {pollData.candidates.map((candidate, index) => (
                            <div key={candidate.id} className="bg-background border-2 border-border p-3">
                              <p className="text-sm font-bold text-foreground">{index + 1}. {candidate.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-red-500/10 border-2 border-red-500 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-bold text-red-500 uppercase tracking-wide mb-1">Important Reminder</p>
                        <p className="text-xs text-foreground font-mono">
                          Once published, this poll cannot be edited or deleted. Make sure all information is correct before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="px-6 py-3 border-2 border-border text-foreground font-bold uppercase tracking-wide hover:border-accent transition-colors"
                >
                  ← Back
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-accent text-background border-2 border-accent font-bold uppercase tracking-wide hover:bg-accent/90 transition-colors"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  className="flex-1 px-6 py-3 bg-accent text-background border-2 border-accent font-bold uppercase tracking-wide hover:bg-accent/90 transition-colors"
                >
                  🚀 Publish Poll
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
