import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface SideNavProps {
  sections: { id: string; label: string }[]
  active: string
}

function getAccentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#06b6d4'
}

export default function SideNav({ sections, active }: SideNavProps) {
  const [accent, setAccent] = useState('#06b6d4')

  useEffect(() => {
    setAccent(getAccentColor())
    const observer = new MutationObserver(() => setAccent(getAccentColor()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1">
      {sections.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className="group relative flex items-center justify-end p-2 cursor-pointer"
          aria-label={`Go to ${label}`}
        >
          <span className="mr-3 text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {label}
          </span>
          <motion.div
            className="rounded-full pointer-events-none"
            animate={{
              width: active === id ? 12 : 8,
              height: active === id ? 12 : 8,
              backgroundColor: active === id ? accent : '#374151',
              boxShadow: active === id ? `0 0 12px ${accent}66` : 'none',
            }}
            whileHover={{ scale: 1.3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        </button>
      ))}
    </nav>
  )
}
