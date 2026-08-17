/**
 * The maths behind "the Lexicon sits under the ring".
 *
 * A side panel needed no geometry: the viewport edge does not move. Placing the
 * alphabet beneath the casting ring means placing it against an anchor that lands
 * anywhere on the board, so every invocation gets a different amount of room —
 * and the three decisions that follow (how wide, how many columns, below or above)
 * are the ones a browser cannot check for you and arithmetic can.
 */
import { describe, expect, test } from 'bun:test'
import {
  LEXICON_COLUMN_GAP,
  LEXICON_COLUMN_WIDTH,
  LEXICON_EDITOR_WIDTH,
  LEXICON_INSET,
  MAX_LEXICON_COLUMNS,
  MIN_LEXICON_HEIGHT,
  PROMPT_CLEARANCE,
  lexiconColumns,
  lexiconPlacement,
} from '../src/lib/lexiconLayout.ts'

/** A desktop invocation with room in every direction. */
function invocation(overrides: Partial<Parameters<typeof lexiconPlacement>[0]> = {}) {
  return lexiconPlacement({
    anchorX: 720,
    anchorY: 320,
    ringSize: 236,
    viewportWidth: 1440,
    viewportHeight: 900,
    itemCount: 26,
    compact: false,
    ...overrides,
  })
}

describe('how many columns', () => {
  test('three at the cap, and never more', () => {
    expect(lexiconColumns(2000, 40)).toBe(MAX_LEXICON_COLUMNS)
    expect(lexiconColumns(10_000, 400)).toBe(MAX_LEXICON_COLUMNS)
  })

  test('a column is dropped before its labels start truncating', () => {
    const twoColumns = LEXICON_COLUMN_WIDTH * 2 + LEXICON_COLUMN_GAP
    expect(lexiconColumns(twoColumns, 26)).toBe(2)
    // One pixel short of the third column is two columns, not three narrow ones.
    expect(lexiconColumns(twoColumns + LEXICON_COLUMN_WIDTH + LEXICON_COLUMN_GAP - 1, 26)).toBe(2)
  })

  test('never more columns than there are commands to put in them', () => {
    expect(lexiconColumns(2000, 2)).toBe(2)
    expect(lexiconColumns(2000, 1)).toBe(1)
  })

  test('a phone-width field still gets one column rather than none', () => {
    expect(lexiconColumns(120, 26)).toBe(1)
    expect(lexiconColumns(0, 26)).toBe(1)
  })
})

describe('the box, on a board with room', () => {
  test('it hangs below the ring, centred on the anchor', () => {
    const placement = invocation()
    expect(placement.placedAbove).toBe(false)
    expect(placement.bottom).toBeNull()
    expect(placement.top).toBeGreaterThan(320 + 236 / 2)
    expect(placement.left + placement.width / 2).toBeCloseTo(720, 6)
  })

  test('its width is exactly the columns it drew, not the room it had', () => {
    const placement = invocation()
    expect(placement.columns).toBe(3)
    expect(placement.width).toBe(
      LEXICON_COLUMN_WIDTH * 3 + LEXICON_COLUMN_GAP * 2,
    )
  })

  test('it clears the field\'s own line of prose, not just the ring', () => {
    // The caption rides at 0.635 × the ring below the anchor; a first row level
    // with it would be a label printed on an instruction, and a first row a few
    // pixels under it reads as one block with it.
    const placement = invocation()
    expect(placement.top! - placement.promptTop).toBe(PROMPT_CLEARANCE)
    expect(placement.top!).toBeGreaterThan(320 + 236 * 0.635)
  })

  test('it never runs past the bottom edge', () => {
    const placement = invocation()
    expect(placement.top! + placement.maxHeight).toBe(900 - LEXICON_INSET)
  })
})

