export default function AIBuildLog() {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-8 text-accent">
        AI Build Log
      </h2>
      <div className="p-6 rounded-xl glass">
        <p className="text-text-secondary leading-relaxed">
          This portfolio was generated from a CV document using AI-assisted development.
          The system parses DOCX files, intelligently detects and normalizes sections,
          and renders them into this interactive site. Built with React, TypeScript,
          Tailwind CSS, and Azure serverless functions.
        </p>
      </div>
    </div>
  )
}
