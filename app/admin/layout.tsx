// Provides the `main` landmark + skip-navigation target for admin pages, which
// render their own <Nav /> inline and otherwise had no shared layout/landmark.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1}>
      {children}
    </main>
  );
}
