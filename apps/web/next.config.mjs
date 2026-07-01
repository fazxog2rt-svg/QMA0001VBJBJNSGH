/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexusbot/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.discordapp.net" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
