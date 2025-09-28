const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    assert: require.resolve('assert'),
    buffer: require.resolve('buffer'),
    'process/browser': require.resolve('process/browser'),
    stream: require.resolve('stream-browserify'),
    url: require.resolve('url'),
    crypto: require.resolve('crypto-browserify'),
    http: false,
    https: false,
    os: false,
  };
  
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  );
  
  config.ignoreWarnings = [/Failed to parse source map/];
  
  // Make Solana modules external - they'll be loaded at runtime
  config.externalsType = 'script';
  config.externals = config.externals || {};
  
  // Skip bundling these Solana modules
  config.resolve.alias = {
    ...config.resolve.alias,
    '@solana-program/system': false,
    '@solana-program/token': false,
    '@solana-program/memo': false,
    '@solana/kit': false,
  };
  
  return config;
};