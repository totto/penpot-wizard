import { defineConfig } from 'vite'
import { resolve } from 'path'

// Plugin-specific Vite configuration
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/plugin.ts'),
      name: 'PenpotPlugin',
      fileName: 'plugin',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        dir: 'dist',
        entryFileNames: 'plugin.js',
        format: 'iife',
        name: 'PenpotPlugin'
      }
    },
    outDir: 'dist',
    minify: process.env.NODE_ENV === 'production'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
