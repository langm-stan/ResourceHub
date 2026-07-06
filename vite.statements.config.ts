import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { rename } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT_DIR = 'stanford-embed/financial-statements'

/** Vite names the emitted HTML after its input; the folder should serve index.html. */
function renameToIndex(): Plugin {
  return {
    name: 'rename-statements-html-to-index',
    async closeBundle() {
      await rename(
        resolve(__dirname, OUT_DIR, 'statements.html'),
        resolve(__dirname, OUT_DIR, 'index.html')
      )
    },
  }
}

// Standalone build of the Financial Statements embed. `base: './'` makes every
// asset reference relative, so the folder works from any URL path Stanford IT
// hosts it under.
export default defineConfig({
  plugins: [react(), renameToIndex()],
  base: './',
  // The site's public/ assets (faculty video thumbnails etc.) are not part of
  // this tool; keep the folder minimal.
  publicDir: false,
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'statements.html'),
    },
  },
})
