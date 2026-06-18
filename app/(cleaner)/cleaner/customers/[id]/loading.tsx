export default function CustomerDetailLoading() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-44 mb-6" />
      <div className="h-28 bg-white rounded-xl border border-gray-200 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-20" />
        ))}
      </div>
    </div>
  );
}
