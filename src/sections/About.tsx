export default function About({ title, summary }: { title: string; summary: string }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-8 text-accent">
        {title}
      </h2>
      <p className="text-lg text-text-secondary leading-relaxed max-w-3xl">
        {summary}
      </p>
    </div>
  )
}
