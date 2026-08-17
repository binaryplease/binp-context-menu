/**
 * The one way a host surface arms itself.
 *
 * Spread `triggerProps` onto whatever the menu acts on. That is the entire
 * integration: right-click positioning, keyboard invocation, and the decision of
 * what "open" means all live behind this hook, so a second host surface is two
 * lines of composition rather than a fresh copy of the mechanism — surfaces
 * compose the wrapper, they never re-derive it.
 */
import { useCallback, useMemo } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useContextMenuRuntime } from './context.ts'

export type UseContextMenuOptions = {
  /** Passed back to `onRun` — the object the commands act on. */
  target?: unknown
  /** Accessible name for the keyboard path. Defaults to a generic phrasing. */
  label?: string
}

export type UseContextMenuResult = {
  /** Spread onto the element the menu belongs to. */
  triggerProps: {
    onContextMenu: (mouseEvent: MouseEvent) => void
    onKeyDown: (keyboardEvent: KeyboardEvent) => void
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
  }
  /** Open at an explicit viewport position. */
  openAt: (x: number, y: number) => void
  /** Open centred on an element — the keyboard and menu-button path. */
  openAtElement: (element: Element | null) => void
  close: () => void
  isOpen: boolean
}

export function useContextMenu(options: UseContextMenuOptions = {}): UseContextMenuResult {
  const { target = null } = options
  const { open, close, invocation } = useContextMenuRuntime()
  const isOpen = invocation !== null && invocation.target === target

  const openAt = useCallback((x: number, y: number) => open({ anchor: { x, y }, target }), [open, target])

  const openAtElement = useCallback(
    (element: Element | null) => {
      if (element === null) return
      const box = element.getBoundingClientRect()
      open({ anchor: { x: box.right, y: box.bottom }, target })
    },
    [open, target],
  )

  return useMemo(
    () => ({
      triggerProps: {
        onContextMenu: (mouseEvent: MouseEvent) => {
          mouseEvent.preventDefault()
          openAt(mouseEvent.clientX, mouseEvent.clientY)
        },
        // Right-click is not reachable from a keyboard. The Windows "menu" key
        // and Shift+F10 are the platform equivalents, and they are what a screen
        // reader user will press — a menu that only opens on contextmenu is a
        // menu half the users cannot open at all.
        onKeyDown: (keyboardEvent: KeyboardEvent) => {
          const isMenuKey = keyboardEvent.key === 'ContextMenu'
          const isShiftF10 = keyboardEvent.shiftKey && keyboardEvent.key === 'F10'
          if (!isMenuKey && !isShiftF10) return
          keyboardEvent.preventDefault()
          openAtElement(keyboardEvent.currentTarget as Element)
        },
        'aria-haspopup': 'menu' as const,
        'aria-expanded': isOpen,
      },
      openAt,
      openAtElement,
      close,
      isOpen,
    }),
    [close, isOpen, openAt, openAtElement],
  )
}
