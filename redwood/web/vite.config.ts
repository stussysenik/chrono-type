import dns from 'dns'

import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

import redwood from '@redwoodjs/vite'

// So that Vite will load on localhost instead of `127.0.0.1`.
// See: https://vitejs.dev/config/server-options.html#server-host.
dns.setDefaultResultOrder('verbatim')

const viteConfig: UserConfig = {
  plugins: [redwood()],
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
  },
  optimizeDeps: {
    // Prevent Vite from pre-bundling the phoenix.js package;
    // it uses ES module syntax that Vite handles correctly at build time.
    exclude: ['phoenix'],
  },
}

export default defineConfig(viteConfig)
