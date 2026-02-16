/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/trades',
        destination: '/history',
        permanent: true,
      },
      {
        source: '/journal',
        destination: '/missed-trades',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
