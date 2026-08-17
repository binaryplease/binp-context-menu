/**
 * The rune seam — who owns the alphabet, and what the field ships knowing.
 *
 * Three things are worth failing a build over here:
 *
 * 1. **Nothing is bound out of the box.** The library ships one rune, it belongs
 *    to the field rather than to a command, and it is the way out. A default
 *    config that arrived with bindings would mean somebody's alphabet shipped as
 *    everybody's.
 * 2. **A drawn stroke round-trips.** The editor stores what the recognizer will
 *    later read; if the two disagree about how a stroke becomes a rune, every
 *    rune a user draws is subtly not the rune they drew.
 * 3. **The user's rune wins.** A host may ship `Command.glyph`; a person who has
 *    since drawn their own must not have it re-pointed by a release.
 */
import { describe, expect, test } from 'bun:test'
import { CommandSchema } from '../src/schema/command.ts'
import { defaultConfig, parseConfig, SigilRuneSchema, type SigilRune } from '../src/schema/config.ts'
import {
  DEFAULT_GLYPHS,
  DISMISS_GLYPH,
  glyphPointsFromStroke,
  type Glyph,
} from '../src/lib/glyphs.ts'
import { prepareTemplate, recognize, type StrokePoint } from '../src/lib/unistroke.ts'
import {
  bindRuneRecipe,
  isBoundRune,
  resolveRune,
  runeDisplayNameOf,
  unbindRuneRecipe,
  userRuneOf,
} from '../src/runtime/runes.ts'

const command = (id: string, glyph: string | null = null) =>
  CommandSchema.parse({ id, label: id, kindId: 'act', glyph })

const rune = (partial: Partial<SigilRune>): SigilRune => SigilRuneSchema.parse(partial)

/** A stroke as a pointer stream would deliver it — many points, screen pixels. */
function dragBetween(from: StrokePoint, to: StrokePoint, steps = 40): StrokePoint[] {
  return Array.from({ length: steps + 1 }, (_unused, index) => ({
    x: from.x + ((to.x - from.x) * index) / steps,
    y: from.y + ((to.y - from.y) * index) / steps,
  }))
}

function readAs(points: readonly StrokePoint[], lexicon: Glyph[]) {
  const templates = lexicon.map((glyph) =>
    prepareTemplate(glyph, glyph.points.map(([x, y]) => ({ x, y }))),
  )
  return recognize(points, templates)[0]
}

describe('the shipped alphabet', () => {
  test('a fresh config has bound nothing at all', () => {
    expect(defaultConfig().sigil.runes).toEqual([])
  })

  test('the one rune the library ships is a single stroke, top to bottom', () => {
    expect(DISMISS_GLYPH.points).toEqual([
      [50, 0],
      [50, 100],
    ])
  })

  test('the palette does not offer the way out a second time', () => {
    // A duplicate of the dismiss stroke in the pickable palette is a rune the
    // recognizer cannot separate from closing the field.
    const downStroke = dragBetween({ x: 400, y: 100 }, { x: 400, y: 400 })
    for (const glyph of DEFAULT_GLYPHS) {
      const reading = readAs(downStroke, [glyph])
      expect(reading!.confidence, `${glyph.name} reads as the dismiss stroke`).toBeLessThan(0.8)
    }
  })

  test('a stroke straight down is read as the way out, wherever it is drawn', () => {
    for (const start of [
      { x: 120, y: 60 },
      { x: 900, y: 300 },
    ]) {
      const reading = readAs(
        dragBetween(start, { x: start.x + 3, y: start.y + 260 }),
        [DISMISS_GLYPH, ...DEFAULT_GLYPHS],
      )
      expect(reading!.meta.name).toBe('Dismiss')
      expect(reading!.confidence).toBeGreaterThan(0.85)
    }
  })
})

