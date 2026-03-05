import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ContactData, RevealContactResponse } from '../../shared/types'

function ContactField({ label, value }: { label: string; value: string }) {
  const isEmail = label.toLowerCase() === 'email'
  const isLink = value.startsWith('http') || label.toLowerCase() === 'linkedin'

  return (
    <p>
      <span className="text-text-muted text-sm">{label}: </span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="text-accent hover:underline">{value}</a>
      ) : isLink ? (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{value}</a>
      ) : (
        <span className="text-text-primary">{value}</span>
      )}
    </p>
  )
}

function ContactFields({ data }: { data: Record<string, string> }) {
  const order = ['location', 'email', 'phone', 'linkedin']
  const sorted = [
    ...order.filter((k) => data[k]),
    ...Object.keys(data).filter((k) => !order.includes(k)),
  ]

  return (
    <div className="space-y-3">
      {sorted.map((key) => (
        <ContactField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={data[key]} />
      ))}
    </div>
  )
}

export default function Contact({ contact }: { contact: ContactData }) {
  const [passcode, setPasscode] = useState('')
  const [revealed, setRevealed] = useState<RevealContactResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Plain contact — show directly
  if (!contact.encrypted) {
    const data = contact.data as Record<string, string>
    if (!data || Object.keys(data).length === 0) return null

    return (
      <div className="text-center">
        <h2 className="text-3xl font-semibold mb-8 text-accent">Personal Information</h2>
        <ContactFields data={data} />
      </div>
    )
  }

  // Encrypted — no data stored
  if (!contact.data) return null

  const handleReveal = async () => {
    if (!passcode.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/reveal-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })

      if (!res.ok) {
        setError(res.status === 401 ? 'Incorrect passcode' : 'Something went wrong')
        return
      }

      setRevealed(await res.json())
    } catch {
      setError('Unable to connect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-center">
      <h2 className="text-3xl font-semibold mb-8 text-accent">Personal Information</h2>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-sm mx-auto"
          >
            <div className="flex gap-2">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReveal()}
                placeholder="Passcode"
                className="flex-1 px-4 py-2.5 rounded-lg glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-glow transition-colors"
              />
              <button
                onClick={handleReveal}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                {loading ? '...' : 'Reveal'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ContactFields data={revealed as Record<string, string>} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
