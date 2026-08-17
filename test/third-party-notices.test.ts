/**
 * The half of the licensing that can rot silently.
 *
 * `LICENSE` and `THIRD-PARTY-NOTICES.md` are prose, and prose is reviewed. What
 * is not reviewed is whether the notices *arrive*: the demo bundles Inter and
 * JetBrains Mono rather than linking a font CDN — nothing this build needs is
 * fetched from a third party at runtime — OFL-1.1 clause 2
 * makes the copyright notice and the licence text a condition on that copy, and
 * the only thing carrying them to a visitor is a page emitted by a Vite plugin
 * and an `<a>` in the sidebar. Either of those can be renamed by someone who has
 * no idea they are a licence obligation — a moved file and a dead link look
 * identical to a 404, and a 404 here is a licence breach.
 *
 * So: the page the plugin writes, the href the demo points at, and the licence
 * this repo grants are all asserted here rather than left to a reader noticing.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { NOTICES_HREF } from '../demo/Colophon.tsx'
import { buildNoticesPage, NOTICES_PAGE } from '../scripts/thirdPartyNotices.ts'

const REPO_ROOT = resolve(import.meta.dirname, '..')
const read = (name: string): string => readFileSync(join(REPO_ROOT, name), 'utf8')

const licenseText = read('LICENSE')
const noticesText = read('THIRD-PARTY-NOTICES.md')
const packageManifest = JSON.parse(read('package.json')) as { license?: string }

/** What the build actually emits — the only copy a hosted visitor ever sees. */
const noticesPage = buildNoticesPage()

describe('the repo grants a licence', () => {
  test('MIT, under the house copyright line', () => {
    expect(licenseText.startsWith('MIT License\n\nCopyright (c) 2026 Enrico Scherlies\n')).toBe(true)
    expect(licenseText).toContain('Permission is hereby granted, free of charge')
    expect(licenseText).toContain('THE SOFTWARE IS PROVIDED "AS IS"')
  })

  test('package.json declares the same one', () => {
    expect(packageManifest.license).toBe('MIT')
  })
})

describe('the OFL notice covers both bundled families', () => {
  // Not "mentions Inter" — the copyright statement is the part OFL clause 2
  // requires, and a heading naming the font is not one.
  test('each family’s copyright statement is reproduced', () => {
    expect(noticesText).toContain(
      'Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)',
    )
    expect(noticesText).toContain(
      'Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)',
    )
  })

  test('the licence text travels with them, not just its name', () => {
    expect(noticesText).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007')
    expect(noticesText).toContain('PERMISSION & CONDITIONS')
    expect(noticesText).toContain('2) Original or Modified Versions of the Font Software may be')
    expect(noticesText).toContain('THE FONT SOFTWARE IS PROVIDED "AS IS"')
  })

  test('the fonts it names are the fonts the demo actually imports', () => {
    const demoStyles = read(join('demo', 'index.css'))
    expect(demoStyles).toContain('@fontsource-variable/inter')
    expect(demoStyles).toContain('@fontsource/jetbrains-mono')
    expect(noticesText).toContain('@fontsource-variable/inter')
    expect(noticesText).toContain('@fontsource/jetbrains-mono')
  })
})

describe('the notice reaches whoever loaded the demo', () => {
  test('the sidebar link points at the page the build emits', () => {
    expect(NOTICES_HREF).toBe(`./${NOTICES_PAGE}`)
  })

  // The emitted page is the only copy a hosted visitor can reach, so the
  // assertions above are worth nothing unless they hold of *it*. It carries our
  // own MIT notice too: the demo bundle is a distribution of this software, and
  // pointing at a LICENSE file that is not in the bundle is a 404, not a notice.
  test('the emitted page carries every notice the build owes, self-contained', () => {
    // Verbatim, not paraphrased — the MIT text has no character escapeHtml
    // touches, so it appears on the page exactly as LICENSE holds it.
    expect(noticesPage).toContain(licenseText.trimEnd())
    expect(noticesPage).toContain('Copyright 2016 The Inter Project Authors')
    expect(noticesPage).toContain('Copyright 2020 The JetBrains Mono Project Authors')
    expect(noticesPage).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007')
    expect(noticesPage).toContain('THE FONT SOFTWARE IS PROVIDED "AS IS"')
  })

  test('it stands alone — no bundle, no font, no stylesheet of its own', () => {
    expect(noticesPage).not.toContain('<script')
    expect(noticesPage).not.toContain('<link')
    expect(noticesPage).not.toContain('<img')
  })

  test('relative, because the demo is served from a subpath and not a root', () => {
    expect(NOTICES_HREF.startsWith('./')).toBe(true)
  })

  test('the plugin is wired into the build, not merely written', () => {
    expect(read('vite.config.ts')).toContain('thirdPartyNotices()')
  })
})
