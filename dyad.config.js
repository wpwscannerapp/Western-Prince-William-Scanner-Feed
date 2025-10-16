console.log('dyad.config.js: Loading configuration.'); // New log to confirm config loading
module.exports = {
  proxy: {
    target: 'http://localhost:32100', // Update to match the actual Vite port
  },
};