import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.e2e.*',
      '**/*.spec.ts',
      '**/components/ui/**'
    ],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      'lib': path.resolve(__dirname, './lib'),
      'src': path.resolve(__dirname, './src'),
    },
  },
})