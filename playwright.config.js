// Playwright config for the Scotland Yard UI smoke/regression suite.
// Runs the pure-Node engine simulation separately (see test/simulate.js); this
// drives the real app in a headless browser to catch UI regressions.
//
// Local runs against a pre-provisioned browser can set PW_EXECUTABLE_PATH to a
// headless-shell binary; CI installs its own browser and leaves it unset.
const { defineConfig, devices } = require('@playwright/test');

const exe = process.env.PW_EXECUTABLE_PATH || undefined;

module.exports = defineConfig({
  testDir: './test/ui',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:8080',
    launchOptions: exe ? { executablePath: exe, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    // Landscape phone — the app is landscape-locked, so this mirrors real mobile play.
    { name: 'mobile-landscape', use: { ...devices['Desktop Chrome'], viewport: { width: 740, height: 360 }, isMobile: false } },
  ],
  webServer: {
    command: 'node test/ui/server.js',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
