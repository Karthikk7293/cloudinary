/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  generateBuildId: () => null,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  serverExternalPackages: ["firebase-admin"],
};

module.exports = nextConfig;
