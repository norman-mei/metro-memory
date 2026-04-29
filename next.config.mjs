import path from 'path'
import { fileURLToPath } from 'url'

/** @type {import('next').NextConfig} */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const reactIconsRoot = path.join(__dirname, 'node_modules', 'react-icons')
const reactIconsMdPath = `./${path
  .relative(__dirname, path.join(reactIconsRoot, 'md', 'index.mjs'))
  .replaceAll('\\', '/')}`

const LARGE_GAME_EXCLUDES = [
  './city-registry/**/*',
  './metro-memory-old/**/*',
  './mobile/**/*',
  './package-lock.json',
  './public/city-data/**/*',
  './public/city-cards/**/*',
  './public/city-icons/**/*',
  './public/images/**/*',
  './public/offline-manifest.json',
  './public/fonts/**/*',
  './public/stripmap/**/*',
  './src/app/(game)/**/*',
  './src/images/photos/**/*',
]

const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  staticPageGenerationTimeout: 30,
  outputFileTracingIncludes: {
    '/api/city-icon/[slug]': ['./public/city-icons/*.ico'],
  },
  outputFileTracingExcludes: {
    '*': ['./prisma/**/*.db', './prisma/**/*.sqlite'],
    '/api/city-icon/[slug]': LARGE_GAME_EXCLUDES,
    '/api/dev/site-version': LARGE_GAME_EXCLUDES,
    '/api/auth/register': LARGE_GAME_EXCLUDES,
    '/api/auth/forgot-password': LARGE_GAME_EXCLUDES,
    '/api/auth/change-email': LARGE_GAME_EXCLUDES,
    '/api/auth/resend-verification': LARGE_GAME_EXCLUDES,
  },
  output: 'standalone',
  images: {
    localPatterns: [
      {
        pathname: '/favicon.ico',
      },
      {
        pathname: '/icon.ico',
      },
      {
        pathname: '/images/**',
      },
      {
        pathname: '/city-cards/**',
      },
    ],
  },
  experimental: {
    cpus: 1,
    memoryBasedWorkersCount: true,
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
    webpackBuildWorker: false,
    webpackMemoryOptimizations: true,
  },
  turbopack: {
    resolveAlias: {
      react: './node_modules/react',
      'react-dom': './node_modules/react-dom',
      'react-icons': './node_modules/react-icons',
      'react-icons/md': reactIconsMdPath,
    },
  },
  webpack(config, { dev }) {
    if (!dev) {
      config.optimization.minimize = false;
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      'react-icons': reactIconsRoot,
      'react-icons/md': path.join(reactIconsRoot, 'md', 'index.mjs'),
    }
    return config
  },
  async redirects() {
    return []
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
