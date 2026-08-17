/** The board the demo arms — the same rows the concept was drawn against. */
export type DemoTask = {
  id: string
  title: string
  role: string | null
  summary: string | null
  status: 'unreviewed' | 'pending' | 'draft' | 'done'
  statusLabel: string
  age: string
}

export const TASKS: DemoTask[] = [
  {
    id: 'relocate-git-graph',
    title: 'Relocation of git graph context menu item',
    role: 'Frontend Developer',
    summary: 'The `project-actions` group in the task context menu was reordered, placing the…',
    status: 'unreviewed',
    statusLabel: 'UNREVIEWED',
    age: '18m ago',
  },
  {
    id: 'expanded-project-actions',
    title: 'Expanded project context menu actions',
    role: 'Frontend Developer',
    summary: 'The git-status right-click menu was reordered to place project actions, integrated into…',
    status: 'unreviewed',
    statusLabel: 'UNREVIEWED',
    age: '52m ago',
  },
  {
    id: 'followup-composer',
    title: 'Waits on functionality for followup composer',
    role: null,
    summary: null,
    status: 'pending',
    statusLabel: 'PENDING',
    age: '53m ago',
  },
  {
    id: 'lazy-loading-git-graph',
    title: 'Lazy loading for git graph repositories',
    role: 'Fullstack Developer',
    summary: 'The git graph view was optimized to resolve repository root statuses to full git-…',
    status: 'unreviewed',
    statusLabel: 'UNREVIEWED',
    age: '2h ago',
  },
  {
    id: 'project-scoped-git-graph',
    title: 'Implementation of project-scoped Git Graph command',
    role: 'Fullstack Developer',
    summary: 'A per-project "Open git graph" command was implemented, enabling a view pre-…',
    status: 'unreviewed',
    statusLabel: 'UNREVIEWED',
    age: '2h ago',
  },
  {
    id: 'command-history-rail',
    title: 'Command history display in right rail',
    role: null,
    summary: null,
    status: 'draft',
    statusLabel: 'DRAFT',
    age: '1d ago',
  },
]
