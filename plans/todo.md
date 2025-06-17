# Lesson Solver Development Plan

## Priority 1 - Critical Issues (Blocking Development) ✅ COMPLETED

### Build & Lint Failures ✅ COMPLETED
- [x] **Fix TypeScript error in test.tsx:67** - ✅ Fixed import issue: changed from default to named import of `solve`
- [x] **Clean up unused variables and imports** across multiple files:
  - ✅ `lib/heur_solver.ts:71` - fixed unused `_` variable by removing underscore
  - ✅ `src/components/OutputCalendar.tsx:5` - removed unused `useState` import
  - ✅ `src/components/SendToStudentsDialog.tsx` - removed unused `EmailsInput`, `emails`, `setEmails` variables
  - ✅ `src/components/SolveScheduleDialog.tsx` - fixed unused `schedule`, `loading`, `i` variables
  - ✅ `src/pages/api/hello.ts` - removed unused `drizzle`, `postgres`, `connectionString` variables

### Dead Code & Unused Files ✅ COMPLETED
- [x] **Remove or fix test page** - ✅ Deleted `src/pages/test.tsx` (was debug/dev code with hardcoded studio ID)
- [x] **Clean up API hello endpoint** - ✅ Cleaned up `src/pages/api/hello.ts` by removing commented code and unused imports
- [x] **Remove old solver** - ✅ Deleted `lib/old_solver.ts` (legacy code no longer used)
- [x] **Audit lib/tests.ts** - ✅ Updated to remove references to old solver, properly typed variables

**Status:** ✅ `pnpm lint` and `pnpm build` both pass successfully with zero errors or warnings

## Priority 2 - High Priority (Core Functionality)

### Testing Infrastructure
- [ ] **Comprehensive solver tests** - Current tests in `lib/tests.ts` are incomplete and use old solver
- [ ] **Create test suite structure** - Set up proper testing framework (Jest/Vitest)
- [ ] **Solver edge case tests** - Test boundary conditions, impossible schedules, constraint violations
- [ ] **User flow tests** - E2E tests for teacher/student workflows
- [ ] **Database integration tests** - Test schema constraints and data integrity

### Code Quality & Architecture
- [ ] **Fix ESLint configuration** - Multiple `eslint-disable` comments suggest configuration issues
- [ ] **Type safety improvements** - Remove `any` types and improve type definitions
- [ ] **Error handling audit** - Add proper error boundaries and validation
- [ ] **Security review** - Check for SQL injection, XSS, and auth vulnerabilities

## Priority 3 - Medium Priority (Enhancements)

### Development Environment
- [ ] **Add local Supabase setup** - Docker compose for local development
- [ ] **Environment variable validation** - Expand `src/env.mjs` for required variables
- [ ] **Database migration strategy** - Proper migration files instead of direct schema pushes
- [ ] **Development scripts** - Add test, typecheck, format scripts to package.json

### Code Organization
- [ ] **Component architecture review** - Some components have mixed concerns
- [ ] **Consistent naming conventions** - Mix of camelCase/kebab-case in component names
- [ ] **Remove TODOs and FIXMEs** - Address 19+ TODO/FIXME comments found in codebase
- [ ] **API route organization** - Structure API endpoints properly

### Data Model Issues
- [ ] **Boolean grid representation** - Current `bool[][]` approach is inflexible and memory inefficient
- [ ] **30/60 minute limitation** - Hard-coded time constraints limit usability
- [ ] **Half-hour start times** - Unrealistic constraint for real-world scheduling

## Priority 4 - Low Priority (Future Improvements)

### Framework Updates
- [ ] **Upgrade Next.js** - Currently on v13, should move to latest stable
- [ ] **Dependency audit** - Check for outdated or vulnerable packages
- [ ] **Bundle size optimization** - Analyze and reduce client bundle size

### UX/UI Improvements
- [ ] **Responsive design audit** - Ensure mobile compatibility
- [ ] **Accessibility review** - WCAG compliance check
- [ ] **Loading states** - Improve loading UX throughout application
- [ ] **Error messaging** - User-friendly error messages

## Priority 5 - Major Refactoring (Long-term)

### Data Model Redesign
- [ ] **Flexible time representation** - Move from boolean grids to time range objects
- [ ] **Minute-level precision** - Support scheduling down to the minute
- [ ] **Variable lesson lengths** - Support any lesson duration
- [ ] **Complex availability patterns** - Support recurring patterns, exceptions, etc.

### Solver Algorithm Overhaul
- [ ] **General constraint solver** - Replace boolean grid algorithm with more flexible approach
- [ ] **Performance optimization** - Handle larger numbers of students/time slots
- [ ] **Advanced heuristics** - Better optimization objectives and constraints
- [ ] **Incremental solving** - Handle schedule updates without full recomputation

### Architecture Modernization
- [ ] **API redesign** - RESTful or GraphQL API structure
- [ ] **State management** - Consider Redux/Zustand for complex state
- [ ] **Component library** - Create reusable design system
- [ ] **Monitoring & analytics** - Add observability to scheduling performance

## Technical Debt Summary

**Immediate Blockers:** ✅ RESOLVED - All lint/build errors fixed, deployment ready
**Code Quality:** Reduced use of `any` types, removed unused code, cleaned up imports
**Testing:** Minimal test coverage, test cases updated for current codebase
**Architecture:** Tightly coupled components, mixed concerns
**Data Model:** Inflexible boolean grid approach limiting real-world usage
**Dependencies:** Outdated Next.js version, potential security vulnerabilities

## Next Steps

1. ✅ Fix all Priority 1 issues to get build/lint passing - COMPLETED
2. Implement comprehensive test suite (Priority 2) - NEXT PRIORITY
3. Set up local development environment (Priority 3)
4. Plan data model redesign (Priority 5)
5. Incremental refactoring of solver algorithm

## Recent Progress

**Latest Update:** Priority 1 Critical Issues completed
- All build and lint errors resolved
- Codebase is now in a clean, deployable state
- Development pipeline unblocked
- Ready to proceed with Priority 2 testing infrastructure