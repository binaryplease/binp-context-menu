/**
 * The demo — a board of task cards, armed with the library, plus the two things
 * a host is expected to build for itself: a direction switcher (composed from the
 * library's shared `SurfacePicker`) and a way into the settings. The second one
 * is a one-liner here, because the dialog shell ships:
 * `<ContextMenuSettingsModal>` is the same panel as `<ContextMenuSettings>`,
 * framed.
 *
 * Both shells are on screen at once, on purpose: the Configure button opens the
 * whole panel in a dialog, and the second column mounts its direction-scoped half
 * (`scope="direction"`) right beside the picker that chooses which direction that
 * is, so a knob stays under your hand while you right-click a card. One settings
 * UI, two frames, and the column shows the knobs of the direction you are actually
 * using and nothing else — what applies to all seven is a click into Configure.
 *
 * The persistence wired up here is deliberately a *custom* pair of functions
 * rather than the shipped localStorage adapter: it is the shape of the seam a
 * real host uses (post to a server, write over IPC, push into a sync engine), and
 * showing it as three lines is the point.
 */
import { useCallback, useMemo, useState } from 'react'
import { IconClock, IconLayoutGrid, IconPlayerPlay, IconSettings } from '@tabler/icons-react'
import {
  CastPad,
  ContextMenuProvider,
  ContextMenuSettings,
  ContextMenuSettingsModal,
  MenuButton,
  SURFACES_BY_ID,
  SurfacePicker,
  parseConfig,
  useContextMenu,
  useContextMenuConfig,
  type Command,
  type ContextMenuPersistence,
} from '../src/index.ts'
import { COMMANDS, KINDS } from './commands.ts'
import { Colophon } from './Colophon.tsx'
import { CommandComposer } from './CommandComposer.tsx'
import {
  hostCommandIdFor,
  loadHostCommands,
  saveHostCommands,
  toCommandInput,
  type HostCommand,
} from './hostCommands.ts'
import { hasSeededRunes, markRunesSeeded, withSeededRunes } from './seedRunes.ts'
import { TASKS, type DemoTask } from './tasks.ts'
import { ThemeControl } from './ThemeControl.tsx'

const STORAGE_KEY = 'binp-context-menu-demo'

/**
 * A host's own persist functions. This one happens to use `localStorage` and to
 * log every write, so the demo can show *when* the menu decides to remember
 * something — the same two functions could just as well be an HTTP round trip.
 *
 * `load` does one thing beyond reading: on a browser that has never seen this
 * demo it folds in the starting alphabet (`seedRunes.ts`). That is a host writing
 * a user's config, not a library shipping bindings — see the note there — and it
 * happens *through storage* rather than on the way out, because a visitor who
 * never turns a knob would otherwise lose the six runes on reload while the
 * one-time marker stayed set.
 */
function createDemoPersistence(onSave: (config: unknown) => void): ContextMenuPersistence {
  const writeConfig = (config: unknown) =>
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))

  return {
    load: () => {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      const config = parseConfig(stored === null ? null : (JSON.parse(stored) as unknown))
      if (hasSeededRunes()) return config
      const seeded = withSeededRunes(config)
      writeConfig(seeded)
      markRunesSeeded()
      return seeded
    },
    save: (config) => {
      writeConfig(config)
      onSave(config)
    },
  }
}

