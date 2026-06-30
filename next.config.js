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
