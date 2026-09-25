import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

//Kept separate from vite.config.js so test settings never mix with the app's dev/build config
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
    restoreMocks: true,
    unstubGlobals: true,
  },
})
