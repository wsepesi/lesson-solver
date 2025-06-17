# Priority 4: Framework Updates & Dependency Management

**Status:** Medium Priority - Infrastructure Modernization
**Estimated Time:** 4-6 hours
**Prerequisites:** Priority 1 (Critical Issues) completed, Priority 3 (Dev Environment) recommended
**Goal:** Upgrade Next.js, audit dependencies, optimize bundle size, and improve security posture

## Overview

The project currently uses Next.js 13.5.6 and has dependencies that may be outdated or have security vulnerabilities. This plan systematically updates the framework and dependencies while maintaining compatibility.

## Phase 1: Dependency Audit & Security (1-2 hours)

### Task 4.1: Security Vulnerability Audit

**Steps:**
1. Run security audit:
   ```bash
   pnpm audit
   pnpm audit --fix
   ```

2. Check for outdated packages:
   ```bash
   pnpm outdated
   ```

3. Use additional security tools:
   ```bash
   # Install and run security scanners
   pnpm add -D npm-check-updates
   npx ncu --target minor
   npx ncu --target patch
   ```

4. Review and document findings in `docs/security-audit.md`

### Task 4.2: Dependency Analysis

**Create dependency analysis report:**

**Steps:**
1. Analyze bundle size:
   ```bash
   pnpm add -D @next/bundle-analyzer
   ```

2. Update `next.config.mjs`:
   ```javascript
   import bundleAnalyzer from '@next/bundle-analyzer'

   const withBundleAnalyzer = bundleAnalyzer({
     enabled: process.env.ANALYZE === 'true',
   })

   /** @type {import('next').NextConfig} */
   const nextConfig = {
     experimental: {
       // Add experimental features as needed
     },
     // Other config options
   }

   export default withBundleAnalyzer(nextConfig)
   ```

3. Add bundle analysis script to `package.json`:
   ```json
   {
     "scripts": {
       "analyze": "ANALYZE=true pnpm build"
     }
   }
   ```

4. Identify large dependencies and potential alternatives

### Task 4.3: Clean Up Unused Dependencies

**Review and potentially remove:**

1. **Check usage of each dependency:**
   ```bash
   # Use depcheck to find unused dependencies
   pnpm add -D depcheck
   npx depcheck
   ```

2. **Candidates for review:**
   - `@nivo/bar` - Only used if data visualization is needed
   - `@dnd-kit/*` - Only if drag-and-drop is implemented
   - `embla-carousel-react` - Check if carousel is actually used

3. **Remove unused dependencies:**
   ```bash
   pnpm remove [package-name]
   ```

## Phase 2: Next.js Upgrade (2-3 hours)

### Task 4.4: Prepare for Next.js 14 Upgrade

**Pre-upgrade checklist:**
1. Review [Next.js 14 migration guide](https://nextjs.org/docs/upgrading)
2. Backup current working state
3. Check compatibility of all dependencies with Next.js 14

**Known breaking changes to address:**
- App Router migration (if needed)
- Image optimization changes
- Font optimization updates
- Metadata API changes

### Task 4.5: Upgrade Next.js

**Steps:**
1. Update Next.js and React:
   ```bash
   pnpm update next react react-dom
   # Or specific version
   pnpm add next@latest react@latest react-dom@latest
   ```

2. Update TypeScript types:
   ```bash
   pnpm add -D @types/react@latest @types/react-dom@latest
   ```

3. Check for compatibility issues:
   ```bash
   pnpm type-check
   pnpm lint
   pnpm build
   ```

### Task 4.6: Update Next.js Configuration

**Review and update `next.config.mjs`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable new optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // Performance optimizations
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

### Task 4.7: Update TypeScript Configuration

**Enhance `tsconfig.json` for Next.js 14:**
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "ES2017"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"],
      "lib/*": ["./lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Phase 3: Dependency Updates (1-2 hours)

### Task 4.8: Update Major Dependencies

**Supabase packages:**
```bash
# Update to latest Supabase packages
pnpm update @supabase/auth-helpers-nextjs @supabase/auth-helpers-react @supabase/supabase-js
```

**UI and styling:**
```bash
# Update Radix UI components
pnpm update @radix-ui/react-*

# Update Tailwind CSS
pnpm update tailwindcss autoprefixer postcss

# Update form handling
pnpm update react-hook-form @hookform/resolvers
```

**Development dependencies:**
```bash
# Update ESLint and Prettier
pnpm update -D eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Update build tools
pnpm update -D typescript @types/node
```

### Task 4.9: Database ORM Updates

**Update Drizzle ORM:**
```bash
pnpm update drizzle-orm drizzle-zod
pnpm update -D drizzle-kit
```

**Check for breaking changes:**
1. Review Drizzle ORM changelog
2. Test database connections
3. Verify schema generation still works
4. Update any deprecated APIs

### Task 4.10: Environment and Validation Updates

**Update environment validation:**
```bash
pnpm update @t3-oss/env-nextjs zod
```

**Enhanced environment schema in `src/env.mjs`:**
```javascript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

## Phase 4: Performance Optimization (1 hour)

### Task 4.11: Bundle Size Optimization

**Steps:**
1. Run bundle analyzer:
   ```bash
   pnpm analyze
   ```

2. **Optimize imports:**
   ```typescript
   // Instead of importing entire libraries
   import * as RadixIcons from '@radix-ui/react-icons'
   
   // Import only what's needed
   import { ChevronDownIcon, PlusIcon } from '@radix-ui/react-icons'
   ```

3. **Add dynamic imports for heavy components:**
   ```typescript
   // For components that aren't immediately needed
   const SolveScheduleDialog = dynamic(() => import('./SolveScheduleDialog'), {
     loading: () => <div>Loading...</div>,
   })
   ```

4. **Optimize date-fns usage:**
   ```typescript
   // Instead of
   import * as dateFns from 'date-fns'
   
   // Use specific imports
   import { format, parseISO } from 'date-fns'
   ```

### Task 4.12: Add Performance Monitoring

**Install performance monitoring:**
```bash
pnpm add @vercel/analytics @vercel/speed-insights
```

**Add to `_app.tsx`:**
```typescript
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionContextProvider>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </SessionContextProvider>
  )
}
```

### Task 4.13: Implement Code Splitting

**Add route-based code splitting:**
```typescript
// pages/studios/[slug].tsx
import dynamic from 'next/dynamic'

