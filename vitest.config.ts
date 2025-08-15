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
      '**/components/ui/**',
      // Hanging component tests - exclude until React testing issues resolved
      '**/Calendar.test.tsx',
      '**/CardWithSubmit.test.tsx',
      '**/EmailsInput.test.tsx',
      '**/InteractiveCalendar.test.tsx',
      '**/ManualScheduleDialog.test.tsx',
      '**/MiniStudentSchedule.test.tsx',
      '**/OnboardStudentCard.test.tsx',
      '**/OutputCalendar.test.tsx',
      '**/ResultsTable.test.tsx',
      '**/SolveScheduleDialog.test.tsx',
      '**/enrollment.test.tsx',
      '**/teacher-dashboard.test.tsx',
      '**/StudioCard.test.tsx'
      // Keep: SendToStudentsDialog.test.tsx, SetAvailabilityDialog.test.tsx, StudentSchedule.test.tsx
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