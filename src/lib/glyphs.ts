/**
 * The Lexicon — the invented alphabet Sigil reads.
 *
 * A glyph is a named unistroke in a 0–100 author-space box. Nothing here is bound
 * to a command: the runes below are a *palette* the user can take from, alongside
 * the strokes they draw themselves, and both arrive as `config.sigil.runes`. A
 * host may still bind one up front by naming it in `Command.glyph`, which is how
 * a host ships its own alphabet — but the shipped library binds none of them.
 *
 * The one exception is {@link DISMISS_GLYPH}, which is the library's own rune
 * rather than a command's.
 *
 * The shapes are deliberately drawable in one motion and pairwise distinct under
 * the recognizer's distance metric — two runes that differ only in a corner will
 * be confused at speed no matter how good the matcher is.
 */
import { resample, type StrokePoint } from './unistroke.ts'

export type Glyph = {
  /**
   * Unique within a lexicon, and what `Command.glyph` points at. A rune the user
   * drew has no name — it is a shape and nothing else — so this is `''` there,
   * and display sites go through `runeDisplayNameOf`.
   */
  name: string
  /** Polyline in a 0–100 box. Scale-, position-, and stroke-width-independent. */
  points: readonly (readonly [number, number])[]
}

/**
 * The one rune the library ships bound to anything: a single stroke from the top
 * straight down, which closes the field.
 *
 * It belongs to the *field*, not to a command — leaving is the one thing every
 * casting session needs and no host command provides, so it cannot be left to a
 * binding the user has not made yet. A fresh install can therefore always get out
 * by drawing, before it has an alphabet at all.
 *
 * It is also why `Descent` is not in the palette below: the same shape offered
 * twice is a rune the recognizer cannot separate from the way out.
 */
export const DISMISS_GLYPH: Glyph = {
  name: 'Dismiss',
  points: [
    [50, 0],
    [50, 100],
  ],
}

function circlePoints(): [number, number][] {
  const points: [number, number][] = []
  for (let step = 0; step <= 26; step++) {
    const angle = (step / 26) * 2 * Math.PI - Math.PI / 2
    points.push([50 + 50 * Math.cos(angle), 50 + 50 * Math.sin(angle)])
  }
  return points
}

function wavePoints(): [number, number][] {
  const points: [number, number][] = []
  for (let step = 0; step <= 26; step++) {
    const progress = step / 26
    points.push([100 * progress, 50 - 42 * Math.sin(progress * 2 * Math.PI)])
  }
  return points
}

/**
 * The palette a user picks from when they would rather not invent a stroke.
 * Nothing here is bound until someone binds it — see the note at the top.
 */
export const DEFAULT_GLYPHS: Glyph[] = [
  { name: 'Flow', points: [[0, 50], [100, 50]] }, // ─→
  { name: 'Rift', points: [[0, 100], [100, 0]] }, // ╱
  { name: 'Spire', points: [[0, 70], [50, 0], [100, 70]] }, // ∧
  { name: 'Vale', points: [[0, 0], [50, 70], [100, 0]] }, // ∨
  { name: 'Glide', points: [[90, 0], [0, 50], [90, 100]] }, // ‹
  { name: 'Prism', points: [[10, 0], [100, 50], [10, 100]] }, // ›
  { name: 'Mount', points: [[50, 0], [100, 90], [0, 90], [50, 0]] }, // △
  { name: 'Frame', points: [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]] }, // □
  { name: 'Ouro', points: circlePoints() }, // ○
  { name: 'Cusp', points: [[100, 0], [25, 0], [0, 50], [25, 100], [100, 100]] }, // C
  { name: 'Ell', points: [[10, 0], [10, 100], [100, 100]] }, // L
  { name: 'Zeta', points: [[0, 0], [100, 0], [0, 100], [100, 100]] }, // Z
  { name: 'Sine', points: wavePoints() }, // ∿
  { name: 'Tick', points: [[0, 55], [35, 95], [100, 0]] }, // ✓
  { name: 'Home', points: [[0, 100], [0, 45], [50, 0], [100, 45], [100, 100]] }, // ⌂
]

/**
 * How many points a drawn rune is stored as.
 *
 * Lower than the recognizer's own `RESAMPLE_COUNT`: a rune is re-resampled to 48
 * before it is ever compared, so storing 48 would only make the persisted config
 * twice as long for shape the matcher reconstructs anyway. 24 is plenty to keep a
 * circle from reading as a square.
 */
export const RUNE_POINT_COUNT = 24

/**
 * Turn a stroke drawn in screen pixels into a rune written the way the lexicon
 * writes one — evenly spaced, and fitted into the 0–100 box.
 *
 * Aspect ratio is preserved and the short axis centred, exactly as `glyphPath`
 * draws one: the recognizer scales by the longer axis too, so a rune stored this
 * way is compared against the shipped ones on identical terms. A perfectly
 * straight stroke has zero extent across, which lands it on the box's centre line
 * rather than dividing by it.
 */
export function glyphPointsFromStroke(
  strokePoints: readonly StrokePoint[],
  count: number = RUNE_POINT_COUNT,
): [number, number][] {
  const spaced = resample(strokePoints, count)
  if (spaced.length === 0) return []

  const xs = spaced.map((point) => point.x)
  const ys = spaced.map((point) => point.y)
  const minimumX = Math.min(...xs)
  const maximumX = Math.max(...xs)
  const minimumY = Math.min(...ys)
  const maximumY = Math.max(...ys)
  const span = Math.max(maximumX - minimumX, maximumY - minimumY) || 1
  const offsetX = (100 - ((maximumX - minimumX) / span) * 100) / 2
  const offsetY = (100 - ((maximumY - minimumY) / span) * 100) / 2

  return spaced.map((point) => [
    // One decimal: the recognizer works in a unit box, so anything finer is noise
    // that only lengthens what a host has to persist.
    Number((offsetX + ((point.x - minimumX) / span) * 100).toFixed(1)),
    Number((offsetY + ((point.y - minimumY) / span) * 100).toFixed(1)),
  ])
}

/**
 * SVG `d` for a glyph, scaled and centred into a `size` box with `padding`.
 * Aspect ratio is preserved — a squashed rune stops reading as the same rune.
 */
export function glyphPath(
  points: readonly (readonly [number, number])[],
  size: number,
  padding: number,
): string {
  if (points.length === 0) return ''
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minimumX = Math.min(...xs)
  const maximumX = Math.max(...xs)
  const minimumY = Math.min(...ys)
  const maximumY = Math.max(...ys)
  const span = Math.max(maximumX - minimumX, maximumY - minimumY) || 1
  const box = size - padding * 2
  const offsetX = (box - ((maximumX - minimumX) / span) * box) / 2
  const offsetY = (box - ((maximumY - minimumY) / span) * box) / 2
  return points
    .map(([x, y], index) => {
      const placedX = padding + offsetX + ((x - minimumX) / span) * box
      const placedY = padding + offsetY + ((y - minimumY) / span) * box
      return `${index === 0 ? 'M' : 'L'}${placedX.toFixed(1)} ${placedY.toFixed(1)}`
    })
    .join(' ')
}
