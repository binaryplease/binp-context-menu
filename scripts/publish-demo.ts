#!/usr/bin/env bun
/**
 * Publish the built demo to its public share link.
 *
 * The demo has one hosted entry, and it is the one the retired prototype used to
 * occupy — that prototype was a single 95 KB `index.html` on
 * `zink.bot`, and the productised demo replaces it *in place* rather than beside
 * it, so every link that has been handed out keeps working and there is only ever
 * one live "context menu, reinvented" to find.
 *
 * How the slug travels: `.zink-slug` at the repo root is the record, and `zink
 * publish` reads the sidecar out of the folder it is pointed at. `dist/demo` is
 * rebuilt with `emptyOutDir`, so the sidecar cannot live there between builds —
 * this script copies it in before publishing and checks afterwards that it still
 * says the same thing. A publish that silently became a *new* entry would leave
 * the old link showing the old prototype forever, which is exactly the failure
 * the sidecar exists to prevent.
 *
 * Resolves its paths from its own location, not the cwd, so `mise run publish`
 * works from any directory.
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(import.meta.dirname, '..')
const SLUG_FILE = join(REPO_ROOT, '.zink-slug')
const BUILD_DIR = join(REPO_ROOT, 'dist', 'demo')

/** Fail loudly, with the one thing the operator has to do about it. */
function fail(message: string): never {
  console.error(`[publish-demo] ${message}`)
  process.exit(1)
}

function readSlug(path: string): string {
  return readFileSync(path, 'utf8').trim()
}

if (!existsSync(SLUG_FILE)) {
  fail(
    `${SLUG_FILE} is missing — it is the demo's hosted identity and is checked in. ` +
      'Restore it rather than publishing a fresh entry, or the share link that is already out ' +
      'there keeps serving the retired prototype.',
  )
}

const recordedSlug = readSlug(SLUG_FILE)
if (recordedSlug === '') fail(`${SLUG_FILE} is empty — it must hold the hosted entry's slug.`)

if (!existsSync(join(BUILD_DIR, 'index.html'))) {
  fail(`no build at ${BUILD_DIR} — run \`mise run build\` first (\`mise run publish\` does).`)
}

const publishedSidecar = join(BUILD_DIR, '.zink-slug')
copyFileSync(SLUG_FILE, publishedSidecar)

// The bare command name is the contract; where the CLI lives on disk is not ours
// to know. stdio is inherited so zink's own progress and errors reach the
// operator unedited.
const zink = Bun.spawnSync(['zink', 'publish', BUILD_DIR], {
  cwd: REPO_ROOT,
  stdio: ['inherit', 'inherit', 'inherit'],
})

if (zink.exitCode !== 0) fail(`zink publish exited ${zink.exitCode} — the demo was not replaced.`)

// `zink publish` only rewrites the sidecar when it hosts a *new* entry, which a
// recorded slug is supposed to make impossible. Check anyway: the failure mode is
// silent and permanent, and the check is one file read.
const publishedSlug = readSlug(publishedSidecar)
if (publishedSlug !== recordedSlug) {
  fail(
    `zink published ${publishedSlug} instead of replacing ${recordedSlug}. The old link is ` +
      'unchanged and a second entry now exists — reconcile them before publishing again.',
  )
}

console.log(`[publish-demo] replaced https://zink.bot/v/${recordedSlug} with dist/demo`)
