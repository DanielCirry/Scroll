import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProjectEntry } from '../../shared/types'

function hasExpandableContent(project: ProjectEntry) {
  return !!(
    project.role ||
    project.tech.length > 0 ||
    (project.highlights && project.highlights.length > 0)
  )
}

function ProjectCard({ project, index }: { project: ProjectEntry; index: number }) {
  const expandable = hasExpandableContent(project)
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      className={`rounded-xl glass glass-hover transition-colors overflow-hidden ${expandable ? 'cursor-pointer' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={expandable ? () => setExpanded(!expanded) : undefined}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            {project.link ? (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-text-primary hover:text-accent transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {project.name} <span className="text-xs text-accent">↗</span>
              </a>
            ) : (
              <h3 className="text-lg font-semibold">{project.name}</h3>
            )}
            {project.company && (
              <p className="text-xs text-accent">{project.company}</p>
            )}
          </div>
          {expandable && (
            <motion.span
              className="text-text-muted text-sm mt-1"
              animate={{ rotate: expanded ? 180 : 0 }}
            >
              ▾
            </motion.span>
          )}
        </div>
        {project.description && (
          <p className="text-sm text-text-secondary">{project.description}</p>
        )}
      </div>

      {expandable && (
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-border pt-4">
                {project.role && (
                  <p className="text-xs text-text-muted mb-3">Role: {project.role}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-xs rounded-full bg-accent-dim text-accent border border-border-glow"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {project.highlights && project.highlights.length > 0 && (
                  <ul className="space-y-1">
                    {project.highlights.map((h, j) => (
                      <li key={j} className="text-sm text-text-secondary flex gap-2">
                        <span className="text-accent shrink-0">›</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

export default function Projects({ title, projects }: { title: string; projects: ProjectEntry[] }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-10 text-accent">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((p, i) => (
          <ProjectCard key={p.name} project={p} index={i} />
        ))}
      </div>
    </div>
  )
}
