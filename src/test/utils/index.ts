import React from 'react'
import { render } from '@testing-library/react'

export const renderWithProviders = (ui: React.ReactElement) => {
  // For component tests, we don't need the Supabase context wrapper
  // since we're testing components in isolation
  return render(ui)
}

export * from '@testing-library/react'
export { renderWithProviders as render }