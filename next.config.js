// Derive the Supabase storage host from the env URL so next/image stays valid
// even if the project ref changes (the previous hard-coded host was stale and
// blocked every avatar). Falls back to the current project ref.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return "ntjxbfvaqlybfbqonpyx.supabase.co";
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
      },
    ],
  },
  experimental: {
    // Profile/gallery photos are POSTed to the server action as multipart form
    // data, and Server Actions default to a 1MB body limit — a typical phone
    // photo (2-8MB) silently exceeds it, so the upload "saved" nothing and the
    // preview reverted on refresh. Raise the limit so real photos go through.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 500,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
