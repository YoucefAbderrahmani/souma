const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next from inferring C:\Users\vada as workspace root,
  // which can dramatically increase memory use during dev compilation.
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
