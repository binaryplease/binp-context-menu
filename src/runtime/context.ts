/**
 * The runtime every surface reads from — the single place that knows which
 * commands exist, what the config says, what is currently invoked, and what
 * running a command means.
 *
 * Surfaces do not receive commands as props from their host, do not decide
 * whether a command may run, and do not write usage counters. They read this
 * context and paint. That is what makes adding an eighth surface a rendering
 * exercise rather than a re-derivation of the whole affordance: one descriptor,
 * one wrapper, one guard.
 */
import { createContext, useContext } from 'react'
import type { Command, CommandKind } from '../schema/command.ts'
import type { ContextMenuConfig, SurfaceId } from '../schema/config.ts'
import type { InvocationSource } from './invocationSurface.ts'
import type { ConfigRecipe } from '../persistence/store.ts'
import type { Glyph } from '../lib/glyphs.ts'
import type { ResolvedRune } from './runes.ts'
import type { Sfx } from '../audio/sfx.ts'
import type { Box, Point } from '../lib/geometry.ts'
import type { StrokeChannel } from './strokeChannel.ts'

export type Invocation = {
  /** Bumped per invocation so the surface remounts instead of animating in place. */
  key: number
  anchor: Point
  /** Whatever the host passed to `useContextMenu({ target })` — a task, a row, … */
  target: unknown
  /**
   * The direction this invocation opens, already resolved (`invocationSurface.ts`).
   * Usually `config.surface`; under 05B it is the pad's field or the configured
   * secondary direction, depending on which of the two ways in was taken. The
   * layer reads *this*, never the config, so what opened stays what is drawn.
   */
  surface: SurfaceId
  /** 05B only: the cast pad this field was launched from, echoed inside it. */
  padOrigin: Box | null
  /** True when a stroke is already in flight on the stroke channel. */
  seededStroke: boolean
}

export type OpenOptions = {
  anchor: Point
  target?: unknown
  /**
   * Where the press came from. Defaults to `'trigger'`, which is every control a
   * host arms — only the library's own cast pad passes `'cast-pad'`, and only
   * because 05B answers the two differently.
   */
  source?: InvocationSource
  padOrigin?: Box | null
  seededStroke?: boolean
}

export type ContextMenuRuntime = {
  /** Parsed, host-supplied, and filtered by `config.hiddenCommandIds`. */
  commands: Command[]
  kinds: CommandKind[]
  /** The rune palette — what a user can *take* from. Nothing here is bound. */
  glyphs: Glyph[]
  kindOf: (command: Command) => CommandKind | null
  /** Command weight = declared weight + everything this user has learned. */
  weightOf: (command: Command) => number
  /**
   * The rune that casts this command — the one the user drew or picked, else the
   * one the host named in `Command.glyph`. `null` for a command with no rune,
   * which is every command until someone binds one.
   */
  runeFor: (command: Command) => ResolvedRune | null
  /**
   * Give a command a rune, replacing whatever it had. Persisted through the same
   * config write as every other change, so binding a rune is one save.
   */
  bindRune: (
    commandId: string,
    rune: { name: string; points: readonly (readonly [number, number])[] },
  ) => void
  /** Take a command's rune away. It stays reachable on all seven surfaces. */
  unbindRune: (commandId: string) => void
  config: ContextMenuConfig
  updateConfig: (recipe: ConfigRecipe) => void
  resetConfig: () => void
  sfx: Sfx
  strokeChannel: StrokeChannel
  invocation: Invocation | null
  open: (options: OpenOptions) => void
  close: () => void
  /**
   * The one path from "user picked this" to "it ran". Bumps usage, fires the
   * callbacks, closes the menu — and refuses a disabled command, so no surface
   * can invent its own idea of what is runnable.
   */
  runCommand: (command: Command) => void
}

export const ContextMenuRuntimeContext = createContext<ContextMenuRuntime | null>(null)

export function useContextMenuRuntime(): ContextMenuRuntime {
  const runtime = useContext(ContextMenuRuntimeContext)
  if (runtime === null) {
    throw new Error(
      '[binp-context-menu] no runtime in scope — wrap this tree in <ContextMenuProvider>.',
    )
  }
  return runtime
}

/**
 * Read and write the persisted config from anywhere inside the provider — the
 * hook a host builds its own settings UI on.
 */
export function useContextMenuConfig(): {
  config: ContextMenuConfig
  updateConfig: (recipe: ConfigRecipe) => void
  resetConfig: () => void
} {
  const { config, updateConfig, resetConfig } = useContextMenuRuntime()
  return { config, updateConfig, resetConfig }
}
