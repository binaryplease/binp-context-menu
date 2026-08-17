/**
 * The persisted configuration — every knob a user can turn, and the exact shape
 * that goes through the host's persist functions.
 *
 * Two rules shape this file:
 *
 * - **Every field declares a default** ("every persisted field declares a
 *   default"). This schema is read back from
 *   storage written by an older version of the library, so a config that
 *   predates a knob must parse cleanly and come out fully populated. That is why
 *   `parseConfig` can be handed `{}`, `null`, or last year's JSON and always
 *   returns a complete object — no `??` at any read site in the surfaces.
 * - **No identity fields.** Unlike `Command`, nothing here is required input, so
 *   that rule's fail-loud exception does not apply: a config is always
 *   defaultable end to end.
 */
import { z } from 'zod'

export const SURFACE_IDS = [
  'original',
  'whisper',
  'compass',
  'strata',
  'orbit',
  'sigil',
  'sigil-pad',
] as const

export const SurfaceIdSchema = z.enum(SURFACE_IDS)
export type SurfaceId = z.infer<typeof SurfaceIdSchema>

/**
 * Sound is synthesized in code — no asset files anywhere, per "nothing is
 * fetched from a third party at runtime".
 */
export const SoundConfigSchema = z.object({
  enabled: z.boolean().default(true),
  /** One bus gain over the whole palette; relationships between cues are fixed. */
  masterGain: z.number().min(0).max(8).default(2.6),
  /** `bloom` stacks partials upward; `tide` opens one voice's timbre like an iris. */
  summonTake: z.enum(['bloom', 'tide']).default('bloom'),
  /** `collapse` funnels the series into the root; `comet` sends it upward. */
  castTake: z.enum(['collapse', 'comet']).default('collapse'),
  /** The sustained carrier bed. Off by default — it fatigues over a session. */
  droneEnabled: z.boolean().default(false),
  droneGain: z.number().min(0).max(0.1).default(0.004),
  /** `[withinSeconds, gainScale]` — a cue re-fired quickly plays quieter. */
  repeatDuck: z.array(z.tuple([z.number(), z.number()])).default([
    [1.6, 0.4],
    [5.0, 0.7],
  ]),
  reverbSeconds: z.number().min(0.1).max(10).default(2.4),
  reverbDecay: z.number().min(0.1).max(10).default(3.0),
  reverbTone: z.number().min(0).max(1).default(0.22),
})

export const WhisperConfigSchema = z.object({
  width: z.number().default(320),
  placeholder: z.string().default('Run a command…'),
  /** Lead the browse list with the commands this user reaches for most. */
  showMostUsed: z.boolean().default(true),
  mostUsedCount: z.number().int().min(0).default(4),
  /** Group the browse list under kind headings. Search results stay ranked flat. */
  groupByKind: z.boolean().default(true),
  /** `0` means no cap. */
  maxResults: z.number().int().min(0).default(0),
})

export const CompassConfigSchema = z.object({
  /**
   * The *smallest* the wheel is drawn, not its size: with `fitLabels` on, the
   * wheel grows past this until the longest label it was handed fits inside the
   * rim. A command set that already fitted is unaffected — the floor wins.
   */
  diameter: z.number().default(376),
  hubRadius: z.number().default(58),
  kindRingRadius: z.number().default(98),
  /** Also a floor. The grown radius keeps this ring's distance to the rim. */
  itemRingRadius: z.number().default(178),
  /**
   * Rotate each command label along its arc (flipped where needed so it never
   * reads upside-down). `false` keeps every label horizontal.
   */
  radialLabels: z.boolean().default(true),
  /**
   * Measure the labels and grow the wheel until they fit. `false` pins the wheel
   * to `diameter` and lets a long label overhang, which is what every version
   * before this one did — the opt-out for a host that has tuned its own radii
   * around a command set it controls.
   */
  fitLabels: z.boolean().default(true),
  /**
   * A ceiling on the grown diameter. `0` leaves the viewport as the only limit,
   * which it is in either case: the wheel is placed by its own radius, so one
   * that outgrew the screen would merely overflow a different edge. Labels that
   * cannot fit the capped wheel truncate, and the hub still names them in full.
   */
  maxDiameter: z.number().default(0),
})

