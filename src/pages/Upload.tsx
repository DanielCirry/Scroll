import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PortfolioData } from '../../shared/types'

const ACCENT_COLORS = [
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
]

export default function Upload() {
  const [adminPassword, setAdminPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authStatus, setAuthStatus] = useState({ hasAdminPassword: false, hasContactPasscode: false })
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [editJson, setEditJson] = useState('')
  const [editStatus, setEditStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [accent, setAccent] = useState(() => localStorage.getItem('portfolio-accent') || '#06b6d4')
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/auth-status').then(r => r.json()).then(setAuthStatus).catch(() => {})
    fetch('/api/data').then(r => r.ok ? r.json() : null).then(setPortfolio).catch(() => null)
  }, [])

  // If no admin password is set, user is automatically authenticated
  useEffect(() => {
    if (!authStatus.hasAdminPassword) setAuthenticated(true)
  }, [authStatus])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accent)
    document.documentElement.style.setProperty('--color-accent-dim', accent + '26')
    document.documentElement.style.setProperty('--color-border-glow', accent + '33')
    localStorage.setItem('portfolio-accent', accent)
  }, [accent])

  const handleLogin = async () => {
    // Try an edit call to verify password
    const res = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword, data: {} }),
    })
    if (res.ok) {
      setAuthenticated(true)
      setErrorMsg('')
    } else {
      setErrorMsg('Incorrect admin password')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setStatus('uploading')
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', file)
    if (adminPassword) formData.append('adminPassword', adminPassword)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        setErrorMsg(res.status === 401 ? 'Invalid admin password' : 'Upload failed')
        setStatus('error')
        return
      }
      setStatus('success')
      setTimeout(() => navigate('/?seeding=true'), 1500)
    } catch {
      setErrorMsg('Unable to connect')
      setStatus('error')
    }
  }

  const handleEdit = (section: string) => {
    if (!portfolio) return
    setEditSection(section)
    setEditJson(JSON.stringify((portfolio as any)[section], null, 2))
    setEditStatus('idle')
  }

  const handleSaveEdit = async () => {
    if (!editSection) return
    setEditStatus('saving')
    try {
      const parsed = JSON.parse(editJson)
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, data: { [editSection]: parsed } }),
      })
      if (!res.ok) { setEditStatus('error'); return }
      setPortfolio(prev => prev ? { ...prev, [editSection]: parsed } : prev)
      setEditStatus('saved')
      setTimeout(() => setEditSection(null), 1000)
    } catch {
      setEditStatus('error')
    }
  }

  // Security settings
  const [secAdminPw, setSecAdminPw] = useState('')
  const [secAdminCurrent, setSecAdminCurrent] = useState('')
  const [secPasscode, setSecPasscode] = useState('')
  const [secAdminStatus, setSecAdminStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [secPasscodeStatus, setSecPasscodeStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showSecAdmin, setShowSecAdmin] = useState(false)
  const [showSecPasscode, setShowSecPasscode] = useState(false)

  const handleSetAdminPassword = async () => {
    setSecAdminStatus('saving')
    try {
      const res = await fetch('/api/set-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: secAdminCurrent || adminPassword, newPassword: secAdminPw }),
      })
      if (!res.ok) { setSecAdminStatus('error'); return }
      setSecAdminStatus('saved')
      if (secAdminPw) setAdminPassword(secAdminPw)
      setAuthStatus(prev => ({ ...prev, hasAdminPassword: !!secAdminPw }))
      setTimeout(() => { setShowSecAdmin(false); setSecAdminStatus('idle'); setSecAdminPw(''); setSecAdminCurrent('') }, 1500)
    } catch { setSecAdminStatus('error') }
  }

  const handleSetContactPasscode = async () => {
    setSecPasscodeStatus('saving')
    try {
      const res = await fetch('/api/set-contact-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, passcode: secPasscode }),
      })
      if (!res.ok) { setSecPasscodeStatus('error'); return }
      setSecPasscodeStatus('saved')
      setAuthStatus(prev => ({ ...prev, hasContactPasscode: !!secPasscode }))
      setTimeout(() => { setShowSecPasscode(false); setSecPasscodeStatus('idle'); setSecPasscode('') }, 1500)
    } catch { setSecPasscodeStatus('error') }
  }

  const editableSections = portfolio
    ? ['profile', 'skills', 'experience', 'education', 'projects', 'other'].filter(
        s => (portfolio as any)[s] !== undefined
      )
    : []

  // If admin password is required and not yet authenticated, show login
  if (authStatus.hasAdminPassword && !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold mb-6 text-accent">Admin Login</h1>
          <input
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Admin password"
            className="w-full px-4 py-2.5 rounded-lg glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-glow transition-colors mb-3"
          />
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-lg bg-accent text-bg font-medium hover:bg-accent/80 transition-colors"
          >
            Unlock
          </button>
          {errorMsg && <p className="mt-3 text-sm text-red-400">{errorMsg}</p>}
          <button onClick={() => navigate('/')} className="mt-6 text-sm text-text-muted hover:text-text-secondary transition-colors">
            ← Back to portfolio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-accent">Manage Portfolio</h1>
            <p className="text-text-muted text-sm mt-1">Upload a new CV or edit existing sections.</p>
          </div>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg glass glass-hover text-sm text-text-muted hover:text-text-primary transition-colors">
            ← Back
          </button>
        </div>

        {/* Upload */}
        <form onSubmit={handleSubmit} className="space-y-5 mb-12">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">CV File (.docx or .pdf)</label>
            <input ref={fileRef} type="file" accept=".docx,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full px-4 py-6 rounded-lg border-2 border-dashed border-border hover:border-accent/30 transition-colors text-center">
              {file ? <span className="text-text-primary">{file.name}</span> : <span className="text-text-muted">Click to select a .docx or .pdf file</span>}
            </button>
          </div>

          <button type="submit" disabled={status === 'uploading' || !file}
            className="w-full py-3 rounded-lg bg-accent text-bg font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
            {status === 'uploading' ? 'Processing...' : status === 'success' ? 'Done!' : 'Upload & Generate'}
          </button>

          {errorMsg && <p className="text-sm text-red-400 text-center">{errorMsg}</p>}
          {status === 'success' && <p className="text-sm text-accent text-center">Portfolio generated! Redirecting...</p>}
        </form>

        {/* Accent Colour */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Accent Colour</h2>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(c => (
              <button key={c.value} onClick={() => setAccent(c.value)} title={c.name}
                className={`w-10 h-10 rounded-full border-2 transition-all ${accent === c.value ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                style={{ backgroundColor: c.value }} />
            ))}
          </div>
        </div>

        {/* Security */}
        {portfolio && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 text-text-primary">Security</h2>
            <div className="space-y-3">
              <div>
                <button type="button" onClick={() => setShowSecAdmin(!showSecAdmin)}
                  className="text-sm text-text-secondary hover:text-accent transition-colors">
                  {showSecAdmin ? '−' : '+'} {authStatus.hasAdminPassword ? 'Change admin password' : 'Set admin password'}
                </button>
                {showSecAdmin && (
                  <div className="mt-2 space-y-2">
                    {authStatus.hasAdminPassword && (
                      <input type="password" value={secAdminCurrent} onChange={e => setSecAdminCurrent(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-glow transition-colors"
                        placeholder="Current password" />
                    )}
                    <input type="password" value={secAdminPw} onChange={e => setSecAdminPw(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-glow transition-colors"
                      placeholder="New password (leave empty to remove)" />
                    <button onClick={handleSetAdminPassword} disabled={secAdminStatus === 'saving'}
                      className="px-5 py-2 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent/80 disabled:opacity-50 transition-colors">
                      {secAdminStatus === 'saving' ? 'Saving...' : secAdminStatus === 'saved' ? 'Saved!' : secAdminStatus === 'error' ? 'Failed' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <button type="button" onClick={() => setShowSecPasscode(!showSecPasscode)}
                  className="text-sm text-text-secondary hover:text-accent transition-colors">
                  {showSecPasscode ? '−' : '+'} {authStatus.hasContactPasscode ? 'Change contact passcode' : 'Set contact passcode'}
                </button>
                {showSecPasscode && (
                  <div className="mt-2 space-y-2">
                    <input type="text" value={secPasscode} onChange={e => setSecPasscode(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-glow transition-colors"
                      placeholder="New passcode (leave empty to remove)" />
                    <button onClick={handleSetContactPasscode} disabled={secPasscodeStatus === 'saving'}
                      className="px-5 py-2 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent/80 disabled:opacity-50 transition-colors">
                      {secPasscodeStatus === 'saving' ? 'Saving...' : secPasscodeStatus === 'saved' ? 'Saved!' : secPasscodeStatus === 'error' ? 'Failed' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Sections */}
        {portfolio && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-text-primary">Edit Sections</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {editableSections.map(section => (
                <button key={section} onClick={() => handleEdit(section)}
                  className="px-4 py-3 rounded-lg glass glass-hover text-sm text-text-secondary hover:text-text-primary transition-colors capitalize">
                  {section}
                </button>
              ))}
            </div>

            {editSection && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-accent capitalize">{editSection}</h3>
                  <button onClick={() => setEditSection(null)} className="text-xs text-text-muted hover:text-text-secondary">Close</button>
                </div>
                <textarea value={editJson} onChange={e => setEditJson(e.target.value)} rows={16}
                  className="w-full px-4 py-3 rounded-lg glass text-text-primary text-xs font-mono focus:outline-none focus:border-border-glow transition-colors resize-y" />
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={handleSaveEdit} disabled={editStatus === 'saving'}
                    className="px-5 py-2 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent/80 disabled:opacity-50 transition-colors">
                    {editStatus === 'saving' ? 'Saving...' : editStatus === 'saved' ? 'Saved!' : 'Save'}
                  </button>
                  {editStatus === 'error' && <span className="text-xs text-red-400">Failed — check JSON syntax</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
