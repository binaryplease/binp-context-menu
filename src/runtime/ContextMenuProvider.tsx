/**
 * The provider — one descriptor set, one config store, one overlay, one run path.
 *
 * Everything that must not drift between the seven surfaces lives here: the
 * parsed command list, the learned usage, the sound bus, the invocation state,
 * and the decision about what running a command does. A surface is then a pure
 * rendering of that — this is the one shared wrapper every surface composes.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import {
  CommandKindSchema,
  CommandSchema,
  type Command,
  type CommandInput,
  type CommandKind,
  type CommandKindInput,
} from '../schema/command.ts'
import type { ContextMenuConfigInput } from '../schema/config.ts'
import { createConfigStore, type ConfigRecipe } from '../persistence/store.ts'
import type { ContextMenuPersistence } from '../persistence/adapter.ts'
import { DEFAULT_GLYPHS, type Glyph } from '../lib/glyphs.ts'
import { createSfx } from '../audio/sfx.ts'
import { createStrokeChannel } from './strokeChannel.ts'
import { bindRuneRecipe, resolveRune, unbindRuneRecipe } from './runes.ts'
import { invocationSurfaceOf } from './invocationSurface.ts'
import {
  ContextMenuRuntimeContext,
  type ContextMenuRuntime,
  type Invocation,
  type OpenOptions,
} from './context.ts'
import { MenuLayer } from './MenuLayer.tsx'

export type ContextMenuProviderProps = {
  /** The commands every surface offers. Parsed once, at this boundary. */
  commands: CommandInput[]
  /** The lanes/arcs/colours commands are grouped by. */
  kinds: CommandKindInput[]
  /**
   * The rune palette a user picks from on the Sigil field, and the names
   * `Command.glyph` may point at. Defaults to the fifteen shipped runes — a
   * palette, not a set of bindings: no command carries a rune until the user
   * draws or picks one, or the host names one itself.
   */
  glyphs?: Glyph[]
  /**
   * Your persist functions. Omitted, config lives in memory for the page's
   * lifetime — the library never writes to a user's storage uninvited.
   */
  persistence?: ContextMenuPersistence
  /** Starting config. A stored config is layered on top of this, not under it. */
  defaultConfig?: ContextMenuConfigInput
  /** Fires for every command that runs, with the target it was invoked on. */
  onRun?: (command: Command, target: unknown) => void
  /** Load/save/parse faults. Defaults to `console.error`. */
  onPersistError?: (error: unknown, phase: 'load' | 'save' | 'parse') => void
  children: ReactNode
}

