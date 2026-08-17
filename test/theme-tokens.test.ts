/**
 * The palette contract, as a test.
 *
 * Two themes over one token set only holds while *every* colour token declares
 * both halves — and the failure mode is invisible: a token that quietly goes back
 * to a single light value looks perfect until someone opens the menu on a dark
 * board, which is exactly the class of regression the guard script cannot see
 * (it reads `src/**` for literals, not the stylesheet for coverage).
 *
 * So each colour token is classified here, and an unclassified one fails. Adding
 * a token is therefore a decision — a `light-dark()` pair, or a deliberate
 * scheme-independent value — rather than a default.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const themeCss = readFileSync(join(import.meta.dirname, '..', 'src', 'theme.css'), 'utf8')

/** Colour tokens that carry both palettes. */
const PAIRED_TOKENS = [
  'bg',
  'bg-soft',
  'bg-mute',
  'bg-sink',
  'ink',
  'ink-2',
  'ink-3',
  'ink-4',
  'rule',
  'rule-2',
  'accent',
  'accent-soft',
  'on-accent',
  'danger',
  'danger-soft',
  'scrim',
  'hover',
  'active',
  'match',
  'cast-accent',
  'cast-rune',
  'cast-veil-near',
  'cast-veil-far',
  'cast-shadow',
  // An instrument on the field carries the page's ink, so its plate flips with
  // the page too — see the block these are declared in.
  'cast-plate',
]

/**
 * Colour tokens that are deliberately the same under both themes, each because it
 * sits on something that is not the page: a saturated fill, or the casting field's
 * own trail core.
 */
const SCHEME_INDEPENDENT_TOKENS = ['accent-lift', 'on-tone', 'cast-ink']

/**
 * Colour tokens *derived* from the casting field's hue — the trail it is traced
 * in, the edges of the instruments standing on it. They are neither pairs nor
 * fixed values but a `color-mix()` over `--color-cm-cast-accent`, which is what
 * makes re-pointing that one token carry the whole surface. A literal here is the
 * regression this pins: it would leave a host's field half its colour and half
 * ours (see the token's own comment in `theme.css`).
 */
const DERIVED_FROM_CAST_ACCENT = ['cast-trail', 'cast-plate-edge', 'cast-plate-seam']

/**
 * Colour tokens that are *aliases* of a palette token above — a named seam a host
 * can re-point on its own, whose default is "whatever that part of the palette
 * says". They carry both themes by reference, so a `light-dark()` pair here would
 * be a second copy of one that already exists; what they must not be is a literal,
 * which is how an alias quietly stops following the palette it was named after.
 */
const ALIAS_TOKENS = ['pad-fill', 'pad-edge', 'pad-ink', 'cast-glow', 'tip', 'tip-edge']

function declarationOf(token: string): string {
  const match = new RegExp(`^\\s*--color-cm-${token}:\\s*([^;]+);`, 'm').exec(themeCss)
  expect(match, `--color-cm-${token} is declared`).not.toBeNull()
  return match![1]!.trim()
}

describe('every colour token declares both palettes, or says why not', () => {
  test('the palette tokens are `light-dark()` pairs', () => {
    for (const token of PAIRED_TOKENS) {
      expect(declarationOf(token), `--color-cm-${token}`).toStartWith('light-dark(')
    }
  })

  test('the scheme-independent ones are single values, not pairs of one colour', () => {
    for (const token of SCHEME_INDEPENDENT_TOKENS) {
      expect(declarationOf(token), `--color-cm-${token}`).not.toStartWith('light-dark(')
    }
  })

  test('an alias resolves through a palette token, so it inherits both halves', () => {
    for (const token of ALIAS_TOKENS) {
      expect(declarationOf(token), `--color-cm-${token}`).toStartWith('var(--color-cm-')
    }
  })

  test('the field derives its trail and its edges from its own hue', () => {
    for (const token of DERIVED_FROM_CAST_ACCENT) {
      expect(declarationOf(token), `--color-cm-${token}`).toContain(
        'var(--color-cm-cast-accent)',
      )
    }
  })

  test('no colour token escapes the classification above', () => {
    const declared = [...themeCss.matchAll(/^\s*--color-cm-([a-z0-9-]+):/gm)].map(
      (match) => match[1]!,
    )
    const classified = new Set([
      ...PAIRED_TOKENS,
      ...SCHEME_INDEPENDENT_TOKENS,
      ...ALIAS_TOKENS,
      ...DERIVED_FROM_CAST_ACCENT,
    ])
    // A new token lands here rather than in whichever theme its author was in.
    expect(declared.filter((token) => !classified.has(token))).toEqual([])
    expect(declared.length).toBe(classified.size)
  })

  test('the shadows carry their dark half in the colour slot', () => {
    // `light-dark()` takes colours, not whole shadows, so the pair goes inside.
    for (const shadow of ['card', 'card-lift', 'panel', 'bubble', 'lane', 'hub']) {
      const match = new RegExp(`--shadow-cm-${shadow}:\\s*([^;]+);`, 's').exec(themeCss)
      expect(match, `--shadow-cm-${shadow} is declared`).not.toBeNull()
      expect(match![1]!, `--shadow-cm-${shadow}`).toContain('light-dark(')
    }
  })
})

describe('both switching mechanisms are wired', () => {
  const pinnedSelector = ':root:not(.light):not(.dark):not([data-theme="light"]):not([data-theme="dark"])'

  test('a host pins a theme with a class or an attribute', () => {
    // `.dark`/`.light` is what most host design systems already write onto <html>.
    expect(themeCss).toContain('.dark,\n[data-theme="dark"] {\n  color-scheme: dark;')
    expect(themeCss).toContain('.light,\n[data-theme="light"] {\n  color-scheme: light;')
  })

  test('nobody pinned one → the OS decides, and `color-scheme` is declared', () => {
    expect(themeCss).toContain(`${pinnedSelector} {\n  color-scheme: light dark;`)
    expect(themeCss).toContain('@media (prefers-color-scheme: dark)')
  })

  test('the exclusion lives in the selector, not in the cascade', () => {
    // A host controls `@layer` order and source order; it does not control which
    // selectors match. So the default must *fail to match* when a theme is pinned
    // rather than merely lose to the rule that pins it.
    const defaultRules = [...themeCss.matchAll(/^(:root:not\([^{]*)\{/gm)].map((match) =>
      match[1]!.trim(),
    )
    expect(defaultRules.length).toBeGreaterThan(0)
    for (const selector of defaultRules) {
      expect(selector).toBe(pinnedSelector)
    }
  })

  test('the kind-colour lift rides the same three rules as the palette', () => {
    // If it could disagree with `color-scheme`, a dark board would get unlifted
    // kind colours (or a light one would get lifted ones).
    expect(themeCss).toContain('--cm-kind-lift: var(--cm-kind-lift-dark);')
    expect(themeCss).toContain('--cm-kind-lift: var(--cm-kind-lift-light);')
    // Zero-specificity defaults, so a host overrides the amount from `:root`.
    expect(themeCss).toContain(':where(:root) {')
    expect(themeCss).toContain('--cm-kind-lift-light: transparent 0%;')
  })
})
