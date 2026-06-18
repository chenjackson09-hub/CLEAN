export default function BookingsLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-6" />
      <div className="h-5 bg-gray-100 rounded w-48 mb-3" />
      <div className="space-y-3 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-28" />
        ))}
      </div>
    </div>
  );
}
