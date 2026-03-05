import { describe, it, expect } from 'vitest'
import { classifyHeading } from './sectionMap.js'

describe('classifyHeading', () => {
  it('exact matches', () => {
    expect(classifyHeading('Experience')).toBe('experience')
    expect(classifyHeading('Skills')).toBe('skills')
    expect(classifyHeading('Education')).toBe('education')
    expect(classifyHeading('Projects')).toBe('projects')
    expect(classifyHeading('Profile')).toBe('profile')
    expect(classifyHeading('Contact')).toBe('contact')
  })

  it('case insensitive', () => {
    expect(classifyHeading('EXPERIENCE')).toBe('experience')
    expect(classifyHeading('technical skills')).toBe('skills')
    expect(classifyHeading('Work Experience')).toBe('experience')
  })

  it('fuzzy matches', () => {
    expect(classifyHeading('Work Experiences')).toBe('experience')
    expect(classifyHeading('Other Skills')).toBe('skills')
    expect(classifyHeading('Professional Experience')).toBe('experience')
    expect(classifyHeading('Key Projects')).toBe('projects')
  })

  it('returns null for unknown headings', () => {
    expect(classifyHeading('Random Heading')).toBe(null)
    expect(classifyHeading('John Doe')).toBe(null)
  })

  it('rejects long strings (>50 chars) for fuzzy match', () => {
    const longString = 'This is a very long content line that happens to contain the word experience somewhere in it'
    expect(classifyHeading(longString)).toBe(null)
  })

  it('classifies certifications and languages', () => {
    expect(classifyHeading('Certifications')).toBe('certifications')
    expect(classifyHeading('Languages')).toBe('languages')
    expect(classifyHeading('Hobbies and Interests')).toBe('interests')
    expect(classifyHeading('References')).toBe('references')
  })
})
