import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3101 },
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'] // Remove specific console methods
      }
    },
    // CSS minification (enabled by default but being explicit)
    cssMinify: true,
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'codemirror': ['@uiw/react-codemirror', '@codemirror/lang-python', '@replit/codemirror-vim'],
          'charts': ['recharts'],
          'syntax': ['prismjs']
        }
      }
    },
    // Source maps for debugging (disable in production for smaller size)
    sourcemap: false,
    // Asset inline threshold (assets < 4kb become base64)
    assetsInlineLimit: 4096
  }
})
