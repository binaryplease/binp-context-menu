/**
 * The rune seam — which stroke casts which command, and the one way that changes.
 *
 * Two things bind a rune to a command, and they are not equals:
 *
 * - **The host's**, `Command.glyph`, naming a glyph in the lexicon it passed to
 *   the provider. This is how a host ships an alphabet. The library ships none.
 * - **The user's**, `config.sigil.runes`, a stroke they drew on the field or took
 *   from the palette. It wins, always — a rune is muscle memory, and a host
 *   changing its mind in a release must not silently re-point a gesture someone
 *   has learned.
 *
 * Resolution is a pure function so the Sigil surface, the settings panel and the
 * tests all answer "what casts this?" the same way, and the two writes are
 * recipes rather than components so the *only* thing that binds a rune is one
 * `updateConfig` call — the shared wrapper for content, the run path's
 * counterpart.
 */
import type { Command } from '../schema/command.ts'
import type { SigilRune } from '../schema/config.ts'
import type { ConfigRecipe } from '../persistence/store.ts'
import type { Glyph } from '../lib/glyphs.ts'

export type ResolvedRune = {
  glyph: Glyph
  /** `user` — drawn or picked here; `host` — shipped in `Command.glyph`. */
  source: 'user' | 'host'
}

/**
 * Is this stored rune usable?
 *
 * Everything in the config parses with a default, so a rune can legitimately
 * arrive empty (a truncated storage value, a hand-edited file, a version that
 * wrote the field before it wrote the points). One point is not a stroke, so it
 * is dropped here rather than handed to a recognizer that would score it against
 * everything and win.
 */
export function isBoundRune(rune: SigilRune): boolean {
  return rune.commandId !== '' && rune.points.length >= 2
}

/** The user's own rune for a command, if they have bound one. */
export function userRuneOf(runes: readonly SigilRune[], commandId: string): SigilRune | null {
  return runes.find((rune) => isBoundRune(rune) && rune.commandId === commandId) ?? null
}

/** What casts this command — the user's rune, else the host's, else nothing. */
export function resolveRune(
  command: Command,
  runes: readonly SigilRune[],
  lexicon: readonly Glyph[],
): ResolvedRune | null {
  const own = userRuneOf(runes, command.id)
  if (own !== null) return { glyph: { name: own.name, points: own.points }, source: 'user' }
  if (command.glyph === null) return null
  const shipped = lexicon.find((glyph) => glyph.name === command.glyph)
  // A `glyph` naming a rune that is not in the lexicon is a host typo, and the
  // honest answer is "this command has no rune" — inventing one would put a
  // gesture on the field that the host never described.
  return shipped === undefined ? null : { glyph: shipped, source: 'host' }
}

/** What to call a rune in prose. A drawn one has no name, only a shape. */
export function runeDisplayNameOf(glyph: Glyph): string {
  return glyph.name === '' ? 'drawn' : glyph.name
}

/**
 * Bind a rune to a command, replacing whatever it had.
 *
 * A command holds at most one rune — the list is filtered by command id before
 * the new one is appended — because two strokes for one command is a recognizer
 * competing with itself for no gain the user asked for.
 *
 * The reverse holds too, for a rune taken from the palette: a *named* rune has
 * one owner, so picking one that already casts something else moves it rather
 * than cloning it. Two commands answering to one stroke is a coin toss at cast
 * time, and the user would have no way to see which way it landed. (A host that
 * both ships `Command.glyph` and lets a user pick the same name can still get
 * there; nothing in the config can un-name a host's own binding.)
 */
export function bindRuneRecipe(
  commandId: string,
  rune: { name: string; points: readonly (readonly [number, number])[] },
): ConfigRecipe {
  const points = rune.points.map(([x, y]) => [x, y] as [number, number])
  return (current) => ({
    ...current,
    sigil: {
      ...current.sigil,
      runes: [
        ...current.sigil.runes.filter(
          (existing) =>
            existing.commandId !== commandId &&
            !(rune.name !== '' && existing.name === rune.name),
        ),
        { commandId, name: rune.name, points },
      ],
    },
  })
}

/**
 * Take a command's rune away.
 *
 * The command keeps its place on all seven surfaces — it is only unreachable *by
 * gesture*, which is the user's own decision and not an unavailable control.
 */
export function unbindRuneRecipe(commandId: string): ConfigRecipe {
  return (current) => ({
    ...current,
    sigil: {
      ...current.sigil,
      runes: current.sigil.runes.filter((existing) => existing.commandId !== commandId),
    },
  })
}
