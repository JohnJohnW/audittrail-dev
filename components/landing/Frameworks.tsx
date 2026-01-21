export function Frameworks() {
  const frameworks = [
    { 
      name: "ISO 27001:2022", 
      controls: 17, 
      description: "Annex A change management & access controls"
    },
    { 
      name: "SOC 2 Type II", 
      controls: 7, 
      description: "CC6.1, CC6.6, CC8.1 change management"
    },
    { 
      name: "Essential Eight", 
      controls: 8, 
      description: "Application control & admin privileges"
    },
    { 
      name: "NIST CSF", 
      controls: 8, 
      description: "Protect & Detect function controls"
    },
    { 
      name: "GDPR", 
      controls: 5, 
      description: "Article 32 technical measures"
    },
  ];

  return (
    <section id="frameworks" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Frameworks
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Pre-mapped compliance controls
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            We&apos;ve done the control mapping for you. Each framework includes 
            the specific controls that Git activity can evidence.
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Framework
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Coverage
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Controls
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {frameworks.map((framework, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-gray-900">
                      {framework.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                    {framework.description}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right tabular-nums">
                    {framework.controls}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Custom framework mappings available for Enterprise
        </p>
      </div>
    </section>
  );
}
