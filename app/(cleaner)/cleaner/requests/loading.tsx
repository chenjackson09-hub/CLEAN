export default function RequestsLoading() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-72 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24" />
        ))}
      </div>
    </div>
  );
}
