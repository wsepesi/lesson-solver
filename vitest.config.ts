import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [
      './src/test/setup.ts',
      './lib/scheduling/tests/visualization-setup.ts'
    ],
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.e2e.*',
      '**/*.spec.ts',
      '**/components/ui/**'
    ],
    
    // Worker and memory management to prevent runaway processes
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,        // Limit concurrent workers
        minThreads: 1,
        isolate: false,       // Share memory between tests
      }
    },
    testTimeout: 30000,       // 30 second timeout per test
    teardownTimeout: 5000,    // 5 seconds for cleanup
    maxConcurrency: 5,        // Max concurrent tests per worker
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      'lib': path.resolve(__dirname, './lib'),
      'src': path.resolve(__dirname, './src'),
    },
  },
})