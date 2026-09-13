import { defineConfig, devices } from '@playwright/test';

// SPEC §10: Playwright-Matrix im CI. Getestet wird die gebaute Site über `astro preview`.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321/portfolio/',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321/portfolio/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
