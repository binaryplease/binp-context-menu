/**
 * Port probing — "can this process bind here?" and "find the first free port".
 *
 * Depends only on `node:net`, not on the Vite config that uses it, so it lives
 * in its own module: a unit of code lives where its dependencies are.
 *
 * Probing never *replaces* a strict bind ("allocate a port, then bind it
 * strictly", rules 2–3). The caller picks
 * a concrete free port before startup and announces it; the bind that follows is
 * still exclusive and still dies loudly if the chosen port was taken in between.
 */
import { createServer } from 'node:net'

/** How far above the requested port we search before giving up. */
export const PORT_SEARCH_SPAN = 50

/**
 * True when nothing is listening on `port` for `host`.
 *
 * A real bind, not a connect probe: a connect probe cannot tell an unbound port
 * from one bound by a process that refuses connections, and the question that
 * matters is "can *we* bind here".
 */
export function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const probeServer = createServer()
    probeServer.once('error', () => resolvePromise(false))
    probeServer.once('listening', () => probeServer.close(() => resolvePromise(true)))
    // exclusive: never let SO_REUSEPORT-style sharing mask a conflict, which is
    // the whole point of rule 3's fail-loud bind.
    probeServer.listen({ port, host, exclusive: true })
  })
}

/** The first free port at or above `requestedPort`. Throws when the span is full. */
export async function findAvailablePort(requestedPort: number, host: string): Promise<number> {
  for (
    let candidatePort = requestedPort;
    candidatePort < requestedPort + PORT_SEARCH_SPAN;
    candidatePort++
  ) {
    if (await isPortAvailable(candidatePort, host)) return candidatePort
  }
  throw new Error(
    `No free port found in ${requestedPort}-${requestedPort + PORT_SEARCH_SPAN - 1} on ${host}. ` +
      'Something is occupying the whole range — check for runaway dev servers.',
  )
}
