import { Skeleton } from "@/components/ui/Skeleton";
import { getLoadingPhrase } from "@/lib/utils/loading-phrases";

interface LoadingStateProps {
  message?: string;
  showSkeleton?: boolean;
}

export function LoadingState({ message, showSkeleton = false }: LoadingStateProps) {
  const displayMessage = message || getLoadingPhrase();
  if (showSkeleton) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
        <p className="text-gray-500">{displayMessage}</p>
      </div>
    </div>
  );
}
