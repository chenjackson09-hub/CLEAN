export default function AdminBookingsLoading() {
  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-44 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
