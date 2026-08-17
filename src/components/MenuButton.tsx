/**
 * The explicit "open the menu" control.
 *
 * Right-click is invisible and unreachable from a keyboard, so a menu that has
 * *only* a right-click trigger is a menu a good number of users never discover
 * and some cannot open at all. This button is the visible, focusable twin of the
 * `useContextMenu` trigger — and because both go through the same hook, the two
 * paths cannot drift into opening different things.
 */
import { useRef } from 'react'
import { IconDotsVertical } from '@tabler/icons-react'
import { useContextMenu } from '../runtime/useContextMenu.ts'

export type MenuButtonProps = {
  target?: unknown
  /** Names what the menu acts on, e.g. the row's title. */
  targetLabel?: string
  className?: string
}

export function MenuButton({ target = null, targetLabel, className = '' }: MenuButtonProps) {
  const { openAtElement, isOpen } = useContextMenu({ target })
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-label={targetLabel === undefined ? 'Open command menu' : `Open command menu for “${targetLabel}”`}
      className={[
        'grid size-[26px] cursor-pointer place-items-center rounded-[7px] text-cm-ink-4 transition-colors hover:bg-cm-bg-sink hover:text-cm-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent',
        className,
      ].join(' ')}
      onClick={(mouseEvent) => {
        mouseEvent.stopPropagation()
        openAtElement(buttonRef.current)
      }}
    >
      <IconDotsVertical size={16} />
    </button>
  )
}
