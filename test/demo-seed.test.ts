/**
 * The demo's starting alphabet — the half of it that can go wrong silently.
 *
 * A seed is a binding written by hand into someone else's array, so the two ways
 * it fails are both quiet ones: it can name something that is not there (a
 * command id that was renamed, a palette rune that was), in which case the
 * Lexicon row simply shows an empty socket and the demo looks broken rather than
 * unseeded; or it can *overwrite*, which turns "the alphabet belongs to the user"
 * into prose the code does not keep.
 *
 * The library's own contract — nothing bound out of the box — is `runes.test.ts`
 * and stays untouched by any of this: the seed lives in `demo/`, it writes
 * `config.sigil.runes` (the user's array), and `defaultConfig()` still comes back
 * empty.
 */
import { describe, expect, test } from 'bun:test'
import { COMMANDS } from '../demo/commands.ts'
import { SEEDED_RUNES, withSeededRunes } from '../demo/seedRunes.ts'
import { DEFAULT_GLYPHS } from '../src/lib/glyphs.ts'
import { defaultConfig, SigilRuneSchema, type ContextMenuConfig } from '../src/schema/config.ts'
import { isBoundRune, resolveRune, userRuneOf } from '../src/runtime/runes.ts'
import { CommandSchema } from '../src/schema/command.ts'

const configWith = (runes: ContextMenuConfig['sigil']['runes']): ContextMenuConfig => {
  const base = defaultConfig()
  return { ...base, sigil: { ...base.sigil, runes } }
}

describe('the seed points at things that exist', () => {
  test('a handful, not an alphabet — the ＋ beside the rest is the point', () => {
    expect(SEEDED_RUNES.length).toBeGreaterThan(2)
    expect(SEEDED_RUNES.length).toBeLessThan(COMMANDS.length / 2)
  })

  test('every seeded rune names a command the demo ships', () => {
    const commandIds = new Set(COMMANDS.map((command) => command.id))
    for (const rune of SEEDED_RUNES) {
      expect(commandIds.has(rune.commandId), `seeded rune for "${rune.commandId}"`).toBe(true)
    }
  })

  test('every seeded rune is a palette rune, carried whole', () => {
    for (const rune of SEEDED_RUNES) {
      const glyph = DEFAULT_GLYPHS.find((candidate) => candidate.name === rune.name)
      expect(glyph, `lexicon glyph "${rune.name}"`).toBeDefined()
      expect(rune.points).toEqual(glyph?.points.map(([x, y]) => [x, y]) ?? [])
    }
  })

  test('each one parses and is a stroke, not a tap', () => {
    for (const rune of SEEDED_RUNES) {
      expect(SigilRuneSchema.parse(rune)).toEqual(rune)
      expect(isBoundRune(rune), `seeded rune for "${rune.commandId}"`).toBe(true)
    }
  })

  test('one rune per command, one command per named rune', () => {
    // The pair of invariants `bindRuneRecipe` maintains. A seed that broke either
    // would put the config in a state the UI cannot produce.
    expect(new Set(SEEDED_RUNES.map((rune) => rune.commandId)).size).toBe(SEEDED_RUNES.length)
    expect(new Set(SEEDED_RUNES.map((rune) => rune.name)).size).toBe(SEEDED_RUNES.length)
  })

  test('the seeded rune is what resolves for its command', () => {
    const config = withSeededRunes(defaultConfig())
    for (const seeded of SEEDED_RUNES) {
      const command = CommandSchema.parse({
        id: seeded.commandId,
        label: seeded.commandId,
        kindId: 'act',
      })
      expect(resolveRune(command, config.sigil.runes, DEFAULT_GLYPHS)).toEqual({
        glyph: { name: seeded.name, points: seeded.points },
        source: 'user',
      })
    }
  })
})

describe('the seed never takes a binding away', () => {
  test('a fresh config gets all of them', () => {
    expect(withSeededRunes(defaultConfig()).sigil.runes).toEqual([...SEEDED_RUNES])
  })

  test("a command the user has bound keeps the user's stroke", () => {
    const [first] = SEEDED_RUNES
    expect(first).toBeDefined()
    const own = SigilRuneSchema.parse({
      commandId: first?.commandId ?? '',
      name: '',
      points: [
        [0, 0],
        [100, 100],
      ],
    })
    const seeded = withSeededRunes(configWith([own]))
    expect(userRuneOf(seeded.sigil.runes, own.commandId)).toEqual(own)
    expect(seeded.sigil.runes.length).toBe(SEEDED_RUNES.length)
  })

  test('a palette rune the user has pointed elsewhere is not cloned', () => {
    const [first] = SEEDED_RUNES
    expect(first).toBeDefined()
    const elsewhere = SigilRuneSchema.parse({
      commandId: 'some-other-command',
      name: first?.name ?? '',
      points: first?.points ?? [],
    })
    const seeded = withSeededRunes(configWith([elsewhere]))
    expect(seeded.sigil.runes.filter((rune) => rune.name === elsewhere.name).length).toBe(1)
    expect(userRuneOf(seeded.sigil.runes, first?.commandId ?? '')).toBeNull()
  })

  test('applying it twice changes nothing the second time', () => {
    const once = withSeededRunes(defaultConfig())
    expect(withSeededRunes(once)).toEqual(once)
  })

  test('the fold has no memory — the marker is what stops a second seeding', () => {
    // Pinned rather than defended: hand `withSeededRunes` an emptied alphabet and
    // it hands the six back, because a pure function cannot know they were thrown
    // away on purpose. What keeps a user's deletion deleted is `hasSeededRunes()`
    // at the call site, which is why the two are separate.
    expect(withSeededRunes(configWith([])).sigil.runes).toEqual([...SEEDED_RUNES])
  })

  test("the library's own default is still unbound", () => {
    expect(defaultConfig().sigil.runes).toEqual([])
  })
})
