import withPWA from 'next-pwa';

// Register ts-node to handle TypeScript configuration
// @ts-ignore
// if (process.env.NODE_ENV !== 'production') require('ts-node/register');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable PWA in development to avoid interference with hot reloading
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);

export default config;

