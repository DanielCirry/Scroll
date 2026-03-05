import { useState, useEffect, useRef } from 'react'

export function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState(sectionIds[0])
  const rafId = useRef(0)

  useEffect(() => {
    const update = () => {
      const offset = window.innerHeight * 0.3
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i])
        if (el && el.getBoundingClientRect().top <= offset) {
          setActive(sectionIds[i])
          return
        }
      }
      setActive(sectionIds[0])
    }

    const handleScroll = () => {
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId.current)
    }
  }, [sectionIds])

  return active
}
