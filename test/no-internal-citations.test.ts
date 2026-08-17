/**
 * The half of publishing that cannot be taken back.
 *
 * This repository is published from a clean tree, and its prose was rewritten
 * to say what each rule *is* rather than to cite where it was decided. Those
 * citations are the one defect a review cannot reliably catch: they are
 * comments, so nothing type-checks them, nothing runs them, and a reader skims
 * past a parenthetical that looks like a reference to something they simply
 * have not read. One survived two sweeps of this tree — the id had been
 * dropped, so the sweeps' patterns missed it, but the section number and the
 * gloss of that section's subject stayed, which is the shape that leaks: it
 * reconstructs the headings of a private corpus without copying a line of it.
 *
 * So the shapes are asserted absent here rather than left to a reviewer
 * noticing. Two properties matter, and are the reason this is a test and not a
 * grep in someone's shell history:
 *
 * - it runs unprompted, on every `mise run check`, which is the only kind of
 *   gate worth having in front of a one-way door;
 * - it reads bytes through the filesystem, so a file git classifies as binary
 *   is read like any other. `test/command-schema.test.ts` carries a deliberate
 *   NUL byte, and that byte is precisely why `git grep` and a bare `grep -r`
 *   both walked past the survivor above.
 *
 * **Shapes, never names.** Every pattern here describes the *form* of a
 * citation, and none of them spells a repository, tool or catalog this project
 * is adjacent to. That is a constraint rather than an oversight: a public repo
 * that carries a denylist of private names has published the denylist, which
 * discloses more than the citations it was meant to catch. Names belong in the
 * sweep an operator runs outside this tree; what belongs *here* is the shape
 * that leaks structure no matter whose corpus it points at. It follows that
 * nothing below matches this file, so this file is scanned like any other.
 *
 * A hit is not a lint failure to silence — it is prose to rewrite, in situ,
 * into the rule it was pointing at.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const REPO_ROOT = resolve(import.meta.dirname, '..')

/** Nothing here is published: build output, dependencies, and git's own store. */
const NOT_PUBLISHED = new Set(['node_modules', 'dist', '.git'])

const publishedFiles = (directory: string = REPO_ROOT): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (NOT_PUBLISHED.has(entry.name)) return []
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return publishedFiles(path)
    return [relative(REPO_ROOT, path).split(sep).join('/')]
  })

/**
 * Read as UTF-8 through the filesystem, never through git: a NUL byte makes git
 * call a file binary and show nothing, and JavaScript does not care.
 */
const contentsOf = (repoPath: string): string =>
  readFileSync(join(REPO_ROOT, repoPath), 'utf8')

const FILES = publishedFiles().map((repoPath) => [repoPath, contentsOf(repoPath)] as const)

/** Each shape, with the name it goes by when it fails. */
const CITATION_SHAPES: ReadonlyArray<readonly [string, RegExp]> = [
  ['a decision-record id', /\bADR[-_ ]?\d{3,4}\b/i],
  ['a section number', /§\s*\d/],
  ['a catalog id', /\b[A-Z]{3}\d{3}\b/],
]

const hitsFor = (pattern: RegExp): string[] =>
  FILES.flatMap(([repoPath, contents]) =>
    contents
      .split('\n')
      .flatMap((text, index) => (pattern.test(text) ? [`${repoPath}:${index + 1}`] : [])),
  )

describe('the published tree cites nothing a reader cannot open', () => {
  test('it reads every published file, including the one git calls binary', () => {
    const paths = FILES.map(([repoPath]) => repoPath)
    expect(paths).toContain('test/command-schema.test.ts')
    expect(paths).toContain('test/no-internal-citations.test.ts')
    expect(paths).toContain('README.md')
    expect(paths).toContain('AGENTS.md')
    expect(paths.length).toBeGreaterThan(50)
  })

  test('the file git calls binary is read whole, NUL and all', () => {
    const contents = contentsOf('test/command-schema.test.ts')
    expect(contents).toContain('\u0000javascript:alert(1)')
    expect(contents).toContain('describe(')
  })

  for (const [name, pattern] of CITATION_SHAPES) {
    test(`no published file carries ${name}`, () => {
      expect(hitsFor(pattern)).toEqual([])
    })
  }
})