const StudioDashboard = dynamic(() => import('~/components/StudioDashboard'), {
  loading: () => <div>Loading studio...</div>,
})

const CalendarInterface = dynamic(() => import('~/components/CalendarInterface'), {
  loading: () => <div>Loading calendar...</div>,
})
```

**Component-level optimization:**
```typescript
// Lazy load heavy solver components
const SolverVisualization = dynamic(() => import('./SolverVisualization'), {
  ssr: false,
  loading: () => <div>Loading solver...</div>,
})
```

## Phase 5: Testing & Verification (30 minutes)

### Task 4.14: Post-Upgrade Testing

**Comprehensive testing checklist:**

1. **Build and development:**
   ```bash
   pnpm clean
   pnpm install
   pnpm type-check
   pnpm lint
   pnpm build
   pnpm dev
   ```

2. **Functionality testing:**
   - [ ] Authentication flows work
   - [ ] Studio creation and management
   - [ ] Student enrollment
   - [ ] Schedule solving
   - [ ] Calendar interactions
   - [ ] Database operations

3. **Performance testing:**
   ```bash
   pnpm analyze
   # Check bundle sizes are reasonable
   
   # Test build performance
   time pnpm build
   ```

4. **Browser compatibility:**
   - Test in Chrome, Firefox, Safari
   - Test responsive design
   - Check for console errors

### Task 4.15: Update Documentation

**Update `docs/dependencies.md`:**
```markdown
# Dependencies

## Major Dependencies

- **Next.js 14.x** - React framework
- **React 18.x** - UI library
- **Supabase** - Backend and authentication
- **Drizzle ORM** - Database ORM
- **Tailwind CSS** - Styling
- **Radix UI** - Component primitives

## Development Dependencies

- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Testing framework

## Security Updates

Last security audit: [DATE]
No critical vulnerabilities found.

## Bundle Size

Total bundle size: ~XXX KB
Main chunks:
- Framework: XX KB
- Application: XX KB
- UI Components: XX KB
```

**Update CLAUDE.md with new commands:**
```markdown
# Development Commands

```bash
# Development
pnpm dev             # Start development server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint
pnpm type-check      # TypeScript validation
pnpm analyze         # Bundle size analysis

# Security
pnpm audit           # Security vulnerability scan
pnpm outdated        # Check for outdated packages
```
```

## Success Criteria

### Framework Updates
- [ ] Next.js updated to latest stable version (14.x)
- [ ] All dependencies updated to compatible versions
- [ ] No security vulnerabilities in `pnpm audit`
- [ ] Build times improved or maintained
- [ ] Bundle size not significantly increased

### Performance
- [ ] Bundle analysis shows reasonable sizes
- [ ] Key components are code-split appropriately
- [ ] Performance monitoring is in place
- [ ] Build performance is acceptable (<30 seconds)

### Compatibility
- [ ] All existing functionality works
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Cross-browser compatibility maintained
- [ ] Mobile responsiveness intact

### Documentation
- [ ] Updated dependency list
- [ ] Security audit documentation
- [ ] Performance optimization notes
- [ ] Migration notes for future reference

## Rollback Plan

If issues arise during upgrade:

1. **Immediate rollback:**
   ```bash
   git checkout HEAD~1  # Return to previous commit
   pnpm install
   ```

2. **Partial rollback:**
   ```bash
   # Revert specific dependency
   pnpm add next@13.5.6
   ```

3. **Common issues and fixes:**
   - TypeScript errors: Check for breaking changes in type definitions
   - Build failures: Clear `.next` and `node_modules`, reinstall
   - Runtime errors: Check for deprecated API usage

## Future Maintenance

1. **Regular updates:** Monthly dependency review
2. **Security monitoring:** Weekly `pnpm audit`
3. **Performance tracking:** Monitor bundle size growth
4. **Version pinning:** Consider pinning major versions for stability