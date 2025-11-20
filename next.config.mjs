/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'sql.js': 'commonjs sql.js',
        'sql.js/dist/sql-wasm.js': 'commonjs sql.js/dist/sql-wasm.js'
      });
    }
    return config;
  }
};

export default nextConfig;
