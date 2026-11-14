import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      PROFILES_TABLE: 'test-profiles',
      MEDIA_BUCKET: 'test-media',
      USER_POOL_ID: 'test-pool',
      USER_POOL_CLIENT_ID: 'test-client',
      REGION: 'us-east-1',
    },
  },
});
