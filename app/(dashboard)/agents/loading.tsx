export default function AgentsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading agent activity...</p>
      </div>
    </div>
  );
}
