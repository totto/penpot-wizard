import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    watch: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
