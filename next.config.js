/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dgram: false,
        'node-datachannel': false
      };
    }

    // Add rules for handling Streamr SDK
    config.module.rules.push({
      test: /node_modules\/@streamr\/sdk/,
      exclude: /\.json$/, // Exclude JSON files from babel-loader
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: [
            '@babel/plugin-proposal-class-properties',
            '@babel/plugin-transform-runtime'
          ]
        }
      }
    });

    // Add specific rule for JSON files
    config.module.rules.push({
      test: /\.json$/,
      type: 'json'
    });

    return config;
  },
  transpilePackages: ['@streamr/sdk']
};

module.exports = nextConfig;