import type { PortfolioData } from '../../shared/types'

export const sampleData: PortfolioData = {
  meta: {
    initials: 'J.D.',
    title: 'Software Engineer',
    generatedAt: new Date().toISOString(),
    version: 1,
  },
  profile: {
    summary:
      'Upload your CV to generate your portfolio. This is placeholder data shown when no CV has been uploaded yet.',
  },
  skills: [
    { category: 'Languages', items: ['JavaScript', 'Python', 'Java'] },
    { category: 'Frontend', items: ['React', 'Vue', 'Angular'] },
    { category: 'Backend', items: ['Node.js', 'Django', 'Spring Boot'] },
    { category: 'Data', items: ['PostgreSQL', 'MongoDB', 'Redis'] },
    { category: 'Cloud & DevOps', items: ['AWS', 'Docker', 'Kubernetes'] },
    { category: 'AI/ML', items: ['TensorFlow', 'PyTorch'] },
  ],
  experience: [
    {
      role: 'Software Engineer',
      company: 'Example Corp',
      period: '2022 – Present',
      highlights: [
        'Built and maintained web applications',
        'Collaborated with cross-functional teams',
      ],
    },
  ],
  education: [
    {
      degree: 'BSc Computer Science',
      institution: 'University',
      year: '2021',
    },
  ],
  projects: [
    {
      name: 'Sample Project',
      description: 'Upload your CV to see your real projects here.',
      tech: ['React', 'Node.js', 'PostgreSQL'],
      highlights: [],
    },
  ],
  other: [],
  contact: {
    encrypted: false,
    data: { email: 'hello@example.com' },
  },
}
