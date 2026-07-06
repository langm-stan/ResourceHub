import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT_DIR = 'stanford-embed/single-file'

/** Name the one deliverable file clearly and drop build leftovers. */
function tidyOutput(): Plugin {
  return {
    name: 'tidy-single-file-output',
    async closeBundle() {
      await rename(
        resolve(__dirname, OUT_DIR, 'statements.html'),
        resolve(__dirname, OUT_DIR, 'financial-statements.html')
      )
      await rm(resolve(__dirname, OUT_DIR, 'assets'), { recursive: true, force: true })
    },
  }
}

// One self-contained HTML file: all JavaScript, CSS, and fonts inlined, so it
// can be emailed and opened with a double-click (file://), no server needed.
export default defineConfig({
  plugins: [react(), viteSingleFile(), tidyOutput()],
  base: './',
  publicDir: false,
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    // Inline every asset (Inter + KaTeX font files) as data URIs.
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: resolve(__dirname, 'statements.html'),
    },
  },
})
