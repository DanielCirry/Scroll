import { motion } from 'framer-motion'
import type { SkillCategory } from '../../shared/types'

export default function Skills({ title, skills }: { title: string; skills: SkillCategory[] }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-10 text-accent">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map((cat, i) => (
          <motion.div
            key={cat.category}
            className="p-5 rounded-xl glass glass-hover transition-colors"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <h3 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider">
              {cat.category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 text-sm rounded-full bg-bg-elevated text-text-secondary border border-border"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
