/**
 * One row of a command list — shared whole by Original and Whisper.
 *
 * Two surfaces render a command as a row, so the row is extracted at the size of
 * its invariant — the largest co-occurring thing that must not differ: the icon
 * slot, the label face, the secondary
 * detail beside it, the trailing affordance, and their spacing. What the two
 * surfaces genuinely differ on is *what* trails the label — a keyboard hint on
 * Original, a kind badge or the matched keyword on Whisper — and that difference
 * is a value, so it arrives as a prop rather than as a second copy of the row.
 *
 * Availability and link semantics are not this component's business:
 * `CommandButton` owns both.
 */
import type { ReactNode } from 'react'
import type { Command, CommandKind } from '../schema/command.ts'
import type { MatchSegment } from '../lib/fuzzy.ts'
import { CommandButton } from './CommandButton.tsx'
import { CommandDetail, CommandIcon, CommandLabel } from './CommandVisuals.tsx'
import { activeToneClass, hoverToneClass } from './commandTone.ts'

export type CommandRowProps = {
  command: Command
  kind: CommandKind | null
  /** Keyboard cursor. Styled identically to hover — one interaction-state token. */
  active?: boolean
  segments?: MatchSegment[]
  trailing?: ReactNode
  onActivate: (command: Command) => void
  onHover?: (command: Command) => void
}

export function CommandRow({
  command,
  kind,
  active = false,
  segments,
  trailing,
  onActivate,
  onHover,
}: CommandRowProps) {
  const isAvailable = command.disabledReason === null
  return (
    <CommandButton
      command={command}
      onActivate={onActivate}
      onHover={onHover}
      explanationPlacement="below"
      className={[
        'flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-left text-[13.5px] text-cm-ink no-underline',
        isAvailable ? `cursor-pointer ${hoverToneClass(command)}` : '',
        active && isAvailable ? activeToneClass(command) : '',
      ].join(' ')}
    >
      <CommandIcon command={command} kind={kind} />
      {/* Label and detail share the row's flexible column so the detail can be
          truncated before the label is, rather than pushing the trailing
          affordance off the end. */}
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <CommandLabel command={command} segments={segments} className="min-w-0 truncate" />
        <CommandDetail command={command} />
      </span>
      {trailing}
    </CommandButton>
  )
}
