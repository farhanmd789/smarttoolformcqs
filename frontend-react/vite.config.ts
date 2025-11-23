import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get backend port from environment variable or default to 3001
const BACKEND_PORT = process.env.BACKEND_PORT || '3001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.BACKEND_PORT': JSON.stringify(BACKEND_PORT),
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.config.*',
      ],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})