export function ContextMenuProvider({
  commands: commandInput,
  kinds: kindInput,
  glyphs = DEFAULT_GLYPHS,
  persistence,
  defaultConfig,
  onRun,
  onPersistError,
  children,
}: ContextMenuProviderProps) {
  // The store outlives renders; the seed and persistence are read once, exactly
  // like a `useState` initializer, so a host may pass inline literals.
  const storeRef = useRef<ReturnType<typeof createConfigStore> | null>(null)
  if (storeRef.current === null) {
    storeRef.current = createConfigStore({ persistence, seed: defaultConfig, onPersistError })
  }
  const store = storeRef.current

  const config = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  useEffect(() => {
    void store.hydrate()
  }, [store])

  // One boundary parse ("Zod is the type source"). Re-runs only when the host
  // hands over a new
  // array, so a stable command list costs nothing per render.
  const parsedKinds = useMemo<CommandKind[]>(
    () => kindInput.map((kind) => CommandKindSchema.parse(kind)),
    [kindInput],
  )
  const parsedCommands = useMemo<Command[]>(
    () => commandInput.map((command) => CommandSchema.parse(command)),
    [commandInput],
  )

  const hiddenCommandIds = config.hiddenCommandIds
  const visibleCommands = useMemo(
    () => parsedCommands.filter((command) => !hiddenCommandIds.includes(command.id)),
    [parsedCommands, hiddenCommandIds],
  )

  const configRef = useRef(config)
  configRef.current = config
  const sfx = useMemo(() => createSfx({ getConfig: () => configRef.current.sound }), [])
  useEffect(() => () => sfx.dispose(), [sfx])
  useEffect(() => {
    sfx.refresh()
  }, [sfx, config.sound])

  const strokeChannel = useMemo(() => createStrokeChannel(), [])

  const [invocation, setInvocation] = useState<Invocation | null>(null)
  const invocationCounter = useRef(0)

  // Reads the config through the ref, so opening a menu does not depend on the
  // identity of `open` changing every time a knob moves — and so the direction is
  // resolved *at the press*, which is what freezes it for the life of the
  // invocation rather than letting a settings change swap the surface underneath
  // a menu that is already on screen.
  const open = useCallback((options: OpenOptions) => {
    invocationCounter.current += 1
    setInvocation({
      key: invocationCounter.current,
      anchor: options.anchor,
      target: options.target ?? null,
      surface: invocationSurfaceOf(configRef.current, options.source ?? 'trigger'),
      padOrigin: options.padOrigin ?? null,
      seededStroke: options.seededStroke ?? false,
    })
  }, [])

  const close = useCallback(() => {
    setInvocation(null)
  }, [])

  const updateConfig = useCallback((recipe: ConfigRecipe) => store.update(recipe), [store])
  const resetConfig = useCallback(() => store.reset(), [store])

  // Which stroke casts what is *content the user owns*, so it lives in the config
  // beside the knobs and goes through the same one write path. The host's own
  // `Command.glyph` is the fallback underneath it (see runes.ts).
  const boundRunes = config.sigil.runes
  const runeFor = useCallback(
    (command: Command) => resolveRune(command, boundRunes, glyphs),
    [boundRunes, glyphs],
  )
  const bindRune = useCallback(
    (commandId: string, rune: { name: string; points: readonly (readonly [number, number])[] }) =>
      store.update(bindRuneRecipe(commandId, rune)),
    [store],
  )
  const unbindRune = useCallback(
    (commandId: string) => store.update(unbindRuneRecipe(commandId)),
    [store],
  )

  const kindsById = useMemo(
    () => new Map(parsedKinds.map((kind) => [kind.id, kind])),
    [parsedKinds],
  )

  const runCommand = useCallback(
    (command: Command) => {
      // The single gate. A surface that wants to run a disabled command cannot:
      // it is disabled *and* explained everywhere ("unavailable is never
      // invisible"), never silently
      // runnable on the one surface that forgot to check.
      if (command.disabledReason !== null) return
      const target = invocation === null ? null : invocation.target
      if (configRef.current.learnFromUsage) {
        store.update((current) => ({
          ...current,
          usage: {
            ...current.usage,
            [command.id]: Math.min(
              current.orbit.maxWeight,
              (current.usage[command.id] ?? 0) + current.orbit.learnIncrement,
            ),
          },
        }))
      }
      command.run?.()
      // A link command opens here rather than in the control, so *every* way of
      // picking it navigates: the Compass slice and the Sigil cast never go
      // through an anchor at all, and Whisper's ⏎ runs the row without clicking
      // it. `CommandButton` suppresses the anchor's own navigation for a plain
      // click precisely so this stays the one path — one wrapper, one
      // mechanism.
      if (command.href !== null) {
        window.open(command.href, '_blank', 'noopener,noreferrer')
      }
      onRun?.(command, target)
      close()
    },
    [close, invocation, onRun, store],
  )

  const runtime = useMemo<ContextMenuRuntime>(
    () => ({
      commands: visibleCommands,
      kinds: parsedKinds,
      glyphs,
      kindOf: (command) => kindsById.get(command.kindId) ?? null,
      weightOf: (command) => command.weight + (config.usage[command.id] ?? 0),
      runeFor,
      bindRune,
      unbindRune,
      config,
      updateConfig,
      resetConfig,
      sfx,
      strokeChannel,
      invocation,
      open,
      close,
      runCommand,
    }),
    [
      bindRune,
      close,
      config,
      glyphs,
      invocation,
      kindsById,
      open,
      parsedKinds,
      resetConfig,
      runCommand,
      runeFor,
      sfx,
      strokeChannel,
      unbindRune,
      updateConfig,
      visibleCommands,
    ],
  )

  return (
    <ContextMenuRuntimeContext.Provider value={runtime}>
      {children}
      <MenuLayer />
    </ContextMenuRuntimeContext.Provider>
  )
}
