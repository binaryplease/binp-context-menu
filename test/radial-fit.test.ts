/**
 * The maths behind "the wheel serves the labels".
 *
 * These are the parts of the radial sizing that can be checked without a
 * browser: how far a placed label reaches, how wide it may be drawn to stay
 * inside a rim, and the fixed point that turns those two into a diameter. The
 * measuring itself is the DOM's job and is verified on screen — but the geometry
 * it feeds is arithmetic, and arithmetic is testable.
 */
import { describe, expect, test } from 'bun:test'
import {
  chordWidthOnRing,
  fitFieldRadius,
  labelReach,
  labelWidthCap,
  labelWidthWithin,
  ringRadiusForChord,
  type LabelPlacement,
} from '../src/lib/radialFit.ts'
import { polar } from '../src/lib/geometry.ts'

/** A label of `width` riding at `radius`, at `angle`, turned to stay readable. */
function radialLabel(radius: number, angleDegrees: number, width: number, height = 14): LabelPlacement {
  const turn = ((angleDegrees % 360) + 360) % 360
  return {
    centre: polar(0, 0, radius, angleDegrees),
    rotationDegrees: turn > 90 && turn < 270 ? turn + 180 : turn,
    width,
    height,
  }
}

describe('how far a placed label reaches', () => {
  test('a label rotated along its arc costs the same at every angle', () => {
    const reaches = [0, 45, 90, 137, 180, 225, 314].map((angle) =>
      labelReach(radialLabel(140, angle, 120)),
    )
    for (const reach of reaches) expect(reach).toBeCloseTo(reaches[0]!, 6)
  })

  test('the same string costs less horizontally at 12 o’clock than at 3', () => {
    // The reason the fit cannot be a character count times a constant: an
    // unrotated label at the top spends its width *across* the radius, so it
    // pokes out far less than the identical label out to the right.
    const atThree = labelReach({ centre: polar(0, 0, 140, 0), rotationDegrees: 0, width: 120, height: 14 })
    const atTwelve = labelReach({ centre: polar(0, 0, 140, -90), rotationDegrees: 0, width: 120, height: 14 })
    expect(atThree).toBeGreaterThan(atTwelve + 40)
    // Out to the right it is simply half the label past its centre, plus the
    // half-height of the box.
    expect(atThree).toBeCloseTo(Math.hypot(140 + 60, 7), 6)
  })

  test('a label with no size reaches exactly its own centre', () => {
    expect(labelReach({ centre: { x: 30, y: 40 }, rotationDegrees: 33, width: 0, height: 0 })).toBe(50)
  })
})

describe('the widest a label may be drawn', () => {
  test('inverts the reach — a label cut to the limit reaches exactly it', () => {
    for (const angle of [0, 37, 90, 200, 310]) {
      const placement = radialLabel(140, angle, 0)
      const width = labelWidthWithin(placement, 210)
      expect(labelReach({ ...placement, width })).toBeCloseTo(210, 6)
    }
  })

  test('is nothing at all when the label’s own height already overruns', () => {
    expect(labelWidthWithin(radialLabel(200, 0, 80), 100)).toBe(0)
  })
})

describe('the diameter that holds every label', () => {
  // The Compass relation: a label rides halfway between the kind ring and the
  // rim, so the answer feeds back into itself.
  const KIND_RING = 98
  const fitFor = (labels: { angle: number; width: number }[], options: Partial<Parameters<typeof fitFieldRadius>[0]> = {}) =>
    fitFieldRadius({
      placementsAt: (outerRadius) =>
        labels.map(({ angle, width }) => radialLabel((KIND_RING + outerRadius) / 2, angle, width, 0)),
      minRadius: 178,
      maxRadius: 600,
      padding: 8,
      ...options,
    })

  test('solves the fixed point a label halfway out puts it in', () => {
    // reach = (kind + radius)/2 + width/2, and that plus the padding is the
    // radius — which rearranges to kind + width + 2·padding. Whole pixels,
    // because the solver rounds outward rather than landing a hair short.
    expect(fitFor([{ angle: 0, width: 240 }])).toBe(KIND_RING + 240 + 16)
  })

  test('the longest label decides it, not the last one', () => {
    const longest = fitFor([{ angle: 0, width: 240 }])
    expect(
      fitFor([{ angle: 20, width: 60 }, { angle: 0, width: 240 }, { angle: 90, width: 30 }]),
    ).toBe(longest)
  })

  test('never comes out under the configured floor', () => {
    expect(fitFor([])).toBe(178)
    expect(fitFor([{ angle: 0, width: 20 }])).toBe(178)
  })

  test('never comes out over the ceiling', () => {
    expect(fitFor([{ angle: 0, width: 4000 }])).toBe(600)
  })
})

describe('the room between two neighbours on a ring', () => {
  test('a radius sized for a caption leaves exactly that caption’s width', () => {
    for (const count of [2, 3, 7, 15]) {
      const radius = ringRadiusForChord(160, count, 8)
      expect(chordWidthOnRing(radius, count, 8)).toBeCloseTo(160, 6)
    }
  })

  test('a lone bubble on a ring has no neighbour to clear', () => {
    expect(ringRadiusForChord(400, 1, 8)).toBe(0)
    expect(chordWidthOnRing(86, 1, 8)).toBe(Number.POSITIVE_INFINITY)
  })

  test('more captions on the same ring leave each of them less room', () => {
    expect(chordWidthOnRing(232, 20, 8)).toBeLessThan(chordWidthOnRing(232, 8, 8))
  })
})

describe('when a label is capped', () => {
  test('is left uncapped while it fits — including by a rounded hair', () => {
    expect(labelWidthCap(120, 160)).toBeUndefined()
    expect(labelWidthCap(160, 160)).toBeUndefined()
    // `offsetWidth` is an integer and the fit stops a quarter-pixel short, so a
    // label that fits can measure a whisker over. That is not a truncation.
    expect(labelWidthCap(160.4, 160)).toBeUndefined()
  })

  test('is capped to the room it has once it genuinely overruns', () => {
    expect(labelWidthCap(240, 160)).toBe(160)
  })
})
