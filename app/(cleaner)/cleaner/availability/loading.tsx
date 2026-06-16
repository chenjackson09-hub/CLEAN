export default function AvailabilityLoading() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-6" />
      <div className="h-5 bg-gray-100 rounded w-52 mb-3" />
      <div className="space-y-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-14" />
        ))}
      </div>
      <div className="h-5 bg-gray-100 rounded w-44 mb-3" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-14" />
        ))}
      </div>
    </div>
  );
}
