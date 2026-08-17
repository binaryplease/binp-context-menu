/**
 * Subsequence matching that reports *where* it matched.
 *
 * The match and the highlight are one function on purpose. A fuzzy match must be
 * visible, so a fuzzy surface highlights the matched characters in the visible
 * result, and
 * the only way to guarantee that is to have the matcher hand back the ranges
 * rather than let a renderer re-guess them. `segments` is what `<MatchedText>`
 * paints; nothing else in the library re-derives it.
 *
 * Pure data in, data out ("single-purpose functions, explicit extension") — no
 * React, no DOM, unit-testable alone.
 */

export type MatchSegment = {
  text: string
  matched: boolean
}

export type FuzzyMatch = {
  /** Lower is better. */
  score: number
  /** The full source string, split into alternating matched/unmatched runs. */
  segments: MatchSegment[]
}

/**
 * Score `query` against `text`.
 *
 * Contiguous runs and a match at the start of the string are both rewarded, so
 * "bu" ranks `build` above `storybook`. Returns `null` when the query is not a
 * subsequence of the text at all.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatch | null {
  if (query === '') return { score: 0, segments: [{ text, matched: false }] }

  const haystack = text.toLowerCase()
  const needle = query.toLowerCase()
  const firstCharacter = needle[0]!

  let bestIndices: number[] | null = null
  let bestScore = Infinity

  // Every position the query could start at is tried, not just the first. A
  // purely greedy scan matches "graph" against "open git graph" starting at the
  // `g` of "git" and scores it as a wide scatter, which would rank the exact
  // phrase below a worse candidate.
  for (let startIndex = haystack.indexOf(firstCharacter); startIndex !== -1; startIndex = haystack.indexOf(firstCharacter, startIndex + 1)) {
    const matchedIndices = matchFrom(haystack, needle, startIndex)
    if (matchedIndices === null) break // no later start can match either
    const score = scoreOf(matchedIndices, needle.length)
    if (score < bestScore) {
      bestScore = score
      bestIndices = matchedIndices
    }
  }

  if (bestIndices === null) return null
  return { score: bestScore, segments: toSegments(text, bestIndices) }
}

/** Greedily match `needle` into `haystack` with its first character pinned. */
function matchFrom(haystack: string, needle: string, startIndex: number): number[] | null {
  const matchedIndices = [startIndex]
  let searchFrom = startIndex + 1
  for (let needleIndex = 1; needleIndex < needle.length; needleIndex++) {
    const foundAt = haystack.indexOf(needle[needleIndex]!, searchFrom)
    if (foundAt === -1) return null
    matchedIndices.push(foundAt)
    searchFrom = foundAt + 1
  }
  return matchedIndices
}

/**
 * Span beyond the query's own length is the cost of the gaps; a leading offset
 * is a smaller, separate penalty, so a late-but-tight match still beats an
 * early-but-scattered one.
 */
function scoreOf(matchedIndices: number[], needleLength: number): number {
  const firstIndex = matchedIndices[0]!
  const lastIndex = matchedIndices[matchedIndices.length - 1]!
  const gapPenalty = lastIndex - firstIndex - (needleLength - 1)
  return gapPenalty * 4 + firstIndex
}

function toSegments(text: string, matchedIndices: number[]): MatchSegment[] {
  const matchedSet = new Set(matchedIndices)
  const segments: MatchSegment[] = []
  for (let index = 0; index < text.length; index++) {
    const matched = matchedSet.has(index)
    const lastSegment = segments[segments.length - 1]
    if (lastSegment !== undefined && lastSegment.matched === matched) {
      lastSegment.text += text[index]
    } else {
      segments.push({ text: text[index] ?? '', matched })
    }
  }
  return segments
}

/**
 * Best match across several candidate strings — a command's label plus its
 * keywords and kind. `fieldIndex` names which candidate won, so the caller can
 * make that field visible: rule 2 of "a fuzzy match must be visible" forbids
 * highlighting a match the user cannot see, so a hit on a keyword has to be
 * attributable to the keyword.
 */
export function bestFuzzyMatch(
  candidates: readonly string[],
  query: string,
): (FuzzyMatch & { fieldIndex: number }) | null {
  let best: (FuzzyMatch & { fieldIndex: number }) | null = null
  candidates.forEach((candidate, fieldIndex) => {
    const match = fuzzyMatch(candidate, query)
    if (match === null) return
    if (best === null || match.score < best.score) best = { ...match, fieldIndex }
  })
  return best
}
