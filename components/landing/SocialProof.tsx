export function SocialProof() {
  const companies = [
    "Acme Corp",
    "TechFlow",
    "DataSafe",
    "CloudOps",
    "SecureNet",
  ];

  return (
    <section className="py-16 border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-xs text-gray-400 uppercase tracking-wider mb-8">
          Trusted by engineering and security teams
        </p>
        <div className="flex items-center justify-center gap-x-12 gap-y-8 flex-wrap">
          {companies.map((company, index) => (
            <div
              key={index}
              className="text-gray-300 font-medium text-lg tracking-tight"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
