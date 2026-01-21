export function Problem() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
              The problem
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Audit prep takes weeks
            </h2>
            <ul className="space-y-4 text-gray-600 text-[15px] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-gray-300">—</span>
                Engineering teams spend weeks gathering screenshots and spreadsheets before every audit
              </li>
              <li className="flex gap-3">
                <span className="text-gray-300">—</span>
                Git history, PRs, and protection rules live in different places. Auditors want one clean package
              </li>
              <li className="flex gap-3">
                <span className="text-gray-300">—</span>
                Mapping development practices to ISO 27001 or SOC 2 controls requires deep expertise
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
              The solution
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              One-click evidence exports
            </h2>
            <ul className="space-y-4 text-gray-600 text-[15px] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-gray-300">—</span>
                Connect GitHub once. We collect commits, pull requests, reviews, and branch protection rules
              </li>
              <li className="flex gap-3">
                <span className="text-gray-300">—</span>
                Everything maps to compliance controls automatically. No manual data entry
              </li>
              <li className="flex gap-3">
                <span className="text-gray-300">—</span>
                Export audit-ready PDF reports or CSV files with one click
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
