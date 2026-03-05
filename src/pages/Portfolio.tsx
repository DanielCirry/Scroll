import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { PortfolioData } from '../../shared/types'
import { sampleData } from '../lib/sampleData'
import SideNav from '../components/SideNav'
import Section from '../components/Section'
import GradientDivider from '../components/GradientDivider'
import SeedingAnimation from '../components/SeedingAnimation'
import Hero from '../sections/Hero'
import About from '../sections/About'
import Skills from '../sections/Skills'
import Experience from '../sections/Experience'
import Education from '../sections/Education'
import Projects from '../sections/Projects'
import AIBuildLog from '../sections/AIBuildLog'
import Contact from '../sections/Contact'
import Other from '../sections/Other'
import { useActiveSection } from '../hooks/useActiveSection'

function buildSections(portfolio: PortfolioData) {
  const h = portfolio.meta.sectionHeadings || {}
  const sections: { id: string; label: string }[] = [{ id: 'hero', label: 'Home' }]

  if (portfolio.profile?.summary) sections.push({ id: 'about', label: h.profile || 'About' })
  if (portfolio.skills?.length) sections.push({ id: 'skills', label: h.skills || 'Skills' })
  if (portfolio.experience?.length) sections.push({ id: 'experience', label: h.experience || 'Experience' })
  if (portfolio.education?.length) sections.push({ id: 'education', label: h.education || 'Education' })
  if (portfolio.projects?.length) sections.push({ id: 'projects', label: h.projects || 'Projects' })

  portfolio.other?.forEach((s) => {
    const id = 'other-' + s.heading.toLowerCase().replace(/\s+/g, '-')
    sections.push({ id, label: s.heading })
  })

  sections.push({ id: 'ai-log', label: 'AI Build Log' })
  sections.push({ id: 'contact', label: 'Personal Info' })

  return sections
}

export default function Portfolio() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [showSeeding, setShowSeeding] = useState(searchParams.get('seeding') === 'true')

  const portfolio = data ?? sampleData
  const h = portfolio.meta.sectionHeadings || {}
  const sections = useMemo(() => buildSections(portfolio), [portfolio])
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections])
  const active = useActiveSection(sectionIds)

  useEffect(() => {
    const saved = localStorage.getItem('portfolio-accent')
    if (saved && /^#[0-9a-fA-F]{6}$/.test(saved)) {
      document.documentElement.style.setProperty('--color-accent', saved)
      document.documentElement.style.setProperty('--color-accent-dim', saved + '26')
      document.documentElement.style.setProperty('--color-border-glow', saved + '33')
    }
  }, [])

  useEffect(() => {
    fetch('/api/data')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const handleSeedingComplete = useCallback(() => setShowSeeding(false), [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {showSeeding && <SeedingAnimation onComplete={handleSeedingComplete} />}
      <Link
        to="/upload"
        className="fixed top-4 left-4 z-50 px-3 py-1.5 text-xs rounded-lg glass glass-hover text-text-muted hover:text-text-primary transition-colors"
      >
        Upload CV
      </Link>
      <SideNav sections={sections} active={active} />

      <main>
        <Section id="hero">
          <Hero meta={portfolio.meta} />
        </Section>

        {portfolio.profile?.summary && (
          <>
            <GradientDivider />
            <Section id="about">
              <About title={h.profile || 'About'} summary={portfolio.profile.summary} />
            </Section>
          </>
        )}

        {portfolio.skills?.length > 0 && (
          <>
            <GradientDivider />
            <Section id="skills">
              <Skills title={h.skills || 'Skills'} skills={portfolio.skills} />
            </Section>
          </>
        )}

        {portfolio.experience?.length > 0 && (
          <>
            <GradientDivider />
            <Section id="experience">
              <Experience title={h.experience || 'Experience'} entries={portfolio.experience} />
            </Section>
          </>
        )}

        {portfolio.education?.length > 0 && (
          <>
            <GradientDivider />
            <Section id="education">
              <Education title={h.education || 'Education'} entries={portfolio.education} />
            </Section>
          </>
        )}

        {portfolio.projects?.length > 0 && (
          <>
            <GradientDivider />
            <Section id="projects">
              <Projects title={h.projects || 'Projects'} projects={portfolio.projects} />
            </Section>
          </>
        )}

        {portfolio.other?.map((s) => {
          const id = 'other-' + s.heading.toLowerCase().replace(/\s+/g, '-')
          return (
            <div key={id}>
              <GradientDivider />
              <Section id={id}>
                <Other section={s} />
              </Section>
            </div>
          )
        })}

        <GradientDivider />
        <Section id="ai-log">
          <AIBuildLog />
        </Section>

        <GradientDivider />
        <Section id="contact">
          <Contact contact={portfolio.contact} />
        </Section>
      </main>
    </>
  )
}
