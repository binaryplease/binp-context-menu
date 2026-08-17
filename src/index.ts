/**
 * binp-context-menu — seven context-menu directions as one React library.
 *
 * The whole integration is: wrap a tree in `<ContextMenuProvider>`, spread
 * `useContextMenu().triggerProps` onto whatever the commands act on, and hand
 * over a pair of persist functions if you want the menu to remember anything.
 *
 * Styles: import `binp-context-menu/theme.css` into your Tailwind build and
 * point `@source` at this package's `src/`.
 */

// ── the wrapper and its hooks ──────────────────────────────────────────────
export { ContextMenuProvider } from './runtime/ContextMenuProvider.tsx'
export type { ContextMenuProviderProps } from './runtime/ContextMenuProvider.tsx'
export { useContextMenu } from './runtime/useContextMenu.ts'
export type { UseContextMenuOptions, UseContextMenuResult } from './runtime/useContextMenu.ts'
export { useContextMenuConfig, useContextMenuRuntime } from './runtime/context.ts'
export type { ContextMenuRuntime, Invocation, OpenOptions } from './runtime/context.ts'
// Which direction a press opens — exported so a host that arms its own trigger can
// ask the same question the layer does, rather than re-deriving 05B's two ways in.
export { invocationSurfaceOf } from './runtime/invocationSurface.ts'
export type { InvocationSource } from './runtime/invocationSurface.ts'

// ── host-facing controls ───────────────────────────────────────────────────
export { MenuButton } from './components/MenuButton.tsx'
export type { MenuButtonProps } from './components/MenuButton.tsx'
export { CastPad } from './components/CastPad.tsx'
export type { CastPadProps } from './components/CastPad.tsx'
// The pad's grain, named and paintable — the list the library's own settings
// section offers, so a host writing its own offers the same one.
export { PAD_BACKGROUNDS, padBackgroundClassName } from './components/padBackgrounds.ts'
export type { PadBackgroundDescriptor } from './components/padBackgrounds.ts'
export { ContextMenuSettings } from './components/ContextMenuSettings.tsx'
export type { ContextMenuSettingsProps } from './components/ContextMenuSettings.tsx'
export { ContextMenuSettingsModal } from './components/ContextMenuSettingsModal.tsx'
export type { ContextMenuSettingsModalProps } from './components/ContextMenuSettingsModal.tsx'
export { SurfacePicker } from './components/SurfacePicker.tsx'
export type { SurfacePickerProps } from './components/SurfacePicker.tsx'

// ── schemas and their inferred types ───────────────────────────────────────
// The schemas *are* the types: everything below is inferred from them, never
// declared twice — Zod is the type source.
export {
  CommandKindSchema,
  CommandSchema,
  isSafeHref,
  searchableTermsOf,
  shortLabelOf,
  titleTextOf,
} from './schema/command.ts'
export type {
  Command,
  CommandIconComponent,
  CommandInput,
  CommandKind,
  CommandKindInput,
} from './schema/command.ts'
export {
  CompassConfigSchema,
  ContextMenuConfigSchema,
  OrbitConfigSchema,
  // The pad's grain, for the same reason the directions are exported: a host
  // building its own settings UI offers the patterns from this list rather than
  // typing out a second one that goes stale.
  PAD_BACKGROUND_IDS,
  PadBackgroundSchema,
  // Exported for the same reason `SURFACE_IDS` is: a host building its own
  // settings UI over `useContextMenuConfig` needs the number to say what its
  // own delay control does once it crosses it.
  READING_CARD_MIN_DELAY_MS,
  SigilConfigSchema,
  SigilPadConfigSchema,
  SigilRuneSchema,
  SoundConfigSchema,
  StrataConfigSchema,
  SURFACE_IDS,
  SurfaceIdSchema,
  WhisperConfigSchema,
  defaultConfig,
  parseConfig,
} from './schema/config.ts'
export type {
  ContextMenuConfig,
  ContextMenuConfigInput,
  OrbitConfig,
  PadBackground,
  SigilPadConfig,
  SigilRune,
  SoundConfig,
  SurfaceId,
} from './schema/config.ts'

// ── persistence: bring your own load/save ──────────────────────────────────
export { createLocalStoragePersistence, createMemoryPersistence } from './persistence/adapter.ts'
export type {
  ContextMenuPersistence,
  LocalStoragePersistenceOptions,
} from './persistence/adapter.ts'
export { createConfigStore } from './persistence/store.ts'
export type { ConfigRecipe, ConfigStore, ConfigStoreOptions } from './persistence/store.ts'

// ── the surface catalogue (build your own switcher from it) ────────────────
export { SURFACES, SURFACES_BY_ID } from './surfaces/registry.ts'
export type {
  SurfaceComponentProps,
  SurfaceDefinition,
  SurfaceSettingsSection,
} from './surfaces/types.ts'

// ── the lexicon and the algorithms, for hosts that want to extend them ─────
export {
  DEFAULT_GLYPHS,
  DISMISS_GLYPH,
  RUNE_POINT_COUNT,
  glyphPath,
  glyphPointsFromStroke,
} from './lib/glyphs.ts'
export type { Glyph } from './lib/glyphs.ts'
// Which stroke casts what: resolution is exported so a host can show a command's
// rune outside the field (a keyboard-shortcut sheet, a tooltip); binding goes
// through `useContextMenuRuntime().bindRune`, which is the one write path.
export { isBoundRune, resolveRune, runeDisplayNameOf, userRuneOf } from './runtime/runes.ts'
export type { ResolvedRune } from './runtime/runes.ts'
export { bestFuzzyMatch, fuzzyMatch } from './lib/fuzzy.ts'
export type { FuzzyMatch, MatchSegment } from './lib/fuzzy.ts'
export { prepareTemplate, recognize } from './lib/unistroke.ts'
export type { Recognition, StrokePoint, StrokeTemplate } from './lib/unistroke.ts'
export { createSfx } from './audio/sfx.ts'
export type { CueMeasurement, CueTakeName, Sfx } from './audio/sfx.ts'