export function App() {
  const [lastRun, setLastRun] = useState<{ command: Command; task: DemoTask | null } | null>(null)
  const [saveCount, setSaveCount] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // The commands this visitor wrote. The host's list, in the host's storage —
  // the library only ever sees the merged array below (see hostCommands.ts).
  const [hostCommands, setHostCommands] = useState<HostCommand[]>(loadHostCommands)

  const bumpSaveCount = useCallback(() => setSaveCount((count) => count + 1), [])
  const persistence = useMemo(() => createDemoPersistence(bumpSaveCount), [bumpSaveCount])

  const commands = useMemo(
    () => [...COMMANDS, ...hostCommands.map(toCommandInput)],
    [hostCommands],
  )

  const addHostCommand = useCallback((label: string, kindId: string) => {
    setHostCommands((current) => {
      const takenIds = [...COMMANDS.map((command) => command.id), ...current.map((one) => one.id)]
      const next = [
        ...current,
        { id: hostCommandIdFor(label, takenIds), label, kindId, monospace: false },
      ]
      saveHostCommands(next)
      return next
    })
  }, [])

  const removeHostCommand = useCallback((id: string) => {
    setHostCommands((current) => {
      const next = current.filter((command) => command.id !== id)
      saveHostCommands(next)
      return next
    })
  }, [])

  const handleRun = useCallback((command: Command, target: unknown) => {
    setLastRun({ command, task: target as DemoTask | null })
    window.setTimeout(() => setLastRun(null), 2200)
  }, [])

  return (
    <ContextMenuProvider
      commands={commands}
      kinds={KINDS}
      persistence={persistence}
      onRun={handleRun}
    >
      <div className="flex h-screen overflow-hidden bg-cm-bg-mute font-cm-sans text-cm-ink">
        <aside className="flex w-[276px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-cm-rule bg-cm-bg px-4 py-6">
          <div className="px-1.5 pb-1">
            <div className="font-cm-mono text-[11px] font-medium tracking-[0.06em] text-cm-accent">
              context menu
            </div>
            <h1 className="mt-1.5 text-[18px] leading-tight font-extrabold tracking-[-0.02em]">
              The context menu,
              <br />
              reinvented
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-cm-ink-2">
              One flat list of twenty unlike things → seven ways to make the right action{' '}
              <em>find you</em>. Right-click any task to try the one you picked.
            </p>
          </div>

          <div className="px-1.5 pt-4 pb-2 font-cm-mono text-[10px] tracking-[0.09em] text-cm-ink-3 uppercase">
            Directions
          </div>
          <SurfacePicker showDescription />

          {/* The composer sits under the directions rather than beside the knobs:
              a command is host data and a knob is library config, and this rail is
              the demo's own chrome. Same heading vocabulary as Directions above —
              it is the second list in the same column, not a panel of its own. */}
          <div className="mt-4 px-1.5">
            <CommandComposer
              kinds={KINDS}
              commands={hostCommands}
              onAdd={addHostCommand}
              onRemove={removeHostCommand}
            />
          </div>

          <div className="mt-auto border-t border-cm-rule px-1.5 pt-3.5 text-[11px] leading-relaxed text-cm-ink-3">
            <b className="font-semibold text-cm-ink-2">The problem.</b> The menu mixes four kinds of
            thing — <b className="font-semibold text-cm-ink-2">act</b>,{' '}
            <b className="font-semibold text-cm-ink-2">run</b>,{' '}
            <b className="font-semibold text-cm-ink-2">open</b>,{' '}
            <b className="font-semibold text-cm-ink-2">make</b> — in one scannable column. You
            re-read twenty lines every time.
          </div>

          <Colophon />
        </aside>

        <DirectionSettingsColumn />

        <main className="flex min-w-0 flex-1 flex-col">
          <Header
            saveCount={saveCount}
            isSettingsOpen={isSettingsOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <div className="relative flex-1 overflow-auto">
            {/* The board's own atmosphere, painted from the library's surface
                tokens so it deepens with the palette instead of staying paper. */}
            <div className="min-h-full bg-[radial-gradient(120%_60%_at_50%_-8%,var(--color-cm-bg-soft)_0%,var(--color-cm-bg-mute)_60%)] px-8 pt-7 pb-32">
              <Hint />
              <div className="mx-auto flex max-w-[720px] flex-col gap-3.5">
                <div className="flex items-center gap-2.5 px-0.5 pb-1">
                  <span className="size-2.5 rounded-full bg-cm-accent" />
                  <span className="font-bold tracking-[-0.01em]">context menu</span>
                  <span className="text-[13px] text-cm-ink-3">New task</span>
                </div>
                {TASKS.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <ContextMenuSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {lastRun === null ? null : (
        <div className="fixed bottom-6 left-1/2 z-80 flex -translate-x-1/2 items-center gap-2.5 rounded-cm-lg bg-cm-ink px-4 py-2.5 text-[13px] font-medium text-cm-bg shadow-cm-panel">
          {/* The toast is an *inverted* surface — ink where the page is paper —
              so nothing on it can take an accent that follows the page: the
              library's lifted violet is a light lilac exactly when this pill is
              light. It inherits the pill's own ink instead. (A real icon rather
              than a ▸, per "real vector icons, never characters".) */}
          <IconPlayerPlay size={13} className="shrink-0 opacity-60" />
          <span>
            ran{' '}
            <span className={`font-semibold ${lastRun.command.monospace ? 'font-cm-mono' : ''}`}>
              {lastRun.command.label}
            </span>
            {lastRun.task === null ? null : (
              <span className="opacity-60"> · on “{lastRun.task.title}”</span>
            )}
          </span>
        </div>
      )}
    </ContextMenuProvider>
  )
}

/**
 * The second column — the selected direction's knobs, and only those.
 *
 * The panel is the invariant, and the shared unit is sized to it: this is the
 * identical
 * `<ContextMenuSettings>` the Configure button opens in a dialog, asked for its
 * direction-scoped half (`scope="direction"`) and framed differently because the
 * *use* is different. A dialog is for going in, changing something and coming
 * out; a column is for keeping a knob under your hand while you right-click a
 * card, so the change and its effect are on screen together. Neither restates a
 * single row, and both write the same config, so turning a slider here and
 * reopening the modal shows the same value.
 *
 * "Affordances live next to what they change", twice over. The knobs
 * that shape the next invocation belong beside the board you invoke on, not two
 * clicks into a dialog; and *these* knobs belong to one direction, so they sit
 * against the picker that selects it, one column edge away. Switching direction
 * here is a glance, not a scroll.
 *
 * What it deliberately does not carry is the half that applies to all seven —
 * Learning, Restore defaults — which would make a column headed by one
 * direction's name a lie about its own scope. Those live one click away under
 * Configure, which is the condition `scope="direction"` states.
 */
function DirectionSettingsColumn() {
  const { config } = useContextMenuConfig()
  const surface = SURFACES_BY_ID[config.surface]

  return (
    <aside className="flex w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-cm-rule bg-cm-bg px-4 py-6">
      {/* The same mono eyebrow the rail beside it heads its two lists with, and no
          direction name: the panel's own section carries that, and a column that
          says "Sigil" twice in forty pixels reads as two panels. */}
      <div className="px-1.5">
        <h2 className="font-cm-mono text-[10px] tracking-[0.09em] text-cm-ink-3 uppercase">
          Settings
        </h2>
        <p className="mt-2 text-[11.5px] leading-relaxed text-cm-ink-3">
          The knobs of the direction you picked, from the panel that ships with the library. Turn
          one and the next invocation of{' '}
          <b className="font-semibold text-cm-ink-2">{surface.name}</b> changes; no reload, no
          dialog. What applies to every direction — learning, restore defaults — is under{' '}
          <b className="font-semibold text-cm-ink-2">Configure</b>.
        </p>
      </div>
      <ContextMenuSettings scope="direction" />
    </aside>
  )
}

function Header({
  saveCount,
  isSettingsOpen,
  onOpenSettings,
}: {
  saveCount: number
  isSettingsOpen: boolean
  onOpenSettings: () => void
}) {
  const { config } = useContextMenuConfig()
  const learnedCount = Object.keys(config.usage).length

  return (
    <div className="flex flex-wrap items-start gap-5 border-b border-cm-rule bg-cm-bg-soft px-8 pt-4.5 pb-4">
      {/* A floor rather than `min-w-0`: the row wraps, so with nothing stopping it
          the paragraph shrinks to a six-word column beside the metrics instead of
          sending them to a second line. Two rails now sit to its left, which is
          what made that reachable at a normal window width. */}
      <div className="min-w-[320px] flex-1">
        <span className="inline-block rounded-full bg-cm-accent-soft px-2 py-[3px] font-cm-mono text-[10px] tracking-[0.08em] text-cm-accent uppercase">
          direction · {config.surface}
        </span>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-cm-ink-2">
          Everything below is one <code className="font-cm-mono text-[12.5px]">{'<ContextMenuProvider>'}</code>.
          The direction, the sound, and everything the menu has learned about you go through the
          host's own <code className="font-cm-mono text-[12.5px]">load</code> /{' '}
          <code className="font-cm-mono text-[12.5px]">save</code> pair.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Metric label="Learned" value={`${learnedCount} cmds`} />
        <Metric label="Persist writes" value={String(saveCount)} />
        <ThemeControl />
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          className="flex cursor-pointer items-center gap-2 rounded-cm-lg border border-cm-rule bg-cm-bg px-3 py-2.5 text-[12.5px] font-medium hover:bg-cm-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent"
          onClick={onOpenSettings}
        >
          <IconSettings size={15} />
          Configure
        </button>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[110px] rounded-cm-lg border border-cm-rule bg-cm-bg px-3.5 py-2.5">
      <div className="font-cm-mono text-[9.5px] tracking-[0.07em] text-cm-ink-3 uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-[15px] font-bold tracking-[-0.01em]">{value}</div>
    </div>
  )
}

function Hint() {
  const { config } = useContextMenuConfig()
  const isPad = config.surface === 'sigil-pad'
  const isCasting = isPad || config.surface === 'sigil'
  const secondary = SURFACES_BY_ID[config['sigil-pad'].secondarySurface]

  return (
    <div className="mx-auto mb-4.5 flex max-w-[720px] flex-col gap-1.5 text-[12.5px] text-cm-ink-3">
      <div className="flex items-center gap-2.5">
        <span className="size-[7px] animate-pulse rounded-full bg-cm-accent" />
        {isPad ? (
          <span>
            Press the <KeyCap>cast pad</KeyCap> at the end of any card and keep drawing in the same
            motion — no click first, no release in between.
          </span>
        ) : (
          <span>
            Right-click any task card (or hit the <KeyCap>⋮</KeyCap> button) to invoke the armed
            menu.
          </span>
        )}
      </div>
      {/* 05B is the one direction with two ways in, and the second one is easy to
          find by accident — so say what it does before someone right-clicks a card
          and reads the answer as a bug. */}
      {isPad ? (
        <div className="flex items-center gap-2.5 pl-[17px]">
          <span>
            A right-click never lands on the pad, so it opens{' '}
            <b className="font-semibold text-cm-ink-2">{secondary.name}</b> instead — the{' '}
            <b className="font-semibold text-cm-ink-2">Right-click opens</b> knob in the settings
            column.
          </span>
        </div>
      ) : null}
      {/* The field ships with no alphabet on purpose, so a visit that has emptied
          its own needs to be told where one comes from — otherwise it reads as a
          menu that does not work rather than a menu waiting to be taught. The
          demo seeds a few strokes on first run (`seedRunes.ts`), so the other
          branch is what a first visit actually sees: say what is already castable
          before it says how to add more. */}
      {isCasting ? (
        <div className="flex items-center gap-2.5 pl-[17px]">
          {config.sigil.runes.length === 0 ? (
            <span>
              No runes bound yet. In the field's Lexicon, press <KeyCap>+</KeyCap> beside a command
              and draw its rune — or take one from the palette. A stroke straight down always
              closes the field.
            </span>
          ) : (
            <span>
              The Lexicon under the ring lists every rune bound so far. Trace one over a card to
              cast it, press <KeyCap>+</KeyCap> beside a command without one to add your own, and a
              stroke straight down always closes the field.
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}

function KeyCap({ children }: { children: string }) {
  return (
    <span className="rounded-[5px] border border-b-2 border-cm-rule-2 bg-cm-bg px-1.5 py-0.5 font-cm-mono text-[11px] text-cm-ink-2">
      {children}
    </span>
  )
}

function TaskCard({ task }: { task: DemoTask }) {
  const { config } = useContextMenuConfig()
  const { triggerProps } = useContextMenu({ target: task, label: task.title })
  const isPad = config.surface === 'sigil-pad'

  return (
    <div
      {...triggerProps}
      tabIndex={0}
      className={`group relative rounded-cm-xl border border-cm-rule bg-cm-bg py-4 pl-4.5 shadow-cm-card transition-[box-shadow,border-color] hover:border-cm-rule-2 hover:shadow-cm-card-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent ${
        isPad ? 'pr-[130px]' : 'pr-4.5'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15.5px] font-bold tracking-[-0.01em]">{task.title}</h3>
          <div className="mt-1.5 flex items-center gap-2.5 text-[12.5px] text-cm-ink-3">
            <span>context menu</span>
            {task.role === null ? null : (
              <>
                <span className="text-cm-rule-2">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <IconLayoutGrid size={14} className="text-cm-ink-4" />
                  {task.role}
                </span>
              </>
            )}
          </div>
          {task.summary === null ? null : (
            <div className="mt-2 overflow-hidden text-[13px] leading-relaxed text-ellipsis whitespace-nowrap text-cm-ink-3">
              {task.summary}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`inline-flex items-center gap-1.5 font-cm-mono text-[11px] font-medium tracking-[0.05em] ${STATUS_COLOUR[task.status]}`}
          >
            {task.statusLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-cm-ink-4">
            <IconClock size={13} />
            {task.age}
          </span>
        </div>
        <div className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <MenuButton target={task} targetLabel={task.title} />
        </div>
      </div>

      <CastPad target={task} targetLabel={task.title} />
    </div>
  )
}

/**
 * The host's own status hues. Three of the four are the library's tokens, which
 * already carry both palettes; "done" is the demo's, so it is a `light-dark()`
 * pair in the demo's own token namespace (`demo/index.css`) — a host app's colours
 * are its business, but they flip by the same mechanism.
 */
const STATUS_COLOUR: Record<DemoTask['status'], string> = {
  unreviewed: 'text-cm-accent',
  pending: 'text-cm-ink-3',
  draft: 'text-cm-ink-4',
  done: 'text-demo-done',
}
