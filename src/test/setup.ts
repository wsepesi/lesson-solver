import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ResizeObserver for jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.alert for jsdom
global.alert = vi.fn()

// Mock Supabase client
vi.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: () => ({
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
  }),
  useUser: () => null,
  useSession: () => null,
}))

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    query: {},
    pathname: '/',
  }),
}))