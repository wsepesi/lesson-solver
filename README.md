# Lesson Solver

Many to one lesson scheduling made easy

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