import { motion } from 'framer-motion'
import type { EducationEntry } from '../../shared/types'

export default function Education({ title, entries }: { title: string; entries: EducationEntry[] }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-10 text-accent">{title}</h2>
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <motion.div
            key={`${entry.degree}-${entry.year}`}
            className="p-5 rounded-xl glass glass-hover transition-colors"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <h3 className="text-lg font-semibold">{entry.degree}</h3>
            {entry.institution && (
              <p className="text-sm text-text-muted">{entry.institution}</p>
            )}
            {entry.year && (
              <p className="text-xs text-accent mt-1">{entry.year}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
