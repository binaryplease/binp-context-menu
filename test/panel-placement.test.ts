/**
 * Where a floating panel lands once its size is known.
 *
 * Two alignments share one measure-then-place seam (`useAnchoredPanel`), and the
 * measuring is the DOM's job — but what the measurement is turned into is
 * arithmetic, and the failures are the ones a screenshot of the middle of the
 * viewport never shows: the corner press, the bottom edge, the panel that is
 * wider than the screen it has to fit on.
 */
import { describe, expect, test } from 'bun:test'
import { centreBelowPointer, clampToViewport, placeExplanation } from '../src/lib/geometry.ts'

const VIEWPORT_WIDTH = 1440
const VIEWPORT_HEIGHT = 900
const MARGIN = 12

/** Strata's own size at four lanes, which is what makes its placement interesting. */
const WALL_WIDTH = 616
const WALL_HEIGHT = 389

function placeWall(anchorX: number, anchorY: number) {
  return centreBelowPointer(
    anchorX,
    anchorY,
    WALL_WIDTH,
    WALL_HEIGHT,
    VIEWPORT_WIDTH,
    VIEWPORT_HEIGHT,
    MARGIN,
  )
}

describe('a panel centred under the pointer', () => {
  test('it straddles the press and hangs below it', () => {
    const placed = placeWall(700, 300)
    expect(placed.x + WALL_WIDTH / 2).toBe(700)
    expect(placed.y).toBe(300)
  })

  test('a press near a side slides it in rather than off', () => {
    const nearLeft = placeWall(80, 300)
    expect(nearLeft.x).toBe(MARGIN)

    const nearRight = placeWall(VIEWPORT_WIDTH - 40, 300)
    expect(nearRight.x + WALL_WIDTH).toBe(VIEWPORT_WIDTH - MARGIN)
  })

  test('a press near the bottom flips it above the pointer, not under it', () => {
    const placed = placeWall(700, 800)
    // Above, so the cursor is not left sitting on a row it is about to click —
    // the vertical spelling of the sideways flip `clampToViewport` already makes.
    expect(placed.y + WALL_HEIGHT).toBe(800)
  })

  test('with room neither below nor above, it takes what there is', () => {
    // A short viewport: 800 tall panel, 900 of screen. Neither side fits, so the
    // rule is "on screen" rather than "off the pointer".
    const placed = centreBelowPointer(700, 500, WALL_WIDTH, 800, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, MARGIN)
    expect(placed.y).toBe(VIEWPORT_HEIGHT - MARGIN - 800)
    expect(placed.y).toBeGreaterThanOrEqual(MARGIN)
  })

  test('a panel wider than the viewport surrenders to the left margin', () => {
    // The same surrender `clampToViewport` makes: there is no fitting position,
    // so it overflows the far edge rather than the near one.
    const placed = centreBelowPointer(700, 300, 2000, WALL_HEIGHT, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, MARGIN)
    expect(placed.x).toBe(MARGIN)
  })
})

describe('the explanation on an unavailable command', () => {
  /** A Lexicon row, roughly: 150 wide, 30 tall. */
  const ROW = { left: 400, top: 300, width: 150, height: 30 }
  const CHIP_WIDTH = 220
  const CHIP_HEIGHT = 41
  const GAP = 6
  const CHIP_MARGIN = 8

  function placeChip(
    anchor: typeof ROW,
    placement: 'above' | 'below',
    viewportHeight = VIEWPORT_HEIGHT,
  ) {
    return placeExplanation(
      anchor,
      placement,
      CHIP_WIDTH,
      CHIP_HEIGHT,
      VIEWPORT_WIDTH,
      viewportHeight,
      GAP,
      CHIP_MARGIN,
    )
  }

  test('it centres on the control and clears the asked-for edge', () => {
    const above = placeChip(ROW, 'above')
    expect(above.x + CHIP_WIDTH / 2).toBe(ROW.left + ROW.width / 2)
    expect(above.y + CHIP_HEIGHT + GAP).toBe(ROW.top)

    const below = placeChip(ROW, 'below')
    expect(below.y).toBe(ROW.top + ROW.height + GAP)
  })

  test('no room on the asked-for side flips it to the other one', () => {
    // A row at the top of the viewport: "above" is off screen, so the chip goes
    // under the row rather than sliding down over the text it is explaining.
    const nearTop = placeChip({ ...ROW, top: 12 }, 'above')
    expect(nearTop.y).toBe(12 + ROW.height + GAP)

    const nearBottom = placeChip({ ...ROW, top: VIEWPORT_HEIGHT - 40 }, 'below')
    expect(nearBottom.y + CHIP_HEIGHT + GAP).toBe(VIEWPORT_HEIGHT - 40)
  })

  test('a control against a side keeps the chip on screen', () => {
    expect(placeChip({ ...ROW, left: 10 }, 'above').x).toBe(CHIP_MARGIN)
    expect(placeChip({ ...ROW, left: VIEWPORT_WIDTH - 60 }, 'above').x + CHIP_WIDTH).toBe(
      VIEWPORT_WIDTH - CHIP_MARGIN,
    )
  })

  test('with room on neither side it stays where it was asked for, clamped', () => {
    // A viewport shorter than the control plus two chips: flipping buys nothing,
    // so the rule falls back to "on screen".
    const placed = placeChip({ ...ROW, top: 8 }, 'above', 70)
    expect(placed.y).toBeGreaterThanOrEqual(CHIP_MARGIN)
    expect(placed.y + CHIP_HEIGHT).toBeLessThanOrEqual(70 - CHIP_MARGIN)
  })
})

describe('the corner alignment it sits beside', () => {
  test('it hangs off the press by its top-left corner', () => {
    const placed = clampToViewport(700, 300, 320, 432, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, MARGIN)
    expect(placed).toEqual({ x: 700, y: 300 })
  })

  test('an overflowing panel flips to the other side of the pointer', () => {
    const placed = clampToViewport(1400, 300, 320, 432, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, MARGIN)
    expect(placed.x).toBe(1400 - 320)
  })
})
