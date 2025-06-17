# Testing Plan - Lesson Solver

## Overview
This document outlines the comprehensive testing strategy for the lesson scheduling application, addressing critical gaps in the current test suite and ensuring production-ready quality.

## Current Test Coverage Summary

### ✅ What We Have
- **Core Algorithm Tests** (`lib/test/`)
  - Heuristic solver with backtracking (good coverage)
  - Type system and data models (comprehensive)
  - Schedule utility functions (well tested)
- **Basic Component Tests** (7 components in `src/test/unit/`)
- **Mock Integration Tests** (API and database with mocked Supabase)
- **E2E Tests** (scheduling flows, student/teacher workflows)

### ❌ Critical Gaps
1. **No Real Integration Testing** - All Supabase interactions are mocked
2. **70% of UI Components Untested** - Missing tests for forms, dialogs, navigation
3. **Limited Scale Testing** - Current tests use 1-10 students, not 30+
4. **No Concurrent User Testing** - Multi-teacher/student interactions
5. **No Performance/Timeout Testing** - Algorithm behavior under stress
6. **Limited Edge Case Coverage** - Break requirements, timezone handling, conflict resolution

## Testing Strategy

### Phase 1: Real Supabase Integration Testing
**Goal**: Remove all mocks and test against actual Supabase instance

> **NOTE**: Supabase integration testing is being skipped for now. Focus on other phases first.

#### 1.1 Setup Test Environment
- [ ] Create dedicated Supabase test project
- [ ] Configure test environment variables
- [ ] Set up database reset/seed scripts for test isolation
- [ ] Implement test user creation/cleanup utilities

#### 1.2 Authentication Integration Tests
```typescript
// src/test/integration/auth.test.ts
- Test real signup flow with email verification
- Test login with valid/invalid credentials
- Test session persistence and refresh
- Test logout and session cleanup
- Test protected route access
- Test concurrent session handling
```

#### 1.3 Database Integration Tests
```typescript
// src/test/integration/database-real.test.ts
- Test studio creation with real constraints
- Test student enrollment with database triggers
- Test schedule persistence and retrieval
- Test concurrent modifications (optimistic locking)
- Test cascade deletes and referential integrity
- Test transaction rollback scenarios
```

#### 1.4 Real-time Features Tests
```typescript
// src/test/integration/realtime.test.ts
- Test schedule updates propagation
- Test student availability changes
- Test multi-user conflict resolution
```

### Phase 2: Comprehensive UI Testing

#### 2.1 Critical Component Tests (Priority 1)
```typescript
// Dialog Components (core user interactions) ✅ COMPLETED
- ManualScheduleDialog.test.tsx ✅
- SetAvailabilityDialog.test.tsx ✅
- SolveScheduleDialog.test.tsx ✅
- SendToStudentsDialog.test.tsx ✅

// Form Components ✅ COMPLETED
- EmailsInput.test.tsx (email validation edge cases) ✅
- Combobox.test.tsx (search and selection) ✅
- enrollment.test.tsx (complete enrollment form) ✅

// Schedule Display Components ✅ COMPLETED
- StudentSchedule.test.tsx ✅
- MiniStudentSchedule.test.tsx ✅
- ResultsTable.test.tsx ✅
```

#### 2.2 Page Component Tests (Priority 2)
```typescript
// Authentication Pages
- pages/login.test.tsx
- pages/signup.test.tsx

// Studio Management Pages
- pages/studios/index.test.tsx
- pages/studios/new.test.tsx
- pages/studios/[slug].test.tsx

// Student Pages
- pages/enroll/index.test.tsx
```

#### 2.3 UI Library Components (Priority 3)
- Test Radix UI integrations
- Test accessibility features
- Test keyboard navigation

### Phase 3: Complex Scheduling Scenarios ✅ COMPLETED

#### 3.1 Scale Testing (Up to 30 Students) ✅ COMPLETED
```typescript
// src/test/integration/complex-scheduling-scenarios.test.ts ✅
describe('Solver at Scale', () => {
  test('schedules 30 students with minimal availability overlap', async () => ✅
    // Create scenario where each student has only 2-3 possible slots
    // Ensure algorithm finds the single valid solution
  });

  test('handles 30 students with complex teacher availability', async () => ✅
    // Teacher available only 3 hours/day with mandatory breaks
    // Students have overlapping preferences
    // Verify performance < 10 seconds
  });

  test('degrades gracefully when no solution exists', async () => ✅
    // 30 students, insufficient teacher availability
    // Should fail fast with clear error
  });
});
```

#### 3.2 Arbitrarily Complex Scenarios ✅ COMPLETED
```typescript
// src/test/integration/complex-scheduling-scenarios.test.ts ✅
describe('Complex Real-World Scenarios', () => {
  test('single solution puzzle - 25 students', async () => ✅
    // Design a scenario with exactly one valid solution
    // Mix of 30 and 60-minute lessons
    // Teacher has specific break requirements
    // Some students available only at peak times
  });

  test('teacher break requirements stress test', async () => ✅
    // Test cases:
    // - Max 3 consecutive lessons before 30-min break
    // - No lessons during lunch (12-1pm)
    // - Max 6 hours teaching per day
    // - Different break requirements per day
  });

  test('competing constraints resolution', async () => ✅
    // Multiple students want same popular slots
    // Teacher prefers morning but students want evening
    // Mix of lesson lengths creates packing challenges
  });
});
```

