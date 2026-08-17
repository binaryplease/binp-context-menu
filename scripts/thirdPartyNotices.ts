/**
 * Serve and ship `THIRD-PARTY-NOTICES.md` as a page the built demo can link to.
 *
 * The demo self-hosts its two faces rather than fetching them from a font CDN
 * — nothing this build needs is fetched from a third party at runtime — so
 * Inter and JetBrains Mono end up as `.woff2` files inside
 * `dist/demo`. Both are OFL-1.1, and clause 2 of that licence is a condition on
 * *the copy*: a bundle that carries the font files has to carry the copyright
 * notice and the licence text with them. A notices file sitting only in the git
 * repo does not travel to whoever loads the hosted demo, so it is emitted into
 * the build here and linked from the demo's sidebar colophon.
 *
 * One source, two renderings: the two files at the repo root are what GitHub
 * shows and what a contributor edits; this plugin concatenates that exact text
 * into a minimal HTML shell. Nothing is reformatted or summarised on the way — a
 * licence that has been through a renderer is a licence somebody has to diff,
 * which is also why the markdown is written to read as plain text.
 *
 * `LICENSE` is appended rather than linked, for the same reason the notices are
 * emitted at all: the built demo is itself a distribution of this software, MIT
 * asks that its notice be included in one, and a link to a file that is not in
 * the bundle is a 404 rather than a notice. Whoever opens this page has
 * everything the build owes them on it.
 *
 * Emitted as `.html` rather than `.txt` because the demo's host serves the build
 * as a static directory, and `index.html` is the one content type it is already
 * proven to serve. The page is entirely self-contained — no bundle, no font, no
 * stylesheet of its own — so it stays readable when it is the only thing that
 * loaded.
 *
 * Resolves its paths from its own location, not the cwd ("a script resolves its
 * paths from its own location"), because Vite runs with `root: 'demo'`.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

const REPO_ROOT = resolve(import.meta.dirname, '..')
const NOTICES_SOURCE = join(REPO_ROOT, 'THIRD-PARTY-NOTICES.md')
const LICENSE_SOURCE = join(REPO_ROOT, 'LICENSE')

/** The path the demo links to, in the build and on the dev server alike. */
export const NOTICES_PAGE = 'third-party-notices.html'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * The shell around the notices. Deliberately plain: this is a legal notice, and
 * the one thing it owes a reader is the text, unaltered and legible. It follows
 * `prefers-color-scheme` for the same reason every other surface here does — a
 * white plate on a dark board is a defect wherever it appears.
 */
function renderNoticesPage(noticesText: string, licenseText: string): string {
  // No "-- MIT License" on the heading: LICENSE opens by naming itself, and a
  // heading that says it first only makes the reader read it twice.
  const body = `${noticesText}\n\n## context menu\n\n${licenseText}`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>context menu · third-party notices</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        padding: 2.5rem 1.5rem 6rem;
        background: light-dark(#f6f6f7, #101012);
        color: light-dark(#18181b, #e6e6e9);
        font: 400 13px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      pre {
        /* The sources are hard-wrapped at 78 columns; the extra headroom keeps
           the browser from soft-wrapping them a second time and shredding the
           licence into ragged half-lines. */
        max-width: 86ch;
        margin: 0 auto;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      a {
        color: light-dark(#6d28d9, #a78bfa);
      }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(body)}</pre>
  </body>
</html>
`
}

/**
 * Reads both sources fresh on every call, so editing either one does not need a
 * dev-server restart and a stale build cannot ship a notice that no longer
 * matches the file under review. Exported so `test/third-party-notices.test.ts`
 * asserts against the artifact rather than against its ingredients.
 */
export function buildNoticesPage(): string {
  return renderNoticesPage(
    readFileSync(NOTICES_SOURCE, 'utf8'),
    readFileSync(LICENSE_SOURCE, 'utf8'),
  )
}

export function thirdPartyNotices(): Plugin {
  return {
    name: 'binp-context-menu:third-party-notices',
    configureServer(server) {
      server.middlewares.use(`/${NOTICES_PAGE}`, (_request, response) => {
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(buildNoticesPage())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: NOTICES_PAGE, source: buildNoticesPage() })
    },
  }
}
