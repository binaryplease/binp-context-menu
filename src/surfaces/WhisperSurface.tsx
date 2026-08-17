/**
 * 01 · Whisper — the menu you talk to.
 *
 * Invocation drops a caret exactly where you clicked, already blinking. Type two
 * letters and the command is selected; reading cost collapses from O(n) to the
 * two keys your fingers already know. With an empty query it is a browsable
 * menu — your most-used commands first, then grouped by kind — so the surface
 * teaches itself and then gets out of the way.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { IconSearch } from '@tabler/icons-react'
import { Panel, useAnchoredPanel } from '../components/Panel.tsx'
import { CommandRow } from '../components/CommandRow.tsx'
import { KindBadge, MatchedTerm } from '../components/CommandVisuals.tsx'
import { bestFuzzyMatch, type MatchSegment } from '../lib/fuzzy.ts'
import { searchableTermsOf, type Command } from '../schema/command.ts'
import { useContextMenuRuntime } from '../runtime/context.ts'
import type { SurfaceComponentProps } from './types.ts'

type ResultRow = {
  command: Command
  segments: MatchSegment[]
  /**
   * The matched text when the hit came from something other than the label — a
   * keyword, or the kind. A fuzzy match must be visible, and highlighting a match
   * the user cannot see is not visible, so the row has to surface the field that
   * actually matched.
   */
  matchedTerm: { text: string; segments: MatchSegment[] } | null
}

