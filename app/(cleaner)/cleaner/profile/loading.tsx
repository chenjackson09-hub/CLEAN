export default function ProfileLoading() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-28 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-80 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-white rounded-xl border border-gray-200" />
        ))}
      </div>
    </div>
  );
}
