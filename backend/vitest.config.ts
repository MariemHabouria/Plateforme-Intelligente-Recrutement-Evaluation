// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

const result = dotenv.config({
  path: path.resolve(__dirname, '.env.test'),
});


console.log('[vitest.config] dotenv parsed:', result.parsed);

const envConfig = result.parsed || {};

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: envConfig,
  },
});