/**
 * The pad's grain is a two-list arrangement — ids in the schema (what a stored
 * config may say), looks in the descriptor list (what each id paints) — for the
 * same reason `SURFACE_IDS` and `SURFACES` are. Two lists drift, so this is the
 * executable guard that keeps them one — the guard third of one descriptor, one
 * wrapper, one guard: a pattern added to the enum
 * and forgotten in the descriptors paints nothing and is silently unofferable in
 * the settings panel, which is exactly the failure `surface-settings.test.ts`
 * exists to prevent one level up.
 */
import { describe, expect, test } from 'bun:test'
import { PAD_BACKGROUNDS, padBackgroundClassName } from '../src/components/padBackgrounds.ts'
import { defaultConfig, PAD_BACKGROUND_IDS } from '../src/schema/config.ts'

describe('the cast pad backgrounds', () => {
  test('the descriptors cover every id, once each, in the schema’s order', () => {
    expect(PAD_BACKGROUNDS.map((background) => background.id)).toEqual([...PAD_BACKGROUND_IDS])
  })

  test('each one is offerable — it has a name a settings row can print', () => {
    for (const background of PAD_BACKGROUNDS) {
      expect(background.label.length, `${background.id} label`).toBeGreaterThan(2)
    }
  })

  test('every pattern paints, and only “none” paints nothing', () => {
    for (const background of PAD_BACKGROUNDS) {
      const paints = padBackgroundClassName(background.id).length > 0
      expect(paints, `${background.id} paints`).toBe(background.id !== 'none')
    }
  })

  test('no pattern names a colour of its own', () => {
    // The pad is painted in the host's neutrals and follows a re-pointed palette
    // for free; a literal in here is the one part that would not. Same rule the
    // surface guard enforces over `src/surfaces` and `src/components`, asserted on
    // the values rather than the source text because these strings *are* the paint.
    for (const background of PAD_BACKGROUNDS) {
      expect(background.className, `${background.id} colour source`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lch|lab)\(/,
      )
      if (background.className.length === 0) continue
      expect(background.className, `${background.id} pad ink`).toContain('--color-cm-pad-ink')
    }
  })

  test('a fresh config keeps the grain the pad has always had', () => {
    // The knob adds a choice and changes nothing for anyone who never opens it.
    expect(defaultConfig()['sigil-pad'].background).toBe('dots')
    expect(defaultConfig()['sigil-pad'].showSignal).toBe(true)
  })
})