#### 3.3 Performance and Timeout Testing ✅ COMPLETED
```typescript
// src/test/integration/performance-timeout.test.ts ✅
describe('Performance Boundaries', () => {
  test('times out appropriately on impossible problems', async () => ✅
    // Should fail within 30 seconds, not run forever
  });

  test('performance degrades linearly with complexity', async () => ✅
    // Measure solving time for 10, 20, 30 students
    // Ensure no exponential explosion
  });

  test('memory usage stays bounded', async () => ✅
    // Monitor memory during 30-student solve
    // Ensure no memory leaks
  });
});
```

### Phase 4: Edge Cases and Failure Modes

#### 4.1 Break Requirement Edge Cases ✅ COMPLETED
```typescript
// src/test/integration/break-requirements.test.ts ✅
describe('Teacher Break Requirements', () => {
  test('enforces minimum break between lesson groups', async () => ✅
    // Various break lengths (15, 30, 60 minutes)
    // Break requirements change by day
  });

  test('handles impossible break requirements gracefully', async () => ✅
    // Teacher wants 2-hour break but only available 3 hours
  });

  test('optimizes break placement for teacher preference', async () => ✅
    // Place breaks at natural times (lunch, mid-morning)
  });
});
```

#### 4.2 System Failure Handling
```typescript
// src/test/integration/failure_modes.test.ts
describe('Failure Mode Handling', () => {
  test('handles database connection loss during solve', async () => {
    // Start solve, kill DB connection, verify graceful handling
  });

  test('handles concurrent schedule modifications', async () => {
    // Two teachers modify same student's availability
  });

  test('recovers from partial schedule generation', async () => {
    // Solver crashes halfway, can resume or restart
  });
});
```

#### 4.3 Business Logic Edge Cases
```typescript
// src/test/integration/business_logic.test.ts
describe('Business Logic Edge Cases', () => {
  test('handles timezone differences correctly', async () => {
    // Teacher in EST, students in PST
    // Verify correct time slot mapping
  });

  test('manages student preference conflicts', async () => {
    // Student wants morning but only teacher has is evening
    // Student wants 60-min but teacher only offers 30-min
  });

  test('handles studio deletion with active students', async () => {
    // Verify cascading deletes and notifications
  });
});
```

### Phase 5: Complete E2E User Journeys

#### 5.1 Teacher Complete Workflow
```typescript
// src/test/e2e/teacher_complete_journey.spec.ts
- Create account and verify email
- Create first studio with complex availability
- Share studio code
- Wait for student enrollments
- Review student availability
- Generate schedule with constraints
- Handle conflicts and regenerate
- Send schedules to students
- Modify schedule after sending
- Handle student requesting changes
```

#### 5.2 Multi-User Interaction Scenarios
```typescript
// src/test/e2e/multi_user_scenarios.spec.ts
- 3 teachers creating studios simultaneously
- 30 students enrolling across different studios
- Teachers modifying availability while students enroll
- System performance under concurrent load
```

#### 5.3 Failure Recovery Journeys
```typescript
// src/test/e2e/failure_recovery.spec.ts
- Network disconnection during enrollment
- Session timeout during schedule creation
- Browser crash recovery
- Partial data submission handling
```

## Implementation Timeline

### Week 1-2: Foundation
- Set up Supabase test environment
- Create test utilities and helpers
- Implement database integration tests

### Week 3-4: UI Testing
- Test all critical dialogs and forms
- Test page components
- Set up visual regression testing

### Week 5-6: Complex Scenarios
- Implement 30-student scale tests
- Create complex scheduling puzzles
- Add performance benchmarks

### Week 7-8: Edge Cases & E2E
- Test all failure modes
- Implement break requirement tests
- Create comprehensive E2E journeys

## Success Metrics

1. **Test Coverage**: Achieve 90%+ coverage for critical paths
2. **Performance**: All tests complete within 30 seconds
3. **Reliability**: No flaky tests in CI/CD pipeline
4. **Scale**: Successfully handle 30-student scenarios
5. **Integration**: Zero mocked external services in integration tests

## Test Data Management

### Fixtures
```typescript
// src/test/fixtures/
- teachers.ts (various availability patterns)
- students.ts (different preference profiles)
- studios.ts (different constraint sets)
- schedules.ts (edge case schedules)
```

### Generators
```typescript
// src/test/generators/
- generateStudents(count, constraints)
- generateTeacherAvailability(pattern)
- generateConflictScenario(type)
```

## CI/CD Integration

1. **Pre-commit**: Run unit tests only
2. **PR Checks**: Run unit + integration tests
3. **Main Branch**: Run full test suite including E2E
4. **Nightly**: Run performance and scale tests
5. **Release**: Run all tests + visual regression

## Monitoring and Alerts

1. Track test execution time trends
2. Alert on test coverage drops
3. Monitor Supabase test project usage
4. Track flaky test frequency

---

This plan prioritizes fixing the critical gaps while maintaining what's already working well. The focus on real integration testing and complex scenarios will ensure the application works reliably at scale in production.