export function WhisperSurface({ invocation }: SurfaceComponentProps) {
  const { commands, kinds, kindOf, weightOf, runCommand, config } = useContextMenuRuntime()
  const whisper = config.whisper
  const { ref, style } = useAnchoredPanel(invocation.anchor)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const searchResults = useMemo<ResultRow[]>(() => {
    const trimmed = query.trim()
    if (trimmed === '') return []
    const scored = commands.flatMap((command) => {
      const terms = searchableTermsOf(command, kindOf(command))
      const match = bestFuzzyMatch(terms, trimmed)
      if (match === null) return []
      const matchedTermText = terms[match.fieldIndex] ?? command.label
      return [
        {
          command,
          score: match.score,
          row: {
            command,
            segments:
              match.fieldIndex === 0 ? match.segments : [{ text: command.label, matched: false }],
            matchedTerm:
              match.fieldIndex === 0
                ? null
                : { text: matchedTermText, segments: match.segments },
          } satisfies ResultRow,
        },
      ]
    })
    scored.sort(
      (first, second) =>
        first.score - second.score || weightOf(second.command) - weightOf(first.command),
    )
    const rows = scored.map((entry) => entry.row)
    return whisper.maxResults > 0 ? rows.slice(0, whisper.maxResults) : rows
  }, [commands, kindOf, query, weightOf, whisper.maxResults])

  const browseGroups = useMemo(() => {
    const groups: { heading: string; commands: Command[] }[] = []
    if (whisper.showMostUsed && whisper.mostUsedCount > 0) {
      const mostUsed = [...commands]
        .sort((first, second) => weightOf(second) - weightOf(first))
        .slice(0, whisper.mostUsedCount)
      if (mostUsed.length > 0) groups.push({ heading: 'Most used', commands: mostUsed })
    }
    if (whisper.groupByKind) {
      for (const kind of kinds) {
        const kindCommands = commands.filter((command) => command.kindId === kind.id)
        if (kindCommands.length === 0) continue
        const heading = kind.description === '' ? kind.label : `${kind.label} · ${kind.description}`
        groups.push({ heading, commands: kindCommands })
      }
    } else {
      groups.push({ heading: 'All commands', commands })
    }
    return groups
  }, [commands, kinds, weightOf, whisper.groupByKind, whisper.mostUsedCount, whisper.showMostUsed])

  const isSearching = query.trim() !== ''
  // One flat ordering behind both modes so ↑↓ and ⏎ mean the same thing whether
  // you are searching or browsing.
  const flatCommands = useMemo<Command[]>(
    () =>
      isSearching
        ? searchResults.map((row) => row.command)
        : browseGroups.flatMap((group) => group.commands),
    [browseGroups, isSearching, searchResults],
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const activeRow = resultsRef.current?.querySelector(`[data-row-index="${activeIndex}"]`)
    activeRow?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function moveActive(delta: number) {
    setActiveIndex((current) => {
      if (flatCommands.length === 0) return 0
      return Math.min(flatCommands.length - 1, Math.max(0, current + delta))
    })
  }

  let rowIndex = -1
  const nextRowIndex = () => {
    rowIndex += 1
    return rowIndex
  }

  return (
    <Panel
      panelRef={ref}
      style={{ ...style, width: whisper.width }}
      className="absolute overflow-hidden !p-0"
    >
      <div className="flex items-center gap-2.5 border-b border-cm-rule px-3.5 py-3">
        <IconSearch size={15} className="shrink-0 text-cm-ink-4" />
        <input
          ref={inputRef}
          value={query}
          onChange={(changeEvent) => setQuery(changeEvent.target.value)}
          onKeyDown={(keyboardEvent) => {
            if (keyboardEvent.key === 'ArrowDown') {
              keyboardEvent.preventDefault()
              moveActive(1)
            } else if (keyboardEvent.key === 'ArrowUp') {
              keyboardEvent.preventDefault()
              moveActive(-1)
            } else if (keyboardEvent.key === 'Enter') {
              keyboardEvent.preventDefault()
              const command = flatCommands[activeIndex]
              if (command !== undefined) runCommand(command)
            }
          }}
          placeholder={whisper.placeholder}
          aria-label={whisper.placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full border-none bg-transparent text-sm tracking-[-0.01em] text-cm-ink outline-none placeholder:text-cm-ink-4"
        />
      </div>

      <div ref={resultsRef} className="max-h-[348px] overflow-y-auto p-1.5">
        {isSearching ? (
          searchResults.length === 0 ? (
            <div className="px-3.5 py-5 text-center text-[13px] text-cm-ink-3">
              No command matches “{query}”.
            </div>
          ) : (
            searchResults.map((row) => {
              const index = nextRowIndex()
              return (
                <div key={row.command.id} data-row-index={index}>
                  <CommandRow
                    command={row.command}
                    kind={kindOf(row.command)}
                    segments={row.segments}
                    active={index === activeIndex}
                    onHover={() => setActiveIndex(index)}
                    onActivate={runCommand}
                    trailing={
                      row.matchedTerm === null ? (
                        <KindBadge kind={kindOf(row.command)} />
                      ) : (
                        <MatchedTerm segments={row.matchedTerm.segments} />
                      )
                    }
                  />
                </div>
              )
            })
          )
        ) : (
          browseGroups.map((group) => (
            <div key={group.heading}>
              <div className="px-2.5 pt-2 pb-1 font-cm-mono text-[9.5px] tracking-[0.08em] text-cm-ink-4 uppercase">
                {group.heading}
              </div>
              {group.commands.map((command) => {
                const index = nextRowIndex()
                return (
                  <div key={`${group.heading}:${command.id}`} data-row-index={index}>
                    <CommandRow
                      command={command}
                      kind={kindOf(command)}
                      active={index === activeIndex}
                      onHover={() => setActiveIndex(index)}
                      onActivate={runCommand}
                      trailing={<KindBadge kind={kindOf(command)} />}
                    />
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-3.5 border-t border-cm-rule px-3.5 py-2 text-[11px] text-cm-ink-4">
        <span>
          <KeyCap>↑↓</KeyCap>navigate
        </span>
        <span>
          <KeyCap>⏎</KeyCap>run
        </span>
        <span>
          <KeyCap>esc</KeyCap>close
        </span>
      </div>
    </Panel>
  )
}

function KeyCap({ children }: { children: string }) {
  return (
    <span className="mr-1.5 rounded border border-cm-rule bg-cm-bg-mute px-1.5 py-px font-cm-mono text-cm-ink-3">
      {children}
    </span>
  )
}
