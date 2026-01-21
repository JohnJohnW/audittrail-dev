import { Skeleton } from "@/components/ui/Skeleton";

export default function RepositoriesLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Skeleton className="h-11 w-full max-w-md rounded-lg" />
      </div>

      {/* Repository List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center p-5">
              <Skeleton className="w-5 h-5 rounded-md mr-4" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-1.5" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full ml-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
