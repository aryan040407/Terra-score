/** @type {import('next').NextConfig} */
const API = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    // Browser calls relative /api/* -> proxied to FastAPI (works in Docker, local and hosted previews)
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};
export default nextConfig;
