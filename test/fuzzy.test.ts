import { describe, expect, test } from 'bun:test'
import { bestFuzzyMatch, fuzzyMatch, type MatchSegment } from '../src/lib/fuzzy.ts'

/** The rendered string, with matched runs wrapped — what the user actually sees. */
function render(segments: MatchSegment[]): string {
  return segments.map((segment) => (segment.matched ? `[${segment.text}]` : segment.text)).join('')
}

describe('fuzzyMatch', () => {
  test('reports where it matched, not just that it did', () => {
    const match = fuzzyMatch('build', 'bu')
    expect(match).not.toBeNull()
    expect(render(match!.segments)).toBe('[bu]ild')
  })

  test('marks non-contiguous matches in every place they landed', () => {
    const match = fuzzyMatch('storybook', 'sbk')
    expect(render(match!.segments)).toBe('[s]tory[b]oo[k]')
  })

  test('a non-subsequence does not match', () => {
    expect(fuzzyMatch('build', 'xyz')).toBeNull()
    expect(fuzzyMatch('build', 'dliub')).toBeNull()
  })

  test('an empty query matches everything, highlighting nothing', () => {
    const match = fuzzyMatch('build', '')
    expect(render(match!.segments)).toBe('build')
  })

  test('is case-insensitive but preserves the original casing', () => {
    const match = fuzzyMatch('Mark reviewed', 'MARK')
    expect(render(match!.segments)).toBe('[Mark] reviewed')
  })

  test('a prefix match outranks a scattered one', () => {
    const prefix = fuzzyMatch('build', 'bu')!
    const scattered = fuzzyMatch('storybook', 'bu')
    expect(scattered).toBeNull() // no 'u' after the 'b' in storybook
    const laterButTight = fuzzyMatch('rebuild', 'bu')!
    expect(prefix.score).toBeLessThan(laterButTight.score)
  })

  test('a tight late match beats a scattered early one', () => {
    const tight = fuzzyMatch('open git graph', 'graph')!
    const scattered = fuzzyMatch('gather a photo here', 'graph')!
    expect(tight.score).toBeLessThan(scattered.score)
  })

  test('the contiguous run is found even when an earlier start also matches', () => {
    // A purely greedy scan would pin the first `g` (in "git") and report a wide
    // scatter; the exact phrase has to win.
    const match = fuzzyMatch('open git graph', 'graph')!
    expect(render(match.segments)).toBe('open git [graph]')
  })
})

describe('bestFuzzyMatch', () => {
  test('names the field that produced the hit', () => {
    const match = bestFuzzyMatch(['kitty', 'terminal', 'Open'], 'term')
    expect(match).not.toBeNull()
    expect(match!.fieldIndex).toBe(1)
    expect(render(match!.segments)).toBe('[term]inal')
  })

  test('prefers the label when several fields match', () => {
    const match = bestFuzzyMatch(['open', 'operator'], 'op')
    expect(match!.fieldIndex).toBe(0)
  })

  test('returns null when nothing matches', () => {
    expect(bestFuzzyMatch(['build', 'compile'], 'zzz')).toBeNull()
  })
})
