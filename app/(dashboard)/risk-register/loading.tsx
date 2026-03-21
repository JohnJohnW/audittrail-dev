import { Skeleton } from "@/components/ui/Skeleton";

export default function RiskRegisterLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-8 w-44 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <Skeleton className="h-8 w-10 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 grid grid-cols-7 gap-4">
          {["Control", "Framework", "Treatment Type", "Status", "Owner", "Due Date", "Actions"].map(
            (col) => (
              <Skeleton key={col} className="h-4 w-full max-w-[80px]" />
            )
          )}
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <Skeleton className="h-4 w-16 shrink-0" />
              <Skeleton className="h-5 w-24 rounded-full shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <div className="flex gap-2 ml-auto">
                <Skeleton className="h-7 w-14 rounded-md" />
                <Skeleton className="h-7 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
