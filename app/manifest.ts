import type { MetadataRoute } from "next";

// The "name tag" a phone reads when someone adds Cindy to their Home Screen. Served at
// /manifest.webmanifest (public in middleware.ts — the phone fetches it before anyone signs in).
// Colours and icons are placeholders until the real logo/palette is chosen: replace the PNGs in
// public/icons (same names) and adjust the two colours below.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Cindy",
    short_name: "Cindy",
    description: "Book verified cleaners near you.",
    start_url: "/", // "/" sends each person to their own home screen
    scope: "/",
    display: "standalone", // opens full screen, no browser bar
    background_color: "#f9fafb", // the colour behind the app while it starts
    theme_color: "#2563eb", // tints the phone's top status bar
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
