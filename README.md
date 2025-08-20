# Lesson Solver

Many to one lesson scheduling made easy

**Built with Next.js 15 + App Router, React Server Components, and local Supabase development**

## Quick Start

### Prerequisites
- Node.js 18+ with pnpm
- Docker Desktop (for local Supabase)

### Local Development Setup

```bash
# Install dependencies
pnpm install

# Start local Supabase services (requires Docker)
supabase start

# Start development server
pnpm dev
```

The application will be available at:
- **App**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323

### Environment Variables

Local development uses `.env.local` with local Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=development
```

## Architecture

- **Framework**: Next.js 15 with App Router
- **Components**: React Server Components + Client Components
- **Authentication**: Supabase with `@supabase/ssr`
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Styling**: Tailwind CSS + Radix UI with RSC support
- **Development**: Local Supabase instance with Docker

## Testing

The project has comprehensive test coverage across all layers:

### Running Tests

```bash
# Run all unit and integration tests
pnpm test

# Run tests in watch mode during development
pnpm test:watch

# Run tests once and exit
pnpm test:run

# Run tests with UI interface
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage

# Run E2E tests (requires running dev server)
pnpm dev                    # In one terminal
npx playwright test         # In another terminal

# Run E2E tests with UI
npx playwright test --ui

# Run E2E tests in headed mode (see browser)
npx playwright test --headed
```

**Note**: Tests are compatible with Next.js 15 App Router. Some component tests use "use client" directive for compatibility with React Server Components.

### Test Coverage

- **Unit Tests**: 61 React component tests
- **Algorithm Tests**: 57 solver and utility tests  
- **Integration Tests**: 38 database and API tests
- **E2E Tests**: 18 full user workflow tests
- **Total**: 174 comprehensive tests

### Test Structure

```
src/test/
├── unit/           # Component unit tests
├── integration/    # Database and API tests
├── e2e/           # End-to-end workflow tests
├── utils/         # Test utilities and helpers
└── setup.ts       # Global test configuration

lib/test/          # Algorithm and utility tests
```