// There is no placement knob. The lanes open under the pointer, full stop: the
// modal treatment they used to offer was the worse answer to "where does a menu
// go", and a setting is not the place to keep one of those. A stored config that
// still carries the old key parses fine — unknown keys are stripped — so the
// removal needs no migration, the same property that made adding it free.
export const StrataConfigSchema = z.object({
  columnWidth: z.number().default(138),
  caption: z.string().default('Four kinds, four lanes — glance at the colour, not the list.'),
})

export const OrbitRingSchema = z.object({
  radius: z.number().default(86),
  capacity: z.number().int().min(1).default(3),
  startAngle: z.number().default(-90),
})

export const OrbitConfigSchema = z.object({
  rings: z.array(OrbitRingSchema).default([
    { radius: 86, capacity: 3, startAngle: -90 },
    { radius: 158, capacity: 7, startAngle: -66 },
    { radius: 232, capacity: 20, startAngle: -100 },
  ]),
  minDiameter: z.number().default(34),
  maxDiameter: z.number().default(74),
  /**
   * Measure the captions and push each ring out until two neighbours' captions
   * clear each other — the same bargain the Compass strikes, on the constraint
   * Orbit actually has, which is angular: a ring holds its captions when the
   * *chord* between two bubbles is wider than the caption between them. Rings
   * keep the gaps they were configured with, growth is bounded by the viewport,
   * and a caption that still does not fit truncates. `false` pins the radii.
   */
  fitLabels: z.boolean().default(true),
  /** How much a single invocation grows a command's pull on the field. */
  learnIncrement: z.number().default(16),
  /** Ceiling on learned weight, so one command cannot swallow the field. */
  maxWeight: z.number().default(120),
})

/**
 * A rune the user bound to a command — drawn on the field, or taken from the
 * shipped lexicon.
 *
 * This is the one part of the config that is *content* rather than a knob, and it
 * is here rather than in the command descriptor because the descriptor is the
 * host's: a host ships commands, a user decides which stroke casts which one, and
 * that decision has to survive a reload through the same persist pair as
 * everything else.
 *
 * Every field defaults, including the two that are really identity (the
 * fail-loud exception is for *required input*, and a config is never that — a
 * half-written rune from a storage value must parse, not brick the menu). What
 * protects the surface is `isBoundRune`: a rune with no command or fewer than two
 * points is dropped when the lexicon is resolved, not when it is read.
 */
export const SigilRuneSchema = z.object({
  commandId: z.string().default(''),
  /**
   * The lexicon glyph this was taken from, when it was picked rather than drawn.
   * Display only — the points below are what the recognizer sees either way, so a
   * picked rune the user then redraws does not keep lying about its name.
   */
  name: z.string().default(''),
  /** Polyline in the same 0–100 author box a lexicon glyph is written in. */
  points: z.array(z.tuple([z.number(), z.number()])).default([]),
})

export type SigilRune = z.infer<typeof SigilRuneSchema>

/**
 * The shortest `autoCastDelayMs` the reading card is worth showing for.
 *
 * The card is a *grace period made visible* — it names what was read, says how
 * sure the field is, and gives you the beat in which to see it before the command
 * runs. Below this the beat is not there: the card pops, its progress bar has no
 * time to travel, and it is gone again before it can be read. That is a flash of
 * chrome, not a confirmation, so a field tuned this fast skips it and casts —
 * which is what a user asking for a sub-400ms delay is asking for.
 *
 * It gates *only* the countdown. A reading that is not going to cast keeps its
 * card at any delay, because the timer is not what puts it there: an uncertain
 * reading is a question with two answers on it, and a command that cannot run is
 * an explanation that has to arrive ("unavailable is never invisible"). Neither
 * is on a clock, so neither
 * is shortened by one.
 */
