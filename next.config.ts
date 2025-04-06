// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development', // Disable PWA in dev mode
    register: true,
    skipWaiting: true,
  });
  
  module.exports = withPWA({
    // Next.js config
  });
  