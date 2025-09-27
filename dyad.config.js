module.exports = {
  proxy: {
    port: 53295, // Fix to a consistent port
    target: 'http://localhost:8080', // Update to match Vite
  },
};