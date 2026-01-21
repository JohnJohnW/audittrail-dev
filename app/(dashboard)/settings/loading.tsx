import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Organization Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-40 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Subscription Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <Skeleton className="h-6 w-32 mb-6" />

        <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Plan Comparison */}
        <div>
          <Skeleton className="h-5 w-28 mb-4" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <Skeleton className="h-5 w-12 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-orange-50/50 rounded-xl p-5 border-2 border-orange-100">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
