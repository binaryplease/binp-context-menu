import { describe, expect, test } from 'bun:test'
import { DEFAULT_GLYPHS } from '../src/lib/glyphs.ts'
import {
  normalize,
  pathLength,
  prepareTemplate,
  recognize,
  resample,
  RESAMPLE_COUNT,
  type StrokePoint,
} from '../src/lib/unistroke.ts'

const TEMPLATES = DEFAULT_GLYPHS.map((glyph) =>
  prepareTemplate(glyph.name, glyph.points.map(([x, y]) => ({ x, y }))),
)

/** Redraw a glyph the way a hand would: offset, scaled, and slightly noisy. */
function drawLike(glyphName: string, offsetX: number, offsetY: number, scale: number): StrokePoint[] {
  const glyph = DEFAULT_GLYPHS.find((candidate) => candidate.name === glyphName)
  if (glyph === undefined) throw new Error(`no glyph named ${glyphName}`)
  // Densify so the stroke resembles a real pointer trail, not four corners.
  const dense = resample(
    glyph.points.map(([x, y]) => ({ x, y })),
    60,
  )
  return dense.map((point, index) => ({
    x: offsetX + point.x * scale + Math.sin(index) * 0.9,
    y: offsetY + point.y * scale + Math.cos(index) * 0.9,
  }))
}

describe('resample', () => {
  test('produces exactly the requested point count', () => {
    const points = resample([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], RESAMPLE_COUNT)
    expect(points).toHaveLength(RESAMPLE_COUNT)
  })

  test('preserves the endpoints and the total path length', () => {
    const original: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
    ]
    const points = resample(original, 32)
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[points.length - 1]!.x).toBeCloseTo(30, 5)
    expect(points[points.length - 1]!.y).toBeCloseTo(40, 5)
    // Resampling walks the path in fixed steps, so the final step is clipped —
    // the length is preserved to well within a percent, not exactly.
    const lengthDrift = Math.abs(pathLength(points) - pathLength(original))
    expect(lengthDrift).toBeLessThan(pathLength(original) * 0.01)
  })

  test('a degenerate stroke does not hang or produce NaN', () => {
    const points = resample([{ x: 5, y: 5 }, { x: 5, y: 5 }], 16)
    expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true)
  })
})

describe('normalize', () => {
  test('is blind to translation and scale', () => {
    const shape: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]
    const moved = shape.map((point) => ({ x: point.x * 7 + 400, y: point.y * 7 - 120 }))
    const first = normalize(shape)
    const second = normalize(moved)
    first.forEach((point, index) => {
      expect(point.x).toBeCloseTo(second[index]!.x, 6)
      expect(point.y).toBeCloseTo(second[index]!.y, 6)
    })
  })
})

describe('recognize', () => {
  test('reads every shipped glyph back from a shaky, offset, rescaled redraw', () => {
    for (const glyph of DEFAULT_GLYPHS) {
      const drawn = drawLike(glyph.name, 320, 180, 2.4)
      const [best] = recognize(drawn, TEMPLATES)
      expect(best!.meta).toBe(glyph.name)
      expect(best!.confidence).toBeGreaterThan(0.5)
    }
  })

  test('orientation is meaning: a flipped stroke reads as a different rune', () => {
    // Spire (∧) drawn upside-down must not come back as Spire — it is Vale (∨).
    const spire = drawLike('Spire', 0, 0, 1)
    const flipped = spire.map((point) => ({ x: point.x, y: -point.y }))
    const [best] = recognize(flipped, TEMPLATES)
    expect(best!.meta).not.toBe('Spire')
  })

  test('returns candidates ordered best-first, so the runner-up is the alternative', () => {
    const scored = recognize(drawLike('Mount', 0, 0, 1), TEMPLATES)
    expect(scored).toHaveLength(TEMPLATES.length)
    for (let index = 1; index < scored.length; index++) {
      expect(scored[index]!.distance).toBeGreaterThanOrEqual(scored[index - 1]!.distance)
    }
  })

  test('an unrecognizable scribble comes back with low confidence, not a false read', () => {
    const scribble: StrokePoint[] = Array.from({ length: 40 }, (_unused, index) => ({
      x: 50 + Math.sin(index * 2.7) * 40,
      y: 50 + Math.cos(index * 3.9) * 40,
    }))
    const [best] = recognize(scribble, TEMPLATES)
    expect(best!.confidence).toBeLessThan(0.5)
  })
})
