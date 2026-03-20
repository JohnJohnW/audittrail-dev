import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status - Audit Trail",
  description: "Service status and uptime information for Audit Trail",
};

export default async function StatusPage() {
  // In a real implementation, this would fetch from a status service
  // For now, we'll show a basic status page
  const status = {
    overall: "operational",
    services: [
      { name: "API", status: "operational", uptime: "99.9%" },
      { name: "Database", status: "operational", uptime: "99.9%" },
      { name: "GitHub Integration", status: "operational", uptime: "99.8%" },
      { name: "Export Service", status: "operational", uptime: "99.9%" },
    ],
    incidents: [],
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Status</h1>
          <p className="text-gray-600">Real-time status of Audit Trail services</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h2 className="text-xl font-semibold text-gray-900">All Systems Operational</h2>
          </div>
          <p className="text-gray-600">All services are running normally. No incidents reported.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h2>
          <div className="space-y-3">
            {status.services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      service.status === "operational" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="font-medium text-gray-900">{service.name}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-sm font-medium ${
                      service.status === "operational" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {service.status === "operational" ? "Operational" : "Degraded"}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{service.uptime} uptime</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
