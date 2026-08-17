#!/usr/bin/env bun
/**
 * The guard third of one descriptor, one wrapper, one guard — the executable
 * half of a rule prose alone cannot hold.
 *
 * This library's whole premise is that seven surfaces share one affordance. That
 * only holds while every surface goes through the shared primitives — and prose
 * does not bind a session that never read it. So the build fails when a surface
 * re-derives something the wrapper already owns.
 *
 * Deliberately narrow: a handful of checks, each targeting a regression that has
 * a named fix. A noisy guard gets disabled and protects nothing.
 *
 * Resolves its paths from its own location, not the cwd ("a script resolves its
 * paths from its own location").
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const REPO_ROOT = resolve(import.meta.dirname, '..')
const SOURCE_ROOT = join(REPO_ROOT, 'src')

type Violation = { file: string; line: number; rule: string; fix: string }

type Rule = {
  name: string
  /** What a violating line looks like. */
  pattern: RegExp
  /**
   * Path prefixes, relative to `src/`, this rule applies to. Omitted means the
   * whole library — only a rule whose fix is genuinely everywhere's business.
   */
  scope?: string[]
  /** Files allowed to contain it — the canonical primitives themselves. */
  allow: string[]
  fix: string
}

const RULES: Rule[] = [
  {
    // A surface that hand-rolls the unavailable treatment gets its own idea of
    // what "disabled" looks like, and drops the keyboard-reachable explanation
    // rule 3 of "unavailable is never invisible" requires along the way.
    name: 'hand-rolled disabled control',
    pattern: /\bdisabled=\{/,
    allow: ['components/CommandButton.tsx', 'components/ContextMenuSettings.tsx'],
    fix: 'render the command through <CommandButton>, which owns aria-disabled + the hover/focus explanation',
  },
  {
    // The second portal is how a project ends up with two overlays that mount —
    // and therefore stack, clip and dismiss — differently. One mount point,
    // always: `MenuLayer` (surfaces) and `ContextMenuSettingsModal` (the dialog)
    // are shells over it, not portals of their own.
    name: 'second overlay portal',
    pattern: /createPortal\(/,
    allow: ['runtime/OverlayPortal.tsx'],
    fix: 'wrap the overlay in <OverlayPortal> — there is one mount point for everything this library floats',
  },
  {
    // A surface that writes its own anchor gets its own idea of what a link row
    // is — and drops `rel="noopener"`, the unavailable-link fallback, or the
    // scheme check on the way. `Command.href` plus `CommandButton` is the pair.
    name: 'hand-rolled link row',
    pattern: /\bhref=/,
    allow: ['components/CommandButton.tsx'],
    fix: 'give the command an `href` and render it through <CommandButton>, which owns the anchor, its rel/target and the disabled fallback',
  },
  {
    // The destructive tint is the same kind of cross-surface invariant as the
    // unavailable treatment: seven surfaces, one answer. A surface reaching for
    // the danger token itself is how "cancel" ends up red in the list and green
    // on the wheel.
    name: 'hand-rolled destructive treatment',
    pattern: /cm-danger/,
    allow: ['components/commandTone.ts'],
    fix: 'tint through commandTone.ts — toneColorOf() for coloured paint, toneStyleOf()/hoverToneClass()/activeToneClass() for ink and backgrounds',
  },
  {
    // Usage is the persisted state that makes Orbit and Whisper personal. A
    // surface writing it directly bypasses the learnFromUsage switch and the
    // weight ceiling.
    name: 'direct usage write',
    pattern: /usage:\s*\{/,
    allow: ['runtime/ContextMenuProvider.tsx', 'components/ContextMenuSettings.tsx'],
    fix: 'let runtime.runCommand() record usage — it honours learnFromUsage and the weight ceiling',
  },
  {
    // A colour a surface names itself is a colour that cannot follow a theme. It
    // is also the regression that hides best: a `fill="#fff"` disc and a
    // `bg-white/90` panel typecheck, pass the tests and pass every other rule
    // here, and are only wrong once someone looks at them on the dark palette.
    // Both mechanisms in theme.css switch tokens, so a literal opts out of both.
    //
    // Matches CSS colour functions, hex literals, and the Tailwind `white`/
    // `black` utilities (the property prefix is required so `whitespace-nowrap`
    // is not a colour). Scoped to what a surface paints: `src/lib` mixes colours
    // it is handed, `src/schema` carries the default *kind* colour, which is host
    // data by definition.
    name: 'raw colour literal',
    pattern:
      /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lch|lab)\(|\b(?:bg|text|border|fill|stroke|outline|ring|shadow|divide|caret|accent|decoration|placeholder|from|via|to)-(?:white|black)\b/,
    scope: ['surfaces/', 'components/'],
    allow: ['components/commandTone.ts'],
    fix: 'add a `cm-*` token to src/theme.css (a `light-dark()` pair when the two themes differ) and paint through it — `bg-cm-bg`, `fill-cm-bg`, `stroke-cm-rule`, or `var(--color-cm-…)` in an arbitrary value',
  },
]

/**
 * Prose is not a violation.
 *
 * The rules are deliberately dumb line matches, which means a comment that
 * *names* the thing it is telling you not to do trips them — and the fix a
 * session reaches for is to stop writing the explanation, which is exactly
 * backwards. Nothing this guard looks for can start a line with `//` or `*`.
 */
function isCommentLine(lineText: string): boolean {
  const trimmed = lineText.trimStart()
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(entryPath)
      return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [entryPath] : []
    }),
  )
  return files.flat()
}

const sourceFiles = await collectSourceFiles(SOURCE_ROOT)
const violations: Violation[] = []

for (const filePath of sourceFiles) {
  const relativePath = relative(SOURCE_ROOT, filePath)
  const lines = (await readFile(filePath, 'utf8')).split('\n')
  for (const rule of RULES) {
    if (rule.allow.includes(relativePath)) continue
    if (rule.scope !== undefined && !rule.scope.some((prefix) => relativePath.startsWith(prefix))) {
      continue
    }
    lines.forEach((lineText, lineIndex) => {
      if (isCommentLine(lineText)) return
      if (rule.pattern.test(lineText)) {
        violations.push({
          file: `src/${relativePath}`,
          line: lineIndex + 1,
          rule: rule.name,
          fix: rule.fix,
        })
      }
    })
  }
}

if (violations.length === 0) {
  console.log(`✓ surface guard: ${sourceFiles.length} files, ${RULES.length} rules, no violations`)
  process.exit(0)
}

console.error(`✗ surface guard: ${violations.length} violation(s)\n`)
for (const violation of violations) {
  console.error(`  ${violation.file}:${violation.line}  ${violation.rule}`)
  console.error(`    → ${violation.fix}\n`)
}
process.exit(1)
