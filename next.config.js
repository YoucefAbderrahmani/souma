const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next from inferring C:\Users\vada as workspace root,
  // which can dramatically increase memory use during dev compilation.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    /** Cache optimized variants longer (seconds). */
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

module.exports = nextConfig;