describe('a drawn stroke becomes a rune the field can read back', () => {
  test('it is stored in the 0–100 box, aspect preserved', () => {
    const points = glyphPointsFromStroke(dragBetween({ x: 300, y: 80 }, { x: 300, y: 480 }))
    expect(points.length).toBeGreaterThan(2)
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(100)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
    // A straight stroke has no extent across, so it lands on the centre line
    // rather than dividing by zero.
    expect(points.every(([x]) => Math.abs(x - 50) < 0.6)).toBe(true)
    expect(points[0]![1]).toBeCloseTo(0, 1)
    expect(points[points.length - 1]![1]).toBeCloseTo(100, 1)
  })

  test('drawing it again reads back as itself, not as its neighbours', () => {
    // An ‘L’: down the left, then out along the bottom.
    const drawn = [
      ...dragBetween({ x: 220, y: 140 }, { x: 220, y: 400 }),
      ...dragBetween({ x: 220, y: 400 }, { x: 470, y: 400 }),
    ]
    const stored: Glyph = { name: '', points: glyphPointsFromStroke(drawn) }

    const reading = readAs(drawn, [stored, DISMISS_GLYPH])
    expect(reading!.meta).toBe(stored)
    expect(reading!.confidence).toBeGreaterThan(0.9)

    // And a *differently placed, differently sized* second attempt still finds it.
    const secondAttempt = [
      ...dragBetween({ x: 600, y: 200 }, { x: 600, y: 320 }),
      ...dragBetween({ x: 600, y: 320 }, { x: 715, y: 320 }),
    ]
    expect(readAs(secondAttempt, [stored, DISMISS_GLYPH])!.meta).toBe(stored)
  })

  test('a stroke of one point is not a rune', () => {
    expect(glyphPointsFromStroke([{ x: 10, y: 10 }]).length).toBeLessThan(2)
  })
})

describe('who owns a command’s rune', () => {
  const lexicon = DEFAULT_GLYPHS
  const flow = lexicon.find((glyph) => glyph.name === 'Flow')!

  test('a command nobody bound has no rune', () => {
    expect(resolveRune(command('pin'), [], lexicon)).toBeNull()
  })

  test('a host binding is honoured by name', () => {
    const resolved = resolveRune(command('pin', 'Flow'), [], lexicon)
    expect(resolved).toEqual({ glyph: flow, source: 'host' })
  })

  test('a host binding naming a rune that does not exist is not invented', () => {
    expect(resolveRune(command('pin', 'Nonesuch'), [], lexicon)).toBeNull()
  })

  test('the user’s own rune wins over the host’s', () => {
    const own = rune({ commandId: 'pin', name: '', points: [[50, 0], [0, 100]] })
    const resolved = resolveRune(command('pin', 'Flow'), [own], lexicon)
    expect(resolved?.source).toBe('user')
    expect(resolved?.glyph.points).toEqual(own.points)
  })

  test('a half-written rune is dropped rather than handed to the recognizer', () => {
    const stubs = [rune({ commandId: 'pin' }), rune({ points: [[0, 0], [1, 1]] })]
    expect(stubs.every((stub) => !isBoundRune(stub))).toBe(true)
    expect(userRuneOf(stubs, 'pin')).toBeNull()
    expect(resolveRune(command('pin'), stubs, lexicon)).toBeNull()
  })

  test('a drawn rune is named for what it is, a picked one for what it was', () => {
    expect(runeDisplayNameOf({ name: '', points: [] })).toBe('drawn')
    expect(runeDisplayNameOf(flow)).toBe('Flow')
  })
})

describe('binding and unbinding are one write each', () => {
  const points: [number, number][] = [
    [0, 0],
    [100, 100],
  ]

  /** Apply a recipe the way the store does — recipe out, re-parsed config in. */
  const applied = (recipe: (current: ReturnType<typeof defaultConfig>) => unknown, from = defaultConfig()) =>
    parseConfig(recipe(from))

  test('binding replaces whatever the command had', () => {
    const first = applied(bindRuneRecipe('pin', { name: 'Flow', points }))
    const second = applied(bindRuneRecipe('pin', { name: '', points }), first)
    expect(second.sigil.runes).toHaveLength(1)
    expect(second.sigil.runes[0]).toMatchObject({ commandId: 'pin', name: '' })
  })

  test('a named rune has one owner — picking it moves it', () => {
    const config = applied(bindRuneRecipe('pin', { name: 'Flow', points }))
    const moved = applied(bindRuneRecipe('clone', { name: 'Flow', points }), config)
    expect(moved.sigil.runes.map((one) => one.commandId)).toEqual(['clone'])
  })

  test('two drawn runes coexist — only a *name* is exclusive', () => {
    const first = applied(bindRuneRecipe('pin', { name: '', points }))
    const both = applied(bindRuneRecipe('clone', { name: '', points }), first)
    expect(both.sigil.runes).toHaveLength(2)
  })

  test('unbinding leaves everything else alone', () => {
    const config = applied(
      bindRuneRecipe('clone', { name: '', points }),
      applied(bindRuneRecipe('pin', { name: 'Flow', points })),
    )
    const after = applied(unbindRuneRecipe('pin'), config)
    expect(after.sigil.runes.map((one) => one.commandId)).toEqual(['clone'])
  })

  test('a bound rune survives the trip through storage', () => {
    const written = applied(bindRuneRecipe('pin', { name: '', points }))
    const readBack = parseConfig(JSON.parse(JSON.stringify(written)) as unknown)
    expect(readBack.sigil.runes).toEqual(written.sigil.runes)
  })
})
