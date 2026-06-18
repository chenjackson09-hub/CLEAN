export default function BrowseLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-44 mb-4" />
      <div className="h-12 bg-white rounded-xl border border-gray-200 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-44" />
        ))}
      </div>
    </div>
  );
}
