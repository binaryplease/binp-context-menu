/**
 * The leaf pieces every surface paints a command with.
 *
 * They live together because they are the invariant *inside* a command's
 * presentation — its icon tint, its label face, its matched characters, its
 * secondary detail, its kind badge. Seven surfaces arrange these differently
 * (that is the whole point of having seven), but none of them re-decides what a
 * mono label looks like, which characters a search highlighted, or how a
 * destructive command is tinted — these are the leaf pieces of the one shared
 * wrapper, each extracted at the size of its own invariant.
 *
 * Where the surfaces genuinely differ is the type *scale* — an 11px Compass
 * label, a 10px Lexicon caption, a 13.5px list row — so that arrives as a class,
 * not as a fifth copy of the component.
 */
import { IconPointFilled } from '@tabler/icons-react'
import type { Command, CommandKind } from '../schema/command.ts'
import { shortLabelOf } from '../schema/command.ts'
import type { MatchSegment } from '../lib/fuzzy.ts'
import { kindColorOf, toneColorOf, toneStyleOf } from './commandTone.ts'

export type CommandIconProps = {
  command: Command
  kind: CommandKind | null
  size?: number
  className?: string
}

/**
 * A command's icon, tinted by `toneColorOf` — its kind's colour, or the danger
 * token when the command is destructive. Commands with no icon still get a mark:
 * an empty slot would break the column alignment every list surface relies on.
 */
export function CommandIcon({ command, kind, size = 16, className = '' }: CommandIconProps) {
  const IconComponent = command.icon ?? IconPointFilled
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ color: toneColorOf(command, kind) }}
      aria-hidden
    >
      <IconComponent size={size} stroke={1.9} />
    </span>
  )
}

export type CommandLabelProps = {
  command: Command
  /** When present, the label is painted from these instead of the raw string. */
  segments?: MatchSegment[]
  /** Use `shortLabel` where space is tight — the Compass ring, the Strata lanes. */
  short?: boolean
  className?: string
  /** The face a mono command's label is set in, at this surface's scale. */
  monoClassName?: string
  /** The face everything else is set in, at this surface's scale. */
  proseClassName?: string
}

/**
 * The label, in the right face, in the right tone, with matched characters
 * marked.
 *
 * A fuzzy surface must show *where* it matched. The segments come from
 * the matcher itself, so the highlight can never drift out of step with the
 * ranking that produced it.
 *
 * The destructive tone is an inline style rather than a `text-cm-danger` class
 * because the caller has already set an ink class here — and Tailwind resolves
 * two conflicting `color` utilities by stylesheet order, not class order, so
 * stacking them would be a coin toss (see `commandTone.ts`).
 */
export function CommandLabel({
  command,
  segments,
  short = false,
  className = '',
  monoClassName = 'font-cm-mono text-[12.5px]',
  proseClassName = 'tracking-[-0.005em]',
}: CommandLabelProps) {
  const faceClass = command.monospace ? monoClassName : proseClassName
  const text = short ? shortLabelOf(command) : command.label
  return (
    <span className={`${faceClass} ${className}`} style={toneStyleOf(command)}>
      {segments === undefined ? text : <Highlighted segments={segments} />}
    </span>
  )
}

export type CommandDetailProps = {
  command: Command
  className?: string
}

/**
 * The dim half of a two-part row — `Command.detail`, in one face wherever it
 * appears. Renders nothing when the command carries none, so a surface can drop
 * it in unconditionally instead of guarding at four call sites.
 */
export function CommandDetail({ command, className = '' }: CommandDetailProps) {
  if (command.detail === null) return null
  return (
    <span className={`min-w-0 truncate font-cm-mono text-[10px] text-cm-ink-3 ${className}`}>
      {command.detail}
    </span>
  )
}

export type KindBadgeProps = {
  kind: CommandKind | null
}

/**
 * The kind pill on the right of a search result. Colour is the kind's own, as
 * `kindColorOf` renders it — the pill is ink on a surface, so on the dark palette
 * it takes the same legibility lift the lane labels and the wheel's arcs do.
 */
export function KindBadge({ kind }: KindBadgeProps) {
  if (kind === null) return null
  const kindColour = kindColorOf(kind)
  return (
    <span
      className="rounded-full px-1.5 py-0.5 font-cm-mono text-[9.5px] tracking-[0.06em] uppercase"
      style={{
        color: kindColour,
        background: `color-mix(in srgb, ${kindColour} 12%, transparent)`,
      }}
    >
      {kind.label}
    </span>
  )
}

/** Matched characters inside a secondary term (a keyword, a kind name). */
export function MatchedTerm({ segments }: { segments: MatchSegment[] }) {
  return (
    <span className="font-cm-mono text-[10px] text-cm-ink-3">
      <Highlighted segments={segments} />
    </span>
  )
}

/** The matched-run marking itself — the same in a label as in a keyword. */
function Highlighted({ segments }: { segments: MatchSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.matched ? (
          <mark key={index} className="rounded-[3px] bg-cm-match text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}
