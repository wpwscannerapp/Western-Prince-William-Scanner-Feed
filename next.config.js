/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'wpwscannerapp.com' },
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
};

module.exports = nextConfig;