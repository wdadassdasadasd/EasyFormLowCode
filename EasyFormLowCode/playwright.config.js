import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { defineConfig } from '@playwright/test'

/* global process */

const e2eDatabase = resolve('backend/tests/.tmp/lowcode-e2e.db')
mkdirSync(dirname(e2eDatabase), { recursive: true })
rmSync(e2eDatabase, { force: true })

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'python -m uvicorn app.main:app --host 127.0.0.1 --port 8000',
      cwd: './backend',
      env: { ...process.env, LOWCODE_DB_PATH: e2eDatabase },
      url: 'http://127.0.0.1:8000/docs',
      timeout: 30_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      cwd: '.',
      url: 'http://127.0.0.1:5173',
      timeout: 30_000,
      reuseExistingServer: false,
    },
  ],
})
