// Provides the `main` landmark + skip-navigation target for the auth pages
// (login / register), which otherwise render standalone with no shared layout.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1}>
      {children}
    </main>
  );
}
