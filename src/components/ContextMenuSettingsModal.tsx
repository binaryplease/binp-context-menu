/**
 * The settings panel in a dialog shell.
 *
 * A host that keeps its preferences in a modal — plenty do — otherwise
 * hand-rolls a dialog around `<ContextMenuSettings>`, and every host's is
 * subtly different: one traps focus, one forgets, one closes on Escape, one
 * does not. So the shell ships here, and the *panel is the invariant* — the
 * shared unit is sized to it and the dialog is only a shell: this file
 * adds a frame, a title and dismissal, and does not
 * restate, re-order or re-lay-out a single knob. A knob added to the schema
 * appears in both shells because there is only one of it.
 *
 * The dialog is not `<MenuLayer>` wearing a different hat. A menu dismisses on
 * scroll, because a scroll invalidates the anchor it was placed against; a
 * settings dialog scrolls its own body and must survive it. Different
 * dismissal, different shell — what the two genuinely share is the mount point,
 * and that is `<OverlayPortal>`.
 */
import { useEffect, useId } from 'react'
import { IconX } from '@tabler/icons-react'
import { OverlayPortal } from '../runtime/OverlayPortal.tsx'
import { useFocusTrap } from '../runtime/useFocusTrap.ts'
import { ContextMenuSettings } from './ContextMenuSettings.tsx'

export type ContextMenuSettingsModalProps = {
  open: boolean
  onClose: () => void
  /** The visible heading, which is also the dialog's accessible name. */
  title?: string
  className?: string
  /** Forwarded to the panel — hide the sound section on hosts without Sigil. */
  showSound?: boolean
}

export function ContextMenuSettingsModal({
  open,
  onClose,
  title = 'Configuration',
  className = '',
  showSound = true,
}: ContextMenuSettingsModalProps) {
  const titleId = useId()
  const dialogRef = useFocusTrap<HTMLDivElement>(open)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-6"
        data-binp-context-menu-dialog=""
        // Press, not click: a drag that starts on a slider inside the panel and
        // releases over the backdrop must not count as pressing the backdrop.
        onMouseDown={(mouseEvent) => {
          if (mouseEvent.target !== mouseEvent.currentTarget) return
          // A mousedown's default action is to move focus to the deepest
          // focusable ancestor of the target — here, `body`. That runs *after*
          // this handler, so without it the focus handed back to the opening
          // control on close is immediately thrown away again.
          mouseEvent.preventDefault()
          onClose()
        }}
      >
        {/* Purely visual — the layer itself stays the press target, so a press on
            the dimmed area still dismisses. */}
        <div className="animate-cm-scrim-in pointer-events-none absolute inset-0 bg-cm-scrim backdrop-blur-[2px]" />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          // -1 so the shell can hold focus on open without joining the Tab cycle.
          tabIndex={-1}
          className={`animate-cm-modal-pop relative flex max-h-[min(680px,88vh)] w-full max-w-[400px] origin-center flex-col rounded-cm-xl border border-cm-rule bg-cm-bg font-cm-sans text-cm-ink shadow-cm-panel outline-none ${className}`}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-cm-rule px-5 py-3.5">
            <h2 id={titleId} className="min-w-0 text-sm font-bold tracking-[-0.01em]">
              {title}
            </h2>
            <button
              type="button"
              aria-label={`Close ${title.toLowerCase()}`}
              className="-mr-1 shrink-0 cursor-pointer rounded-cm-md p-1 text-cm-ink-3 hover:bg-cm-hover hover:text-cm-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent"
              onClick={onClose}
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4.5">
            <ContextMenuSettings showSound={showSound} />
          </div>
        </div>
      </div>
    </OverlayPortal>
  )
}
