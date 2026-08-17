/**
 * The command descriptor — the *what*, to the provider's *how*.
 *
 * Every one of the seven surfaces renders this one shape. A surface may not
 * re-derive a command list, invent its own labels, or decide on its own which
 * commands apply: it receives `Command[]` and paints them. That is what keeps a
 * command from existing on the wheel but not in the search box.
 *
 * Zod is the single source of truth ("Zod is the type source") — the TypeScript
 * types below are
 * inferred, never hand-written in parallel. The provider parses host input once
 * at the library boundary so a malformed command list fails at mount with a
 * readable path, not three renders later inside a radial layout calculation.
 */
import { z } from 'zod'
import type { ComponentType } from 'react'

/**
 * Icons are Tabler components — never emoji or Unicode glyphs, per "real vector
 * icons, never characters". The prop shape is Tabler's, narrowed to what the
 * surfaces actually set.
 */
export type CommandIconComponent = ComponentType<{
  size?: number | string
  stroke?: number
  className?: string
}>

/**
 * A plain function component is one shape; `forwardRef` and `memo` produce
 * objects carrying a `$$typeof` symbol instead — and every Tabler icon is a
 * `forwardRef`. Checking only for `typeof === 'function'` would reject the icon
 * set this project defaults to.
 */
function isRenderableComponent(value: unknown): boolean {
  if (typeof value === 'function') return true
  return typeof value === 'object' && value !== null && '$$typeof' in value
}

const CommandIconSchema = z.custom<CommandIconComponent>(isRenderableComponent, {
  message: 'icon must be a React component (e.g. an @tabler/icons-react icon)',
})

/**
 * A command's own handler. Deliberately parameterless: typing it as
 * `(command: Command) => void` would make `Command` reference the schema that
 * defines it. Hosts that want the command close over it, and the provider's
 * `onRun` receives it explicitly anyway.
 */
export type CommandRunHandler = () => void

const CommandRunSchema = z.custom<CommandRunHandler>((value) => typeof value === 'function', {
  message: 'run must be a function',
})

/**
 * Schemes that execute script in the page rather than navigating to a document.
 * A menu's `href` is host data, and host data is frequently machine-derived — the
 * case that motivated this is a URL scraped out of a running command's log
 * output — so the
 * default here has to fail safe: anything that could turn a scraped string into
 * script is rejected at the boundary, and a host that means it uses `run`.
 */
const SCRIPT_SCHEMES = ['javascript:', 'data:', 'vbscript:']

/**
 * Is this `href` safe to hand a real anchor?
 *
 * Browsers strip ASCII tab and newlines from *anywhere* in a URL and skip leading
 * C0 control characters before deciding its scheme, so `java\tscript:alert(1)`
 * and `javascript:…` are both `javascript:` URLs. The same normalisation
 * has to happen here or the check is one whitespace character from useless.
 *
 * Everything else is allowed: relative paths, `http(s):`, `mailto:`, and the
 * app schemes a desktop host reaches for (`vscode://`, `file://`).
 */
export function isSafeHref(href: string): boolean {
  let normalized = ''
  for (const character of href) {
    const codePoint = character.codePointAt(0) ?? 0
    // Tab, LF and CR are stripped wherever they appear…
    if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) continue
    // …and C0 controls plus spaces are skipped only at the front.
    if (normalized === '' && codePoint <= 0x20) continue
    normalized += character
  }
  const lowered = normalized.toLowerCase()
  return !SCRIPT_SCHEMES.some((scheme) => lowered.startsWith(scheme))
}

const CommandHrefSchema = z.string().refine(isSafeHref, {
  message: `href must not use a script-executing scheme (${SCRIPT_SCHEMES.join(', ')})`,
})

/**
 * A kind is the semantic lane a command belongs to — Act, Run, Open, Make in the
 * menu this library grew out of. Kinds drive colour on every surface, the wheel's
 * arcs on Compass, and the lanes on Strata, so they are data the host supplies,
 * not an enum baked into the library.
 *
 * `id` and `label` carry no default: they are identity and required input, the
 * honest exception in "every persisted field declares a default". Everything else
 * defaults so a host can add a kind field later without touching existing call
 * sites.
 */
