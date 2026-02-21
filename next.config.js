const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, './'),
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
