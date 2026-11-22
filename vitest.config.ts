import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.spec.ts'],
    environment: 'node',
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Source fixtures/types are not behavior; imperative DOM is browser-covered later.
      exclude: ['src/domain/model.ts', 'src/main.ts', 'src/**/*.d.ts'],
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
        'src/domain/**/*.ts': {
          perFile: true,
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 95,
        },
      },
    },
  },
});
