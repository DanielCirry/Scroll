import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TERMINAL_LINES = [
  { text: '> Parsing CV...', delay: 0, checkDelay: 800 },
  { text: '> Detecting sections...', delay: 1000, checkDelay: 1200 },
  { text: '> Extracting content...', delay: 2400, checkDelay: 800 },
  { text: '> Building portfolio...', delay: 3400, checkDelay: 1000 },
]

const SECTION_POOL = [
  'Hero', 'About', 'Profile', 'Summary', 'Skills', 'Experience',
  'Education', 'Projects', 'Certifications', 'Languages',
  'Interests', 'References', 'Contact', 'Publications',
]

function pickRandom(count: number) {
  const shuffled = [...SECTION_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

interface SeedingAnimationProps {
  onComplete: () => void
}

export default function SeedingAnimation({ onComplete }: SeedingAnimationProps) {
  const [phase, setPhase] = useState<'terminal' | 'blueprint' | 'reveal' | 'done'>('terminal')
  const [visibleLines, setVisibleLines] = useState<number[]>([])
  const [checkedLines, setCheckedLines] = useState<number[]>([])

  const labels = useMemo(() => pickRandom(5 + Math.floor(Math.random() * 4)), [])

  useEffect(() => {
    TERMINAL_LINES.forEach((line, i) => {
      setTimeout(() => setVisibleLines((prev) => [...prev, i]), line.delay)
      setTimeout(() => setCheckedLines((prev) => [...prev, i]), line.delay + line.checkDelay)
    })

    const totalTerminal = 3400 + 1000 + 400
    setTimeout(() => setPhase('blueprint'), totalTerminal)
    setTimeout(() => setPhase('reveal'), totalTerminal + 2000)
    setTimeout(() => setPhase('done'), totalTerminal + 4000)
  }, [])

  useEffect(() => {
    if (phase === 'done') onComplete()
  }, [phase, onComplete])

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[100] bg-bg flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <button
            onClick={onComplete}
            className="absolute top-6 right-6 text-text-muted text-sm hover:text-text-primary transition-colors"
          >
            Skip
          </button>

          {phase === 'terminal' && (
            <div className="font-mono text-sm max-w-md w-full px-6">
              {TERMINAL_LINES.map((line, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 mb-2"
                  initial={{ opacity: 0 }}
                  animate={visibleLines.includes(i) ? { opacity: 1 } : {}}
                  transition={{ duration: 0.1 }}
                >
                  <span className="text-text-secondary">{line.text}</span>
                  {checkedLines.includes(i) && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-accent"
                    >
                      ✓
                    </motion.span>
                  )}
                  {visibleLines.includes(i) && !checkedLines.includes(i) && (
                    <span className="inline-block w-2 h-4 bg-accent animate-pulse" />
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {phase === 'blueprint' && (
            <div className="max-w-xs w-full px-6 space-y-3">
              {labels.map((name, i) => (
                <motion.div
                  key={name}
                  className="h-10 rounded-lg border border-border-glow flex items-center px-4"
                  initial={{ opacity: 0, scaleX: 0.3 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.4, ease: 'easeOut' }}
                >
                  <span className="text-xs text-accent font-mono">{name}</span>
                </motion.div>
              ))}
            </div>
          )}

          {phase === 'reveal' && (
            <div className="max-w-xs w-full px-6 space-y-3">
              {labels.map((name, i) => (
                <motion.div
                  key={name}
                  className="h-10 rounded-lg flex items-center px-4 bg-accent-dim border border-border-glow"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                >
                  <motion.span
                    className="text-xs text-text-primary font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.12 + 0.2 }}
                  >
                    {name}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
