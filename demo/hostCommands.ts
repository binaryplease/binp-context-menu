/**
 * The demo's own command *store* — the half of "add a command, give it a rune"
 * that is not the library's to do.
 *
 * A command is host data: it has an id the host owns, a kind from the host's own
 * lanes, and behaviour the host supplies. The library never invents one, and a
 * user-authored command is no exception — so the list a person builds in the demo
 * lives here, in the demo's storage, under the demo's key, and arrives at
 * `<ContextMenuProvider commands={…}>` looking exactly like the twenty-six that
 * were written by hand.
 *
 * What the library *does* own is the rune: bind one on the Sigil field and it is
 * persisted in the menu's config, keyed by command id. The two halves meet at
 * that id, which is why removing a command here leaves its rune behind harmlessly
 * — re-add the command and the stroke that cast it still does.
 *
 * Parsed on the way out of storage, because Zod is the type source at every
 * boundary: a hand-edited or half-written value must not take the board down
 * with it.
 */
import { z } from 'zod'
import { IconSparkles } from '@tabler/icons-react'
import type { CommandInput } from '../src/index.ts'

const STORAGE_KEY = 'binp-context-menu-demo-commands'

/** Every field defaults, so a value written by an older demo still parses. */
export const HostCommandSchema = z.object({
  id: z.string().default(''),
  label: z.string().default(''),
  kindId: z.string().default('act'),
  monospace: z.boolean().default(false),
})

export type HostCommand = z.infer<typeof HostCommandSchema>

const HostCommandsSchema = z.array(HostCommandSchema).default([])

export function loadHostCommands(): HostCommand[] {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === null) return []
  const parsed = HostCommandsSchema.safeParse(JSON.parse(stored) as unknown)
  if (!parsed.success) {
    console.error('[demo] stored commands did not parse — starting empty', parsed.error)
    return []
  }
  // A command with no label or no id is not a command; it is the tail of a write
  // that did not finish.
  return parsed.data.filter((command) => command.id !== '' && command.label !== '')
}

export function saveHostCommands(commands: HostCommand[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(commands))
}

/**
 * An id from the label, kept unique against what already exists — the same thing
 * a real host does when a user names something, and the reason a rune bound to
 * "Deploy" survives the page reload that rebuilds this list.
 */
export function hostCommandIdFor(label: string, existingIds: readonly string[]): string {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'command'
  let candidate = `own-${slug}`
  let suffix = 2
  while (existingIds.includes(candidate)) {
    candidate = `own-${slug}-${suffix}`
    suffix += 1
  }
  return candidate
}

/** The host's row, as the descriptor the provider parses. */
export function toCommandInput(command: HostCommand): CommandInput {
  return {
    id: command.id,
    label: command.label,
    kindId: command.kindId,
    icon: IconSparkles,
    monospace: command.monospace,
    // Mid-pack: a command you just made should be findable without being louder
    // than the one you run twenty times a day.
    weight: 50,
  }
}
