/**
 * 03 · Strata — stop reading, start glancing.
 *
 * The heterogeneous wall is split into labelled, colour-coded lanes laid side by
 * side. You do not read a column top-to-bottom; you throw your eyes at the zone
 * you mean — green is run, blue is open — and land on shape plus colour. A 2-D
 * map beats an 18-row scroll, and unlike the wheel it needs no practice.
 *
 * It opens at the pointer, like every other menu you press a mouse button for,
 * and there is no second way to place it. A 2-D map is still a *menu*: sending
 * the eye to the middle of the screen after a click at the edge of it costs the
 * glance the lanes were meant to save, and the hand has to travel back. The
 * modal treatment this surface shipped with was that trade, and the knob that
 * kept it was a knob for the wrong answer.
 *
 * Centred *under* the pointer rather than hung off it by a corner, because four
 * lanes side by side are wide: from a corner the far lane is six hundred pixels
 * from the click, and the whole point is that every zone is one throw of the eye
 * away (`centreBelowPointer`).
 */
import { Panel, useAnchoredPanel } from '../components/Panel.tsx'
import { CommandDetail, CommandIcon, CommandLabel } from '../components/CommandVisuals.tsx'
import { CommandButton } from '../components/CommandButton.tsx'
import { hoverToneClass, kindColorOf } from '../components/commandTone.ts'
import { titleTextOf } from '../schema/command.ts'
import { useContextMenuRuntime } from '../runtime/context.ts'
import type { SurfaceComponentProps } from './types.ts'

export function StrataSurface({ invocation }: SurfaceComponentProps) {
  const { commands, kinds, kindOf, runCommand, config } = useContextMenuRuntime()
  const strata = config.strata
  // The same seam Original and Whisper place through — measured, then clamped, so
  // a wall of lanes pressed near an edge lands on screen instead of off it — with
  // the alignment that suits a wall rather than a column.
  const { ref, style } = useAnchoredPanel(invocation.anchor, 'below-centred')

  return (
    <div
      // Transparent to hit-testing so a press beside the panel still reaches the
      // layer underneath and dismisses; the panel itself takes pointer events back.
      className="pointer-events-none absolute inset-0"
    >
      <Panel
        panelRef={ref}
        style={style}
        // The press is at the panel's top *centre* now, so that is where the pop
        // grows from — an entrance that starts at a corner nothing happened in
        // reads as a panel arriving from somewhere else.
        origin="top"
        className="pointer-events-auto absolute !p-4"
      >
        <div className="px-1 pt-0.5 pb-3 text-[11px] tracking-[-0.005em] text-cm-ink-3">
          {strata.caption}
        </div>
        <div className="flex gap-2.5">
          {kinds.map((kind) => {
            const kindCommands = commands.filter((command) => command.kindId === kind.id)
            if (kindCommands.length === 0) return null
            return (
              <div key={kind.id} className="group" style={{ width: strata.columnWidth }}>
                <div className="flex items-center gap-[7px] px-1 pb-2">
                  <span
                    className="size-[9px] rounded-[3px]"
                    style={{ background: kindColorOf(kind) }}
                    aria-hidden
                  />
                  <span className="text-xs font-bold tracking-[-0.01em]">{kind.label}</span>
                  <span className="ml-auto font-cm-mono text-[10px] text-cm-ink-4">
                    {kindCommands.length}
                  </span>
                </div>
                <div className="flex flex-col gap-[3px] rounded-[10px] border border-cm-rule bg-cm-bg-soft px-[5px] py-2 transition-shadow group-hover:shadow-cm-lane">
                  {kindCommands.map((command) => (
                    <CommandButton
                      key={command.id}
                      command={command}
                      onActivate={runCommand}
                      title={titleTextOf(command)}
                      className={[
                        'flex items-center gap-[9px] rounded-[7px] px-2 py-1.5 text-left text-[12.5px] no-underline',
                        command.disabledReason === null
                          ? `cursor-pointer ${hoverToneClass(command, 'hover:bg-cm-bg')}`
                          : '',
                      ].join(' ')}
                    >
                      <CommandIcon command={command} kind={kindOf(command)} size={15} />
                      {/* A lane is 138px wide, so the detail goes under the label
                          rather than beside it — both truncate on their own line. */}
                      <span className="flex min-w-0 flex-col items-start">
                        <CommandLabel
                          command={command}
                          short
                          className="max-w-full truncate"
                          monoClassName="font-cm-mono text-[11.5px]"
                        />
                        <CommandDetail command={command} className="max-w-full" />
                      </span>
                    </CommandButton>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
