/**
 * The host's half of the loop: write a command, then go and give it a rune.
 *
 * It is demo code on purpose. Commands are host data — the library parses them at
 * its boundary and never authors one — so the form that makes one belongs to the
 * app, next to the board it acts on, and it is here to show that a command a user
 * invented is the same shape as a command a developer typed. Once added it is in
 * all seven directions, and in the Sigil Lexicon with an empty rune slot beside
 * it.
 *
 * Styled from the library's tokens rather than the demo's own palette, because it
 * shares a rail with the direction picker and a column edge with the settings
 * panel: a form in a second visual dialect would read as a different app's.
 *
 * It hangs under the directions with a rule *above* it — the divider belongs
 * between the two lists in that rail, and the one below it would draw a second
 * line a few pixels from the rail's own footer border.
 */
import { useState } from 'react'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import type { CommandKindInput } from '../src/index.ts'
import type { HostCommand } from './hostCommands.ts'

export function CommandComposer({
  kinds,
  commands,
  onAdd,
  onRemove,
}: {
  kinds: CommandKindInput[]
  commands: HostCommand[]
  onAdd: (label: string, kindId: string) => void
  onRemove: (id: string) => void
}) {
  const [label, setLabel] = useState('')
  const [kindId, setKindId] = useState(kinds[0]?.id ?? 'act')
  const trimmedLabel = label.trim()

  return (
    <section className="flex flex-col gap-1.5 border-t border-cm-rule pt-4">
      <h3 className="font-cm-mono text-[10px] tracking-[0.09em] text-cm-ink-3 uppercase">
        Commands
      </h3>
      <p className="text-[11.5px] leading-snug text-cm-ink-3">
        Host data, not library data — this form is the demo's. Add one and it is in every
        direction at once, and in the Sigil Lexicon waiting for a rune.
      </p>

      <form
        className="mt-1 flex flex-col gap-1.5"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault()
          if (trimmedLabel === '') return
          onAdd(trimmedLabel, kindId)
          setLabel('')
        }}
      >
        <input
          type="text"
          aria-label="New command label"
          placeholder="Deploy to staging…"
          className="w-full rounded-cm-sm border border-cm-rule bg-cm-bg px-2 py-1.5 text-[12px] text-cm-ink placeholder:text-cm-ink-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent"
          value={label}
          onChange={(changeEvent) => setLabel(changeEvent.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <select
            aria-label="Kind"
            className="min-w-0 flex-1 cursor-pointer rounded-cm-sm border border-cm-rule bg-cm-bg px-2 py-1.5 text-[12px]"
            value={kindId}
            onChange={(changeEvent) => setKindId(changeEvent.target.value)}
          >
            {kinds.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
          {/*
            Inert rather than gone while the label is empty — unavailable is
            never invisible: the
            explanation is the placeholder above it, and `aria-disabled` keeps the
            control focusable so a keyboard user reaches the form's one button and
            finds out why it will not fire.
          */}
          <button
            type="submit"
            aria-disabled={trimmedLabel === ''}
            title={trimmedLabel === '' ? 'Give the command a label first' : 'Add this command'}
            className={`flex shrink-0 items-center gap-1.5 rounded-cm-sm px-2.5 py-1.5 text-[12px] font-semibold text-cm-on-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent ${
              trimmedLabel === '' ? 'cursor-not-allowed bg-cm-accent/45' : 'cursor-pointer bg-cm-accent'
            }`}
          >
            <IconPlus size={13} />
            Add
          </button>
        </div>
      </form>

      {commands.length === 0 ? null : (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {commands.map((command) => (
            <li
              key={command.id}
              className="flex items-center justify-between gap-2 rounded-cm-sm px-1.5 py-1 text-[12px] hover:bg-cm-hover"
            >
              <span className="min-w-0 truncate text-cm-ink-2">{command.label}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-cm-mono text-[10px] text-cm-ink-4">{command.kindId}</span>
                <button
                  type="button"
                  aria-label={`Remove ${command.label}`}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-md text-cm-ink-3 hover:text-cm-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent"
                  onClick={() => onRemove(command.id)}
                >
                  <IconTrash size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
