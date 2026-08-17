/**
 * One stroke, two entry surfaces.
 *
 * Sigil's casting field owns the stroke lifecycle. But direction 05B starts the
 * stroke on a *card's* cast pad — the pointer goes down, the field is asked to
 * open, and React needs a render before the field exists to receive anything.
 * The channel is the seam: the pad emits into it immediately, the field
 * subscribes when it mounts and gets the buffered head of the stroke replayed,
 * then streams the rest live.
 *
 * This is deliberately *not* two copies of the stroke engine — one primitive
 * per interaction class — the
 * pad owns pointer capture, the field owns recognition, and neither re-derives
 * the other's job.
 */
import type { StrokePoint } from '../lib/unistroke.ts'

export type StrokeEvent =
  | { type: 'begin'; point: StrokePoint }
  | { type: 'extend'; point: StrokePoint }
  | { type: 'end' }

export type StrokeChannel = {
  emit: (event: StrokeEvent) => void
  /** Replays the in-flight stroke so far, then streams. Returns an unsubscribe. */
  subscribe: (listener: (event: StrokeEvent) => void) => () => void
}

export function createStrokeChannel(): StrokeChannel {
  let bufferedEvents: StrokeEvent[] = []
  let listener: ((event: StrokeEvent) => void) | null = null

  return {
    emit(event) {
      if (event.type === 'begin') bufferedEvents = []
      if (listener === null) {
        bufferedEvents.push(event)
        return
      }
      listener(event)
    },
    subscribe(nextListener) {
      listener = nextListener
      const replay = bufferedEvents
      bufferedEvents = []
      for (const event of replay) nextListener(event)
      return () => {
        if (listener === nextListener) listener = null
      }
    },
  }
}
