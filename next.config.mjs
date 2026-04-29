/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "@prisma/client", "bcryptjs"],
  },
};
export default nextConfig;
