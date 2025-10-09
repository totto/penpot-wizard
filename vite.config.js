import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import livePreview from "vite-live-preview";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    livePreview({
      reload: true,
    }),
    nodePolyfills({ include: ['stream', 'util'] }),
  ],
  build: {
    emptyOutDir: false,
  },
  server: {
    port: 5174,
    cors: true,
  },
  preview: {
    port: 5173,
    cors: true,
  },
})