describe('the box, against an edge', () => {
  test('a cast by the right edge is pushed back inside rather than off the board', () => {
    const placement = invocation({ anchorX: 1420 })
    expect(placement.left + placement.width).toBe(1440 - LEXICON_INSET)
    expect(placement.left).toBeGreaterThanOrEqual(LEXICON_INSET)
  })

  test('a cast by the left edge, the same way round', () => {
    const placement = invocation({ anchorX: 8 })
    expect(placement.left).toBe(LEXICON_INSET)
  })

  test('a narrow viewport drops to one column at that column\'s own width', () => {
    // Not stretched to the viewport: a column is as wide as a column needs to be,
    // and the leftover becomes margin rather than a 312px label.
    const placement = invocation({ anchorX: 180, viewportWidth: 360 })
    expect(placement.columns).toBe(1)
    expect(placement.width).toBe(LEXICON_COLUMN_WIDTH)
    expect(placement.left + placement.width).toBeLessThanOrEqual(360 - LEXICON_INSET)
  })

  test('a viewport narrower than a single column gives way to the viewport', () => {
    const placement = invocation({ anchorX: 100, viewportWidth: 200 })
    expect(placement.width).toBe(200 - LEXICON_INSET * 2)
    expect(placement.left).toBe(LEXICON_INSET)
  })
})

describe('below unless below is a sliver', () => {
  test('a cast near the bottom flips above the ring and grows upward', () => {
    const placement = invocation({ anchorY: 820 })
    expect(placement.placedAbove).toBe(true)
    expect(placement.top).toBeNull()
    // Bottom-anchored, so the last row sits just clear of the prompt line, which
    // has flipped with it.
    expect(placement.bottom).toBeCloseTo(900 - (placement.promptTop - PROMPT_CLEARANCE), 6)
    expect(placement.maxHeight).toBeGreaterThan(MIN_LEXICON_HEIGHT * 2)
  })

  test('the prompt flips with it, rather than being left off the viewport', () => {
    const below = invocation({ anchorY: 320 })
    expect(below.promptTop).toBeCloseTo(320 + 236 * 0.635, 6)

    const above = invocation({ anchorY: 820 })
    expect(above.promptTop).toBeCloseTo(820 - 236 * 0.635, 6)
    // The old behaviour put it at 820 + 150 — 70px past a 900px viewport.
    expect(above.promptTop).toBeLessThan(900)
  })

  test('whichever side it lands, the alphabet clears the prompt by the same margin', () => {
    const below = invocation({ anchorY: 320 })
    const above = invocation({ anchorY: 820 })
    expect(below.top! - below.promptTop).toBeCloseTo(
      above.promptTop - (900 - above.bottom!),
      6,
    )
  })

  test('it stays below while below is still usable', () => {
    // Chosen so the room below is comfortably over the floor.
    const placement = invocation({ anchorY: 480 })
    expect(placement.maxHeight).toBeGreaterThanOrEqual(MIN_LEXICON_HEIGHT)
    expect(placement.placedAbove).toBe(false)
  })

  test('when below has run off the screen entirely, a cramped above still wins', () => {
    // A short viewport with the anchor low in it: below is negative, so there is
    // nothing to concede by flipping, and 78px of alphabet beats none.
    const placement = invocation({ anchorY: 240, viewportHeight: 420 })
    expect(placement.placedAbove).toBe(true)
    expect(placement.maxHeight).toBeGreaterThan(0)
  })

  test('a cramped below is kept when above is no better', () => {
    // Both sides are tight and below is still the larger of the two, so the rule
    // holds and the list scrolls rather than jumping over the ring for nothing.
    const placement = invocation({ anchorY: 120, viewportHeight: 460 })
    expect(placement.placedAbove).toBe(false)
    expect(placement.maxHeight).toBeGreaterThan(0)
    expect(placement.maxHeight).toBeLessThan(MIN_LEXICON_HEIGHT)
  })

  test('a flipped box never overlaps the top edge either', () => {
    const placement = invocation({ anchorY: 880, viewportHeight: 900 })
    expect(placement.placedAbove).toBe(true)
    expect(placement.maxHeight).toBeLessThanOrEqual(900 - LEXICON_INSET * 2)
  })
})

describe('the editing face', () => {
  test('is one column at its own width, whatever room the board had', () => {
    const wide = invocation({ compact: true })
    expect(wide.columns).toBe(1)
    expect(wide.width).toBe(LEXICON_EDITOR_WIDTH)
    expect(wide.left + wide.width / 2).toBeCloseTo(720, 6)
  })

  test('and still gives way to a viewport narrower than it', () => {
    const narrow = invocation({ compact: true, viewportWidth: 320 })
    expect(narrow.width).toBe(320 - LEXICON_INSET * 2)
  })
})
