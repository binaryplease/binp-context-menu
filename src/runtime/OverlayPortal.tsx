/**
 * The one portal.
 *
 * Everything this library floats — the menu layer under a surface, the settings
 * dialog — mounts here, at the end of `document.body`, outside whatever
 * `overflow: hidden` or stacking context the host happened to render the trigger
 * inside. Two shells, one mount point: the guard in `scripts/guard-surfaces.ts`
 * keeps `createPortal` to this file alone, so a third overlay cannot quietly
 * acquire its own idea of where an overlay lives — one primitive per
 * interaction class.
 *
 * Dismissal is deliberately *not* here. A menu closes on scroll because a scroll
 * invalidates the anchor it was placed against; a dialog must not. That is a
 * different interaction class, so it belongs to each shell — `MenuLayer` and
 * `ContextMenuSettingsModal` — rather than to the mount point they share.
 */
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type OverlayPortalProps = {
  children: ReactNode
}

export function OverlayPortal({ children }: OverlayPortalProps) {
  return createPortal(children, document.body)
}
