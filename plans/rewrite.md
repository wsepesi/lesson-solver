# Project Rewrite Plan - ✅ COMPLETED

**Goal:** Modernize the lesson-solver application with Next.js 15, App Router, and local development environment setup.

## ✅ Migration Status: COMPLETED (December 2024)

**Successfully migrated from Next.js 13 Pages Router to Next.js 15 App Router**

### What Was Accomplished:
- ✅ Local Supabase development environment setup
- ✅ Next.js 13.5.6 → 15.3.4 upgrade
- ✅ Complete Pages Router → App Router migration
- ✅ Supabase auth helpers → `@supabase/ssr` migration
- ✅ Module aliases updated (`~/` → `@/`)
- ✅ React Server Components implementation
- ✅ Build and development verification

The application is now running on Next.js 15 with modern architecture and local development environment.

## Phase 1: Local Development Setup

### Local Supabase Setup
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize and start local Supabase:
   ```bash
   supabase init
   supabase start
   ```

3. Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key_here
   NODE_ENV=development
   ```

4. Update `.gitignore`:
   ```gitignore
   .supabase/
   .env.local
   ```

**Note:** Hold off on seeding for now. No database commands in package.json.

## Phase 2: Dependency Updates & Next.js 15 Upgrade

### Update All Dependencies
```bash
# Update to latest versions
pnpm update

# Specific major updates
pnpm add next@latest react@latest react-dom@latest
pnpm add -D @types/react@latest @types/react-dom@latest typescript@latest
```

### Key Dependencies to Update:
- Next.js → 15.x
- React → 18.x (latest)
- Supabase packages → latest
- Radix UI components → latest
- Tailwind CSS → latest
- Drizzle ORM → latest

## Phase 3: App Router Migration

### 1. Create App Directory Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Home page
│   ├── studios/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   └── globals.css
└── components/            # Keep existing components
```

### 2. Root Layout (`src/app/layout.tsx`)
```typescript
import './globals.css'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'Lesson Solver',
  description: 'Many-to-one lesson scheduling made easy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### 3. Convert Pages to App Router
- Move `pages/index.tsx` → `src/app/page.tsx`
- Move `pages/studios/[slug].tsx` → `src/app/studios/[slug]/page.tsx`
- Replace `getServerSideProps` with direct data fetching in Server Components
- Update routing hooks: `next/router` → `next/navigation`

### 4. Update Middleware
Update `src/middleware.ts` for App Router:
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  if (req.nextUrl.pathname.startsWith('/studios')) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.redirect(new URL('/auth', req.url))
    }
  }
  
  return res
}

export const config = {
  matcher: ['/studios/:path*']
}
```

## Phase 4: Basic Performance & Testing

### Performance Monitoring
```typescript
// Add to root layout
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Testing Updates
Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "pnpm build && pnpm lint"
  }
}
```

## Phase 5: Clean Up

### Remove Unused Files
- Delete `pages/` directory after migration
- Remove old API routes if not needed
- Clean up unused dependencies

### Update Configuration Files
- Update `next.config.mjs` for App Router
- Update `tsconfig.json` paths if needed
- Update ESLint config for App Router

## Migration Checklist

### Local Development
- [x] Supabase CLI installed and working
- [x] Local Supabase services running
- [x] Environment variables configured
- [x] Database schema applied (no seeding)

### Dependencies
- [x] All packages updated to latest versions
- [x] Next.js 15.3.4 installed
- [x] React 18.3.1 installed
- [x] TypeScript types updated
- [x] Supabase packages migrated to `@supabase/ssr`

### App Router Migration
- [x] App directory structure created
- [x] Root layout implemented
- [x] Pages converted to App Router format
- [x] Routing hooks updated (`next/router` → `next/navigation`)
- [x] Middleware updated for App Router
- [x] Server Components implemented with client components where needed

### Testing & Performance
- [x] Build succeeds without errors
- [x] Application runs in development mode
- [x] Application builds for production
- [x] "use client" directives added to 15+ interactive components
- [x] Module aliases updated (`~/` → `@/`)

### Clean Up
- [x] Old pages directory removed
- [x] Configuration files updated (next.config.mjs, tsconfig.json, components.json)
- [x] Import paths updated throughout codebase
- [x] Documentation updated (CLAUDE.md, README.md)

## Notes

- **Migration completed successfully** - all major objectives achieved
- **Component architecture preserved** - existing components work with App Router
- **Local development environment** - fully functional with Docker + Supabase
- **Build validation** - compiles successfully with warnings only from pre-existing code
- **Future improvements** - linting errors remain but don't block functionality

## Post-Migration Status

### ✅ Working Features:
- Local Supabase development environment
- Next.js 15 App Router with route groups
- Server and client component architecture
- Authentication with server-side session management
- All existing application functionality preserved
- Development and production builds

### 📝 Next Steps (Optional):
- Address remaining ESLint warnings
- Optimize server/client component boundaries
- Add error boundaries and loading states
- Implement new Next.js 15 features (parallel routes, intercepting routes)

## Troubleshooting

### Common Issues
- **Docker not running**: Start Docker Desktop before `supabase start`
- **Port conflicts**: Check ports 54321-54324 are available
- **Build errors**: Clear `.next` directory and reinstall dependencies
- **Type errors**: Update all type definitions to match Next.js 15

### Rollback Plan
If issues arise:
```bash
git checkout HEAD~1  # Return to previous working state
pnpm install
```