export const READING_CARD_MIN_DELAY_MS = 400

export const SigilConfigSchema = z.object({
  /**
   * The runes this user has bound, by command id. Empty by default and on a fresh
   * install: the library ships exactly one rune bound to anything — the
   * top-to-bottom stroke that closes the field — and it is the library's, not a
   * command's. Every other rune is drawn or picked by the person casting it.
   */
  runes: z.array(SigilRuneSchema).default([]),
  /** The Lexicon panel — the crib sheet, and where a rune is bound, changed or taken away. */
  showLexicon: z.boolean().default(true),
  /** Below this the reading is offered as a choice instead of cast outright. */
  confidenceThreshold: z.number().min(0).max(1).default(0.5),
  /**
   * Grace period before a confident reading casts itself. `0` casts instantly.
   *
   * It is also what decides whether the reading card is shown at all — see
   * `READING_CARD_MIN_DELAY_MS`.
   */
  autoCastDelayMs: z.number().int().min(0).default(760),
  /** Strokes shorter than this are treated as a slip, not a glyph. */
  minStrokePoints: z.number().int().min(2).default(8),
  minStrokeLength: z.number().default(44),
  ringDiameter: z.number().default(236),
})

/**
 * The grain of the pad's patch — the one thing on it that is pure texture.
 *
 * Ids only, here: the schema decides what a *stored* value may be, and a
 * background is one of a closed list precisely so a config written by an older
 * version parses. What each id looks like is a Tailwind class and lives with the
 * thing that paints it (`components/padBackgrounds.ts`), the same split
 * `SURFACE_IDS` and `SURFACES` already run on.
 *
 * `none` is a first-class member rather than a nullable field: "flat fill" is a
 * choice a user makes, not the absence of one, and it keeps every read site free
 * of a `??` ("every persisted field declares a default").
 */
export const PAD_BACKGROUND_IDS = ['dots', 'ruled', 'grid', 'hatch', 'none'] as const

export const PadBackgroundSchema = z.enum(PAD_BACKGROUND_IDS)
export type PadBackground = z.infer<typeof PadBackgroundSchema>

/**
 * 05B's own knobs — the things that make it more than "Sigil, plus a pad".
 *
 * The first is structural. Every other direction has exactly one way in, so
 * "which surface opens" is answered by `surface` alone. The pad direction has two:
 * the pad, where the press *is* the first millimetre of the stroke, and everything
 * else — a right-click on the card around it, the ⋮ button, `Shift+F10`. Sending
 * both to the casting field is the historical answer and stays the default;
 * pointing the second one at a listy direction is the interesting configuration,
 * because it is what lets the gesture be the expert path without making it the
 * only path.
 *
 * `sigil-pad` is a legal value for it and means what it looks like — the field,
 * with no pad to have come from, which is `sigil`. It is left out of the settings
 * panel's options rather than out of the type: a second hand-written list of the
 * directions is exactly what the registry exists to prevent.
 *
 * The other two are the pad's *face*, and they are knobs because the pad is the
 * one thing this library leaves standing on a host's own card — on screen before
 * any menu is invoked and whether or not one ever is. How loudly it announces
 * itself is therefore the host user's call and not a constant: a first-run pad
 * has to say what it is, and the hand that has cast a hundred glyphs off it is
 * being told something it knows every time it looks at the card.
 */
export const SigilPadConfigSchema = z.object({
  secondarySurface: SurfaceIdSchema.default('sigil'),
  /** The patch's texture. `dots` is the grain the pad has always carried. */
  background: PadBackgroundSchema.default('dots'),
  /**
   * The pad's cast signalling — the traced glyph and the word beneath it, which
   * together are how the patch says *casting happens here*.
   *
   * Off, the patch keeps everything that is not an announcement: its dashed edge,
   * its grain, its crosshair cursor, the hover and focus treatments, and — this is
   * the line the knob must not cross — its accessible name, which is the only way
   * the affordance ever reached a screen reader in the first place. So what is
   * turned off is the *visual* label of a learned affordance, never the control
   * and never its explanation ("unavailable is never invisible").
   */
  showSignal: z.boolean().default(true),
})

