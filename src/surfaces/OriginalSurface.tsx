/**
 * 00 · Original — the flat list you started with.
 *
 * Eighteen unlike commands stacked in one scannable column: object actions,
 * shell scripts, app launchers, product verbs. Every invocation costs a full
 * re-read, and the reading cost grows with the list. It ships as a first-class
 * surface because it is the floor the other six are measured against — and
 * because it is still the right answer for a menu of four items.
 */
import { Panel, useAnchoredPanel } from '../components/Panel.tsx'
import { CommandRow } from '../components/CommandRow.tsx'
import { useContextMenuRuntime } from '../runtime/context.ts'
import type { SurfaceComponentProps } from './types.ts'

export function OriginalSurface({ invocation }: SurfaceComponentProps) {
  const { commands, kinds, kindOf, runCommand } = useContextMenuRuntime()
  const { ref, style } = useAnchoredPanel(invocation.anchor)

  return (
    <Panel panelRef={ref} className="absolute" style={{ ...style, minWidth: 230 }}>
      {kinds.map((kind, kindIndex) => {
        const kindCommands = commands.filter((command) => command.kindId === kind.id)
        if (kindCommands.length === 0) return null
        return (
          <div key={kind.id}>
            {kindIndex > 0 ? <div className="mx-2 my-[5px] h-px bg-cm-rule" /> : null}
            {kindCommands.map((command) => (
              <CommandRow
                key={command.id}
                command={command}
                kind={kindOf(command)}
                onActivate={runCommand}
                trailing={
                  command.hint === null ? null : (
                    <span className="font-cm-mono text-[10px] text-cm-ink-4">{command.hint}</span>
                  )
                }
              />
            ))}
          </div>
        )
      })}
    </Panel>
  )
}
