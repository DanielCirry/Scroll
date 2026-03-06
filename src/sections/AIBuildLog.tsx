export default function AIBuildLog() {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-8 text-accent">
        AI Build Log
      </h2>
      <div className="p-6 rounded-xl glass">
        <p className="text-text-secondary leading-relaxed">
          This site was built by parsing a CV document, pulling out each section automatically,
          and turning it all into the interactive portfolio you're looking at now.
          Powered by React, TypeScript, Tailwind CSS, and Azure.
        </p>
      </div>
    </div>
  )
}
