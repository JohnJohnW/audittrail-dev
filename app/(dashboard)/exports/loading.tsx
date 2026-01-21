import { Skeleton } from "@/components/ui/Skeleton";

export default function ExportsLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Export Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <Skeleton className="h-6 w-40 mb-6" />
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <div className="flex gap-3">
                <Skeleton className="h-11 w-24 rounded-lg" />
                <Skeleton className="h-11 w-24 rounded-lg" />
              </div>
            </div>
            <div className="flex items-end">
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
          <div>
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Export History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Skeleton className="w-11 h-11 rounded-xl mr-4" />
                <div>
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
