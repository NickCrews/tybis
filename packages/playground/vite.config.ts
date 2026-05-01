import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  // Set base to your repo name for GitHub Pages deployment.
  // Override with VITE_BASE env var: VITE_BASE=/my-repo/ pnpm build
  base: process.env.VITE_BASE ?? '/tybis/',
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    plugins: () => [wasm(), topLevelAwait()],
  },
  optimizeDeps: {
    exclude: ['prqlc'],
  },
})
