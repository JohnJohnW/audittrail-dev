import { Skeleton, SkeletonChart } from "@/components/ui/Skeleton";

export default function ComplianceLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="text-center py-6">
          <Skeleton className="w-36 h-36 rounded-full mx-auto mb-6" />
          <Skeleton className="h-6 w-56 mx-auto mb-2" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Framework Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <Skeleton className="h-6 w-40 mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-5 bg-gray-50 rounded-xl">
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="text-right">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2.5 w-36 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
