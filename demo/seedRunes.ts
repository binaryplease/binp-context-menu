/**
 * The demo's starting alphabet — six runes already bound, so the casting field
 * can be *cast on* the first time it opens.
 *
 * Read the placement first, because it is the whole argument: nothing here is a
 * library binding. The library still ships exactly one rune and it is the
 * field's way out (`DISMISS_GLYPH`), `SigilConfigSchema.runes` still defaults to
 * `[]`, and not one command in `commands.ts` carries a `glyph` — a host shipping
 * an alphabet is a different thing and stays unexercised. What this module writes
 * is `config.sigil.runes`, the *user's* array, with the same shape the field
 * writes when someone presses ＋ on a Lexicon row and takes a rune from the
 * palette. The demo is standing in for a visitor who already did that six times.
 *
 * Why do it at all: an empty Lexicon is the right first run for a *product* and
 * the wrong first run for a *demo*. A visitor who lands on the published page has
 * one direction out of seven that does nothing until they invent an alphabet, and
 * "draw a shape, then draw it again over a card" is a lot to ask before anything
 * has been shown to work. So the demo hands them a hand full of strokes and lets
 * the ＋ beside the other twenty-five commands make the point about who owns the
 * alphabet.
 *
 * Two rules keep the seed from becoming a binding the user cannot get rid of:
 *
 * - **It runs once per browser, ever** (`hasSeededRunes` / `markRunesSeeded`).
 *   Unbind all six and reload and they stay gone — a seed that came back would be
 *   the library re-pointing a gesture, which is precisely what `runes.ts` orders
 *   its resolution to prevent.
 * - **It never overwrites a binding that exists.** `withSeededRunes` drops a seed
 *   whose command is already spoken for *or* whose name already casts something
 *   else, which are the two invariants `bindRuneRecipe` maintains (one rune per
 *   command, one owner per named rune).
 */
import { DEFAULT_GLYPHS, type ContextMenuConfig, type Glyph, type SigilRune } from '../src/index.ts'

/**
 * Set the first time the seed is applied, and never read for anything else.
 *
 * Separate from the config key because it answers a different question. The
 * config says what the user's alphabet *is*; this says whether the demo has
 * already had its one say about it — and the honest answer survives the user
 * emptying the alphabet back out again.
 */
const SEED_MARKER_KEY = 'binp-context-menu-demo-runes-seeded'

/**
 * Which stroke starts out casting what.
 *
 * Every one is a *named* rune from the shipped palette rather than an invented
 * point list: a picked rune is the path a first-time visitor is most likely to
 * take, the Lexicon then shows them a name they can find in the palette, and the
 * shapes are already pairwise distinct under the recognizer (see `glyphs.ts`) so
 * six of them cannot be tuned into collisions from here.
 *
 * The set is chosen to put one of each *kind* of outcome under a gesture:
 * something that just runs, something monospaced from the run lane, something
 * destructive (Cancel, so the reading card's danger tone is one stroke away), and
 * an act verb on the card itself (Mark reviewed).
 *
 * None of the six is the *blocked* command, and that is deliberate now: a seeded
 * stroke that can only ever produce a disabled-with-explanation refusal is a
 * gesture the
 * visitor was handed and can never complete. `storybook` carries the block
 * instead, sits one row down in the Lexicon with an empty socket, and shows the
 * refusal to anyone who binds it a rune themselves.
 */
const SEED_BINDINGS: readonly { commandId: string; glyphName: string }[] = [
  { commandId: 'continue', glyphName: 'Flow' }, // ─→  carry on: the straight push forward
  { commandId: 'build', glyphName: 'Spire' }, // ∧   up and over the peak
  { commandId: 'dev', glyphName: 'Sine' }, // ∿   the one that keeps running
  { commandId: 'new-task', glyphName: 'Mount' }, // △   close a shape: make a new thing
  { commandId: 'cancel', glyphName: 'Rift' }, // ╱   a stroke through it
  { commandId: 'reviewed', glyphName: 'Tick' }, // ✓   the obvious one, on the obvious verb
]

/**
 * The palette glyph by name, or a thrown error.
 *
 * A seed naming a rune the palette does not have is a typo in this file, and the
 * quiet failure is worse than the loud one: `resolveRune` would answer "this
 * command has no rune", the Lexicon row would show an empty socket, and the demo
 * would look like the seed simply did not work.
 */
function glyphNamed(name: string): Glyph {
  const glyph = DEFAULT_GLYPHS.find((candidate) => candidate.name === name)
  if (glyph === undefined) {
    throw new Error(`demo: no rune named "${name}" in the lexicon — see DEFAULT_GLYPHS`)
  }
  return glyph
}

/** The seed as the config stores it — points copied mutable, exactly as a bind does. */
export const SEEDED_RUNES: readonly SigilRune[] = SEED_BINDINGS.map(({ commandId, glyphName }) => {
  const glyph = glyphNamed(glyphName)
  return {
    commandId,
    name: glyph.name,
    points: glyph.points.map(([x, y]) => [x, y] as [number, number]),
  }
})

/** Has this browser already been handed the starting alphabet? */
export function hasSeededRunes(): boolean {
  return window.localStorage.getItem(SEED_MARKER_KEY) !== null
}

/** Record that it has — so this is the only time the demo writes runes it was not asked for. */
export function markRunesSeeded(): void {
  window.localStorage.setItem(SEED_MARKER_KEY, 'true')
}

/**
 * The user's alphabet with the demo's starting one folded in underneath it.
 *
 * Pure, so the call site decides *when* it runs — orchestration stays separate
 * from logic — and the test can ask what it does without a browser.
 */
export function withSeededRunes(config: ContextMenuConfig): ContextMenuConfig {
  const boundCommandIds = new Set(config.sigil.runes.map((rune) => rune.commandId))
  const takenNames = new Set(
    config.sigil.runes.map((rune) => rune.name).filter((name) => name !== ''),
  )
  const fresh = SEEDED_RUNES.filter(
    (rune) => !boundCommandIds.has(rune.commandId) && !takenNames.has(rune.name),
  )
  if (fresh.length === 0) return config
  return { ...config, sigil: { ...config.sigil, runes: [...config.sigil.runes, ...fresh] } }
}