export const CommandKindSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(''),
  /** Any CSS colour. Surfaces derive their tints from it with `color-mix`. */
  color: z.string().default('#7c3aed'),
  /**
   * Where this kind sits on the Compass wheel, in degrees clockwise from
   * 3 o'clock. `null` spreads the kinds evenly in declaration order.
   */
  compassAngle: z.number().nullable().default(null),
})

export type CommandKindInput = z.input<typeof CommandKindSchema>
export type CommandKind = z.infer<typeof CommandKindSchema>

export const CommandSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Must match a `CommandKind.id` supplied to the provider. */
  kindId: z.string().min(1),
  icon: CommandIconSchema.nullable().default(null),
  /** Used where space is tight — the Compass ring, the Strata lanes. */
  shortLabel: z.string().nullable().default(null),
  /** Trailing affordance hint, e.g. `⏎`. Rendered by the list surfaces. */
  hint: z.string().nullable().default(null),
  /**
   * Secondary detail shown beside the label — the dim half of a two-part row: the
   * context a scraped URL came with, what a transition will do, which branch a
   * command acts on.
   *
   * It is a separate field rather than richer markup in `label` because `label`
   * has three text-only readers: the fuzzy matcher segments it character by
   * character, the Compass hub prints it as the wheel's one sentence, and the
   * Sigil reading card sets it in the accent face. A `ReactNode` label would
   * break all three.
   *
   * Not searched. Words that should match belong in `keywords`, which exists for
   * exactly that and is surfaced by Whisper when it is what produced the hit
   * ("a fuzzy match must be visible" — a match the user cannot see is not
   * allowed).
   */
  detail: z.string().nullable().default(null),
  /**
   * A URL this command opens. `CommandButton` renders such a command as a real
   * anchor, so middle-click, ⌘/ctrl-click, "copy link address" and the status-bar
   * preview all do what they do everywhere else — an `onClick` that called
   * `window.open` would swallow every one of them.
   *
   * Script-executing schemes are refused here, at the same boundary as the rest
   * of the descriptor: see {@link isSafeHref}.
   */
  href: CommandHrefSchema.nullable().default(null),
  /**
   * This command's effect is hard to undo — cancel, delete, discard.
   *
   * Every surface tints it with the danger token instead of its kind's colour
   * (`toneColorOf`), so it reads as destructive on the wheel and in the bubbles,
   * not only in the two list surfaces.
   */
  destructive: z.boolean().default(false),
  /** Render the label in the mono face — shell scripts and app slugs. */
  monospace: z.boolean().default(false),
  /** Extra words the fuzzy matcher should consider beyond the label. */
  keywords: z.array(z.string()).default([]),
  /** Starting weight before the user's own usage is layered on top. */
  weight: z.number().default(0),
  /**
   * Name of the Sigil glyph that casts this command. `null` means the command
   * has no rune and can only be reached from the other six surfaces.
   */
  glyph: z.string().nullable().default(null),
  /**
   * Why this command cannot run right now. Non-null renders the command
   * *disabled with the reason attached* on every surface — never hidden
   * ("unavailable is never invisible").
   */
  disabledReason: z.string().nullable().default(null),
  /** Per-command callback. The provider's `onRun` fires for every command too. */
  run: CommandRunSchema.nullable().default(null),
})

export type CommandInput = z.input<typeof CommandSchema>
export type Command = z.infer<typeof CommandSchema>

/** Text a surface shows when the full label will not fit. */
export function shortLabelOf(command: Command): string {
  return command.shortLabel === null ? command.label : command.shortLabel
}

/**
 * The plain-text summary for a native tooltip — the label, plus the detail the
 * surface may not have had room to draw.
 *
 * It stops there on purpose: `disabledReason` belongs to `CommandButton`'s own
 * explanation, which reaches a keyboard user as well as a pointer (rule 3 of
 * "unavailable is never invisible").
 * Repeating it in `title` would show the same sentence twice on the surfaces
 * that have both.
 */
export function titleTextOf(command: Command): string {
  return command.detail === null ? command.label : `${command.label} — ${command.detail}`
}

/** Everything the fuzzy matcher is allowed to look at. */
export function searchableTermsOf(command: Command, kind: CommandKind | null): string[] {
  const terms = [command.label, ...command.keywords]
  if (kind !== null) terms.push(kind.label)
  return terms
}
