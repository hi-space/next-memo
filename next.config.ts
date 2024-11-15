const runtimeCaching = require('next-pwa/cache');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  mode: 'production',
  disableDevLogs: true,
  runtimeCaching,
});

module.exports = withPWA({
  trailingSlash: true,
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
});

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;
