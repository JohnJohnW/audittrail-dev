export function Frameworks() {
  const frameworks = [
    { name: "ISO 27001:2022", controls: 17, category: "International" },
    { name: "SOC 2 Type II", controls: 7, category: "US" },
    { name: "Essential Eight", controls: 8, category: "Australia" },
    { name: "NIST CSF", controls: 8, category: "US" },
    { name: "GDPR", controls: 5, category: "EU" },
  ];

  return (
    <section id="frameworks" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Frameworks
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            We map GitHub activity to these controls
          </h2>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Framework
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Controls
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {frameworks.map((framework, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {framework.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {framework.category}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right tabular-nums">
                    {framework.controls}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          More frameworks coming soon
        </p>
      </div>
    </section>
  );
}
