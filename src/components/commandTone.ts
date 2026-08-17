/**
 * The one destructive treatment — and the one place a *kind's* colour is turned
 * into paint.
 *
 * `Command.destructive` is the contract; this module is the mechanism, in the
 * same shape as `CommandButton` is the mechanism behind `disabledReason`. Seven
 * surfaces paint a command in a colour, and every one of them derives that
 * colour from here, so a cancel row reads as a cancel on the wheel and in the
 * bubbles too — not only in the two list surfaces. One descriptor, one wrapper,
 * one guard; and an interaction state that appears on two surfaces is a single
 * token.
 *
 * Three shapes, because surfaces need three things:
 *
 * - `toneColorOf` for what is *already* coloured by the command's kind — the
 *   icon tint, an Orbit bubble's fill, a Compass slice's focus wash. Destructive
 *   overrides the kind.
 * - `kindColorOf` for a kind painted on its own, with no command in hand — the
 *   Compass wheel's arc labels, a Strata lane's swatch, Whisper's kind badge.
 * - `hoverToneClass` / `toneStyleOf` for what is normally ink. These are
 *   deliberately either/or rather than an extra class layered on top: Tailwind
 *   resolves two conflicting `color` utilities by *stylesheet* order, not class
 *   order, so appending `text-cm-danger` to a caller's `text-cm-ink` is a coin
 *   toss. A style object always wins, and a swapped class never conflicts.
 */
import type { CSSProperties } from 'react'
import type { Command, CommandKind } from '../schema/command.ts'

/**
 * The danger colour, as a token reference rather than a literal, so a host that
 * overrides `--color-cm-danger` re-tints every destructive command on all seven
 * surfaces — the same deal the rest of the palette offers.
 */
export const DESTRUCTIVE_TONE = 'var(--color-cm-danger)'

/**
 * A kind's colour, as paint.
 *
 * `CommandKind.color` is the one colour in this library that is *host data*
 * rather than a token: the host picks it, and it almost always picks it against
 * a white page. Dropped unchanged onto the dark palette, a mid-tone violet or a
 * forest green sinks into the charcoal and the lane it labels stops being
 * findable — which is the whole job of a kind colour.
 *
 * So it is mixed toward the active ink by `--cm-kind-lift`, which the token file
 * switches with the palette: `transparent 0%` under light (the mix is the
 * identity, so a host's colour is used exactly as given), a share of
 * `--color-cm-ink` under dark. The lift is a *token*, not a JavaScript colour
 * map, so a host stays in control of it: supply dark-aware kind colours (a
 * `.color` may be any CSS colour, `light-dark()` included) and switch the lift
 * off with `--cm-kind-lift-dark: transparent 0%`.
 *
 * `in oklab` because the mix has to raise perceived lightness without dragging
 * the hue, which is exactly what an sRGB mix does not do.
 */
export function kindColorOf(kind: CommandKind | null, fallback = 'var(--color-cm-accent)'): string {
  if (kind === null) return fallback
  return `color-mix(in oklab, ${kind.color}, var(--cm-kind-lift))`
}

/**
 * The colour a surface paints this command in: its kind's, unless the command is
 * destructive, in which case the danger token wins over the kind.
 *
 * `fallback` is what an un-kinded command gets — the library's own accent, which
 * belongs to no kind.
 */
export function toneColorOf(
  command: Command,
  kind: CommandKind | null,
  fallback = 'var(--color-cm-accent)',
): string {
  if (command.destructive) return DESTRUCTIVE_TONE
  return kindColorOf(kind, fallback)
}

/**
 * The inline text colour for a destructive command, or `undefined` to leave the
 * caller's own ink class alone. Inline so it beats whatever `text-cm-*` the
 * surface set, without either of them having to know about the other.
 */
export function toneStyleOf(command: Command): CSSProperties | undefined {
  return command.destructive ? { color: DESTRUCTIVE_TONE } : undefined
}

/**
 * The hover background a command's control takes. Swapped, not stacked: a
 * destructive row warms toward the danger tint, everything else keeps whatever
 * the surface hovers with.
 */
export function hoverToneClass(command: Command, baseClass = 'hover:bg-cm-hover'): string {
  return command.destructive ? 'hover:bg-cm-danger-soft' : baseClass
}

/**
 * The background a control takes while it is the keyboard cursor. Separate from
 * `hoverToneClass` only because it carries no `hover:` variant — the two states
 * are deliberately the same colour ("interaction state is a shared token"), so a
 * row under the pointer and a
 * row under ↓ are indistinguishable.
 */
export function activeToneClass(command: Command, baseClass = 'bg-cm-hover'): string {
  return command.destructive ? 'bg-cm-danger-soft' : baseClass
}
