import Welcome from "@/components/welcome/Welcome";

// The first screen of the website. Signed-in people never get here: middleware.ts sends them on
// to their own home screen. Signed-out visitors see the welcome / install choice, which then leads
// to /login (see components/welcome/Welcome.tsx).
export default function Home() {
  return <Welcome />;
}
