import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { findAvailablePort } from './scripts/port.ts'
import { thirdPartyNotices } from './scripts/thirdPartyNotices.ts'

/**
 * Vite's canonical client port, and this project's. A *request*, not a pin: the
 * port is allocated first and then bound strictly, and the four rules below are
 * what this file implements.
 */
const CANONICAL_PORT = 5173

/**
 * Rule 4: loopback unless the operator says otherwise. For an
 * unauthenticated local dev server the loopback bind *is* the access control, so
 * publishing to the network has to be a deliberate act, never a default.
 */
const BIND_HOST = process.env.HOST ?? '127.0.0.1'

/**
 * Rule 2: allocation runs in front of the strict bind, for every launch
 * shape — a bare `vite` included. Without it the first stale dev session holding
 * 5173 turns the developer back into a manual port allocator; with Vite's own
 * `strictPort: false` fallback instead, rule 3's fail-loud bind would become a
 * dead letter for the
 * whole project. So: probe upward here, announce any reassignment, then bind that
 * exact port strictly.
 *
 * An explicit operator pin (`PORT=5200 vite`) skips allocation and binds exactly
 * that port or dies loudly.
 */
async function resolvePort(): Promise<number> {
  const pinnedPort = process.env.PORT
  if (pinnedPort !== undefined) return Number(pinnedPort)
  const assignedPort = await findAvailablePort(CANONICAL_PORT, BIND_HOST)
  if (assignedPort !== CANONICAL_PORT) {
    console.warn(
      `[binp-context-menu] port ${CANONICAL_PORT} is taken on ${BIND_HOST} — ` +
        `serving the demo on ${assignedPort} instead (another dev session still running?).`,
    )
  }
  return assignedPort
}

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss(), thirdPartyNotices()],
  root: 'demo',
  /**
   * Relative asset URLs, because the built demo is not served from a root.
   * Its home is `https://zink.bot/v/<slug>/` (`mise run publish`), where a
   * default `/assets/…` reference resolves against zink's own origin and 404s —
   * the page loads, the bundle does not, and the board is blank. A relative base
   * costs the dev server nothing: it still serves from `/`.
   */
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, 'dist/demo'),
    emptyOutDir: true,
  },
  server: {
    host: BIND_HOST,
    port: await resolvePort(),
    // Rule 3: never migrate to another port at bind time. Any reassignment was
    // decided above, before the bind, and announced.
    strictPort: true,
  },
}))
