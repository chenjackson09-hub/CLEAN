import ErrorScreen from "@/components/ErrorScreen";

// Any address that doesn't exist (for a signed-in person; signed-out visitors are sent to login).
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorScreen kind="not-found" />
    </div>
  );
}
