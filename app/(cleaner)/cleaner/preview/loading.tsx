export default function PreviewLoading() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-20 w-20 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-100 rounded w-28" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-white rounded-xl border border-gray-200" />
        ))}
      </div>
    </div>
  );
}
