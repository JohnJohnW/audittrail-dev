import { Skeleton } from "@/components/ui/Skeleton";

export default function AuditsLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-8 w-44 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 shadow-sm p-4 bg-white">
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Cycle cards */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-64 mb-2" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
