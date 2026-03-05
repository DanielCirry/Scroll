import { motion } from 'framer-motion'
import type { ExperienceEntry } from '../../shared/types'

export default function Experience({ title, entries }: { title: string; entries: ExperienceEntry[] }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-10 text-accent">
        {title}
      </h2>
      <div className="relative">
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-accent/20" />

        {entries.map((entry, i) => {
          const isLeft = i % 2 === 0
          return (
            <motion.div
              key={`${entry.company}-${entry.role}`}
              className={`relative mb-12 md:w-1/2 pl-12 md:pl-0 ${
                isLeft ? 'md:pr-12' : 'md:ml-auto md:pl-12'
              }`}
              initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="absolute left-2 md:left-auto md:right-auto top-1 w-4 h-4 rounded-full bg-accent border-2 border-bg glow-sm"
                style={isLeft ? { right: '-8px' } : { left: '-8px' }}
              />

              <div className="p-5 rounded-xl glass glass-hover transition-colors">
                <p className="text-xs text-accent font-medium mb-1">{entry.period}</p>
                <h3 className="text-lg font-semibold">{entry.role}</h3>
                <p className="text-sm text-text-muted mb-3">{entry.company}</p>
                <ul className="space-y-1.5">
                  {entry.highlights.map((h, j) => (
                    <li key={j} className="text-sm text-text-secondary flex gap-2">
                      <span className="text-accent mt-1 shrink-0">›</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
