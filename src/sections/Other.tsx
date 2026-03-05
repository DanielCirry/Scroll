import { motion } from 'framer-motion'
import type { OtherSection } from '../../shared/types'

export default function Other({ section }: { section: OtherSection }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-8 text-accent">{section.heading}</h2>
      <motion.div
        className="p-6 rounded-xl glass"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-text-secondary leading-relaxed whitespace-pre-line">{section.content}</p>
      </motion.div>
    </div>
  )
}