export const ContextMenuConfigSchema = z.object({
  /** Which of the seven surfaces opens on invocation. */
  surface: SurfaceIdSchema.default('whisper'),
  /**
   * Learned usage, keyed by command id. Layered on top of each command's own
   * `weight` — this is the part of the config that makes Orbit and Whisper
   * "learn you", and the main reason persistence exists at all.
   */
  usage: z.record(z.string(), z.number()).default({}),
  /** Master switch for learning. Off freezes the ranking wherever it stands. */
  learnFromUsage: z.boolean().default(true),
  /** Command ids the user has hidden from every surface. */
  hiddenCommandIds: z.array(z.string()).default([]),
  // `.default(() => X.parse({}))`, not `.default({})` and not `.prefault({})`.
  //
  // What the defaults rule asks for is that an *absent* nested object arrives fully
  // populated, and the two majors spell that differently: in Zod 3 a `.default`
  // value is the schema's *input* and is parsed, so `.default({})` would do it;
  // in Zod 4 it is the *output* and skips parsing, so `.default({})` would put a
  // literal `{}` in the config and `.prefault({})` is the one that parses. This
  // library is peer-compatible with both (hosts mount it against their own zod),
  // so neither spelling is available — but handing `.default` an already-parsed
  // object means the same thing under either rule: Zod 3 re-parses a complete,
  // valid object to itself, Zod 4 passes it straight through.
  //
  // The default is a *function* on purpose. A bare object would be one shared
  // reference handed to every parse, so a host mutating its config would reach
  // into everyone else's; a factory hands out a fresh object each time.
  sound: SoundConfigSchema.default(() => SoundConfigSchema.parse({})),
  whisper: WhisperConfigSchema.default(() => WhisperConfigSchema.parse({})),
  compass: CompassConfigSchema.default(() => CompassConfigSchema.parse({})),
  strata: StrataConfigSchema.default(() => StrataConfigSchema.parse({})),
  orbit: OrbitConfigSchema.default(() => OrbitConfigSchema.parse({})),
  sigil: SigilConfigSchema.default(() => SigilConfigSchema.parse({})),
  // Keyed by the surface id, hyphen and all, like every other sub-object here —
  // which is what lets `test/surface-settings.test.ts` check "this direction has
  // knobs" by looking the id up rather than by carrying a map of its own.
  'sigil-pad': SigilPadConfigSchema.default(() => SigilPadConfigSchema.parse({})),
})

export type ContextMenuConfigInput = z.input<typeof ContextMenuConfigSchema>
export type ContextMenuConfig = z.infer<typeof ContextMenuConfigSchema>
export type SoundConfig = z.infer<typeof SoundConfigSchema>
export type OrbitConfig = z.infer<typeof OrbitConfigSchema>
export type SigilPadConfig = z.infer<typeof SigilPadConfigSchema>

/**
 * Parse anything that came out of storage into a complete config.
 *
 * Unparseable input is *not* fatal: a corrupt or foreign localStorage value must
 * not brick the menu, and there is a correct fallback (the defaults). The caller
 * is told through `onInvalid` so the failure is visible rather than silent.
 */
export function parseConfig(
  value: unknown,
  onInvalid?: (error: z.ZodError) => void,
): ContextMenuConfig {
  const result = ContextMenuConfigSchema.safeParse(value ?? {})
  if (result.success) return result.data
  onInvalid?.(result.error)
  return ContextMenuConfigSchema.parse({})
}

/** The complete default config — useful as a baseline in tests and settings UIs. */
export function defaultConfig(): ContextMenuConfig {
  return ContextMenuConfigSchema.parse({})
}
