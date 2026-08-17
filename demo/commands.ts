/**
 * The demo's command set — the unlike things the concept started from: object
 * actions, project scripts, app launchers, product verbs.
 *
 * This is host data, not library data. It is here to show what a real, messy
 * command list looks like going in: four kinds, mono-faced shell slugs, one
 * command the project cannot offer so the disabled-with-explanation path is
 * visible on every surface, one destructive command so the danger tone is, and
 * one that opens a URL — the three shapes a real task menu needs.
 *
 * **Every label is one or two words, and none of them names the project.** The
 * board already says which project this is and the card already says which task,
 * so "New task in binp-context-menu" spends the wheel's scarcest resource — the
 * length of an arc — restating the context the user is looking at. A menu label
 * is the verb, not the sentence: the same list that read as a paragraph on the
 * Compass reads as a set of directions once it is "New task", "Diff", "Move".
 * Long labels are still the case the radial fit exists for, and the demo's own
 * composer is where to feed one in (type any label you like) — the geometry no
 * longer needs a permanent exhibit standing in the menu to prove it works.
 *
 * Not one of them carries a `glyph`. A host *may* ship an alphabet by naming
 * runes here, but the Sigil field's whole premise now is that the alphabet is the
 * user's: every command below arrives with an empty slot in the Lexicon, and the
 * stroke that fills it is drawn (or picked) by whoever casts it.
 */
import {
  IconApps,
  IconArrowsRight,
  IconArrowsSplit,
  IconBinaryTree,
  IconBrandStorybook,
  IconChecks,
  IconChevronsRight,
  IconCode,
  IconCopy,
  IconExternalLink,
  IconFolder,
  IconGitBranch,
  IconGitCommit,
  IconGraph,
  IconPictureInPicture,
  IconPin,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconTerminal2,
  IconX,
} from '@tabler/icons-react'
import type { CommandInput, CommandKindInput } from '../src/index.ts'

export const KINDS: CommandKindInput[] = [
  { id: 'act', label: 'Act', description: 'do something to this task', color: '#7c3aed' },
  { id: 'run', label: 'Run', description: 'project scripts', color: '#16a34a' },
  { id: 'open', label: 'Open', description: 'launch in an app', color: '#2a6fdb' },
  { id: 'make', label: 'Make', description: 'create and jump to', color: '#ea580c' },
]

export const COMMANDS: CommandInput[] = [
  { id: 'continue', label: 'Continue', kindId: 'act', icon: IconChevronsRight, weight: 97, hint: '⏎' },
  { id: 'pin', label: 'Pin', kindId: 'act', icon: IconPin, weight: 61 },
  { id: 'modal', label: 'Expand', kindId: 'act', icon: IconPictureInPicture, weight: 42 },
  { id: 'clone', label: 'Clone', kindId: 'act', icon: IconCopy, weight: 34 },
  { id: 'diff', label: 'View diff', kindId: 'act', icon: IconCode, weight: 38, shortLabel: 'Diff' },
  {
    id: 'reviewed',
    label: 'Mark reviewed',
    kindId: 'act',
    icon: IconChecks,
    weight: 44,
    shortLabel: 'Reviewed',
  },
  {
    id: 'cancel',
    label: 'Cancel run',
    kindId: 'act',
    icon: IconX,
    weight: 26,
    shortLabel: 'Cancel',
    detail: 'stops the agent mid-turn',
    // The destructive one — the reason a rune bound to it is tinted with the
    // danger token on the reading card, not with its kind's violet.
    destructive: true,
  },
  { id: 'build', label: 'build', kindId: 'run', icon: IconPlayerPlay, weight: 88, monospace: true, keywords: ['compile', 'script'] },
  { id: 'dev', label: 'dev', kindId: 'run', icon: IconPlayerPlay, weight: 74, monospace: true, keywords: ['watch', 'serve'] },
  { id: 'restart', label: 'restart', kindId: 'run', icon: IconRefresh, weight: 29, monospace: true },
  {
    // The blocked one, so the disabled-with-reason path is visible on all seven
    // surfaces rather than a control that quietly disappears.
    //
    // It is *this* command and not one of the `act` verbs because a command list
    // is one flat set for the whole board, and every act verb is about the card
    // you right-clicked: "Mark reviewed" carried this block for a while and
    // therefore announced that every UNREVIEWED task could not be reviewed,
    // which is the one thing you would obviously do to it. A missing script is a
    // property of the project, and the board is one project — so the reason is
    // true of every card here, which is what a host-level block has to be.
    id: 'storybook',
    label: 'storybook',
    kindId: 'run',
    icon: IconBrandStorybook,
    weight: 22,
    monospace: true,
    disabledReason: 'binp-context-menu has no storybook script in its package.json.',
  },
  { id: 'vscode', label: 'vscode', kindId: 'open', icon: IconCode, weight: 81, monospace: true, keywords: ['editor'] },
  { id: 'kitty', label: 'kitty', kindId: 'open', icon: IconTerminal2, weight: 66, monospace: true, keywords: ['terminal', 'shell'] },
  { id: 'git', label: 'git', kindId: 'open', icon: IconGitCommit, weight: 52, monospace: true },
  { id: 'files', label: 'files', kindId: 'open', icon: IconFolder, weight: 40, monospace: true, keywords: ['explorer'] },
  {
    // The link one — the shape a task menu grows when a running command's
    // output advertises a dev server. The URL is the label, the line it was
    // scraped from is the detail, and `href` makes the row a real anchor.
    id: 'dev-server',
    label: '127.0.0.1:5173',
    kindId: 'open',
    icon: IconExternalLink,
    weight: 58,
    shortLabel: ':5173',
    monospace: true,
    detail: 'Local · vite',
    keywords: ['localhost', 'url', 'preview', 'dev server'],
    href: 'http://127.0.0.1:5173/',
    
  },
  { id: 'mtm', label: 'mtm', kindId: 'open', icon: IconGitBranch, weight: 18, monospace: true },
  { id: 'echo', label: 'echo', kindId: 'open', icon: IconArrowsSplit, weight: 12, monospace: true },
  { id: 'new-task', label: 'New task', kindId: 'make', icon: IconPlus, weight: 70 },
  { id: 'git-graph', label: 'Git graph', kindId: 'make', icon: IconGraph, weight: 55 },
  { id: 'open-ns', label: 'Workspace', kindId: 'make', icon: IconApps, weight: 47 },
  // The ids below still name what they were written for; the *labels* no longer
  // do. An id is host bookkeeping — a rune bound in the demo's config is keyed by
  // it, so renaming one would silently unbind a stroke a visitor drew — while a
  // label is what someone reads on a wheel a hundred times a day.
  { id: 'file-expl', label: 'File tree', kindId: 'make', icon: IconBinaryTree, weight: 31 },
  { id: 'new-task-actions', label: 'New subtask', kindId: 'make', icon: IconPlus, weight: 44 },
  { id: 'open-actions', label: 'Dashboard', kindId: 'make', icon: IconApps, weight: 36 },
  { id: 'move-project', label: 'Move', kindId: 'act', icon: IconArrowsRight, weight: 24 },
  { id: 'typecheck', label: 'typecheck', kindId: 'run', icon: IconPlayerPlay, weight: 20, monospace: true, keywords: ['tsc', 'types'] },
]
