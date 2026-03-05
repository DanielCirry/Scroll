import { motion } from 'framer-motion'
import type { PortfolioMeta } from '../../shared/types'

export default function Hero({ meta }: { meta: PortfolioMeta }) {
  return (
    <div className="text-center">
      <motion.div
        className="inline-block text-8xl md:text-9xl font-bold text-accent"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ textShadow: '0 0 60px rgba(6, 182, 212, 0.3)' }}
      >
        {meta.initials}
      </motion.div>

      <motion.p
        className="mt-6 text-xl md:text-2xl text-text-secondary font-light tracking-wide"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        {meta.title}
      </motion.p>

      <motion.div
        className="mt-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <button
          onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-text-muted hover:text-accent transition-colors"
          aria-label="Scroll down"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      </motion.div>
    </div>
  )
}
