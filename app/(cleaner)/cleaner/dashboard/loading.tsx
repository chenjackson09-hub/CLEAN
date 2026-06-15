export default function DashboardLoading() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-36 mb-6" />
      <div className="h-5 bg-gray-100 rounded w-48 mb-3" />
      <div className="space-y-3 mb-8">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24" />
        ))}
      </div>
      <div className="h-5 bg-gray-100 rounded w-36 mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-16" />
        ))}
      </div>
    </div>
  );
}
