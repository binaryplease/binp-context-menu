/**
 * The one descriptor list for the cast pad's grain — what each background is
 * called, and what it paints — the descriptor third of one descriptor, one
 * wrapper, one guard.
 *
 * Two surfaces read it: the pad, which paints one of them, and 05B's settings
 * section, which offers all of them. That is exactly the split `SURFACES` runs
 * on, so it takes the same shape — the schema owns the ids (a stored value has to
 * parse), this module owns the look and the wording, and neither side hand-writes
 * the other's list. A sixth pattern is one entry here plus one id there, and it is
 * offered in the panel the moment it exists.
 *
 * **Every pattern is one colour, mixed from `--color-cm-pad-ink`.** The pad lives
 * on the host's card and is painted in the host's neutrals (see theme.css); a
 * pattern that named a colour of its own would be the one part of the pad that
 * could not follow a re-pointed palette, and the guard fails a raw literal here
 * for that reason. Percentages differ per pattern because coverage does: a field
 * of 1px dots at 22% and a ruled line at the same strength are not the same amount
 * of ink on the card, and the grain must stay grain in both themes.
 *
 * The class strings are written out whole rather than composed, because Tailwind
 * scans source text — a class assembled from fragments at runtime is a class that
 * was never generated.
 */
import type { PadBackground } from '../schema/config.ts'

export type PadBackgroundDescriptor = {
  id: PadBackground
  /** What the settings panel calls it. */
  label: string
  /** The utilities that paint it, over the pad's own fill. Empty for `none`. */
  className: string
}

export const PAD_BACKGROUNDS: PadBackgroundDescriptor[] = [
  {
    id: 'dots',
    label: 'Dot grain',
    className:
      'bg-[radial-gradient(circle_at_1px_1px,color-mix(in_srgb,var(--color-cm-pad-ink)_22%,transparent)_1px,transparent_1.4px)] bg-[length:11px_11px]',
  },
  {
    id: 'ruled',
    label: 'Ruled lines',
    className:
      'bg-[repeating-linear-gradient(to_bottom,transparent_0_9px,color-mix(in_srgb,var(--color-cm-pad-ink)_16%,transparent)_9px_10px)]',
  },
  {
    id: 'grid',
    label: 'Graph grid',
    className:
      'bg-[repeating-linear-gradient(to_bottom,transparent_0_9px,color-mix(in_srgb,var(--color-cm-pad-ink)_13%,transparent)_9px_10px),repeating-linear-gradient(to_right,transparent_0_9px,color-mix(in_srgb,var(--color-cm-pad-ink)_13%,transparent)_9px_10px)]',
  },
  {
    id: 'hatch',
    label: 'Diagonal hatch',
    className:
      'bg-[repeating-linear-gradient(135deg,transparent_0_7px,color-mix(in_srgb,var(--color-cm-pad-ink)_14%,transparent)_7px_8.5px)]',
  },
  // No pattern layer at all — the pad's fill, its dashed edge and nothing else.
  // The quietest the patch goes while still being a patch.
  { id: 'none', label: 'None', className: '' },
]

const PAD_BACKGROUNDS_BY_ID: Record<PadBackground, PadBackgroundDescriptor> = Object.fromEntries(
  PAD_BACKGROUNDS.map((background) => [background.id, background]),
) as Record<PadBackground, PadBackgroundDescriptor>

/** The utilities for a configured background — `''` when it paints nothing. */
export function padBackgroundClassName(background: PadBackground): string {
  return PAD_BACKGROUNDS_BY_ID[background].className
}
