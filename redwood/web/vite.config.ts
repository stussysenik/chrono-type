import dns from 'dns'

import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

import redwood from '@redwoodjs/vite'

// So that Vite will load on localhost instead of `127.0.0.1`.
// See: https://vitejs.dev/config/server-options.html#server-host.
dns.setDefaultResultOrder('verbatim')

const viteConfig: UserConfig = {
  plugins: [redwood()],
  resolve: {
    // Force all imports of react/react-dom to resolve to a single copy.
    // Without this, Vite's dep optimizer can serve the same package under
    // different ?v= hashes after HMR invalidation (e.g. when the Redwood
    // type generator touches Routes.tsx), creating duplicate React instances
    // that crash with "Invalid hook call" errors.
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    hmr: {
      // Prevent HMR WebSocket from conflicting with the Phoenix proxy
      port: 8911,
    },
    proxy: {
      // Forward REST API calls to Phoenix
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Forward WebSocket upgrade to Phoenix Channels
      '/socket': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
    watch: {
      // Exclude generated type files from triggering HMR.
      // The Redwood `gen` step rewrites .redwood/types/ on every dev start,
      // which Vite's watcher picks up and propagates as an HMR update to
      // Routes.tsx → entry.client.tsx. This mid-startup invalidation causes
      // the dep optimizer to re-hash, producing two browser-Hash generations
      // in the same session — and two copies of React (crash).
      ignored: ['**/.redwood/types/**'],
    },
  },
  optimizeDeps: {
    // Prevent Vite from pre-bundling the phoenix.js package;
    // it uses ES module syntax that Vite handles correctly at build time.
    exclude: ['phoenix'],
    // Pre-bundle these deps in the first optimization pass so they all
    // share the same browserHash. Without this, @redwoodjs/web and
    // react-dom/client may be optimized in separate passes with different
    // hashes, each pulling in their own copy of the shared React chunk.
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@redwoodjs/web',
      '@redwoodjs/router',
      '@redwoodjs/web/dist/components/DevFatalErrorPage',
    ],
  },
}

export default defineConfig(viteConfig)
