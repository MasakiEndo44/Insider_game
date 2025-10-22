import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  // Disable edge-runtime shims when running under Node
  define: {
    'process.env.NEXT_RUNTIME': '"nodejs"',
  },
  test: {
    // Split environments: jsdom for Client Components, node for Server Actions/utils
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**', // Exclude Playwright E2E tests
      '**/playwright-report/**',
      '**/.playwright-mcp/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/test/**',
        '**/e2e/**',
      ],
    },
  },
});
