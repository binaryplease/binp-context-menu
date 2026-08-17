/**
 * Focus containment for a modal shell — move in, keep in, hand back.
 *
 * `aria-modal` tells assistive tech that the rest of the page is inert; it does
 * not make Tab believe it. So the three halves of the contract are wired by
 * hand: focus enters the container on open, Tab and Shift+Tab wrap inside it
 * while it is open, and the element that opened it gets focus back on close —
 * otherwise a keyboard user lands at the top of the document and has to walk the
 * whole page back to where they were.
 *
 * Lives on its own because it depends on nothing in this library ("a unit of
 * code lives where its dependencies are") — only on a container element and a
 * boolean.
 */
import { useEffect, useRef } from 'react'

/**
 * What Tab visits. `[hidden]` and `disabled` are excluded by the selector;
 * anything hidden by CSS is filtered out below, because an element in a
 * `display: none` or `visibility: hidden` subtree cannot take focus and would
 * otherwise become a dead stop at the edge of the cycle.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((selector) => `${selector}:not([hidden])`)
  .join(',')

function focusableElementsIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // `offsetParent === null` catches display:none; the computed check catches a
    // visibility:hidden ancestor, which offsetParent alone reports as laid out.
    (element) =>
      element.offsetParent !== null && getComputedStyle(element).visibility !== 'hidden',
  )
}

export function useFocusTrap<ContainerElement extends HTMLElement>(isActive: boolean) {
  const containerRef = useRef<ContainerElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!isActive || container === null) return

    // Whatever had focus when the shell opened is what it is owed back. Read it
    // before moving focus, not in the cleanup, where it is already the dialog.
    const openerElement = document.activeElement instanceof HTMLElement ? document.activeElement : null

    // The container itself takes focus rather than its first control: it carries
    // the role and the accessible name, so a screen reader announces what just
    // opened instead of reading "close, button" into the void.
    container.focus()

    const containFocusOnTab = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== 'Tab') return
      const focusable = focusableElementsIn(container)
      if (focusable.length === 0) {
        keyboardEvent.preventDefault()
        container.focus()
        return
      }
      const firstElement = focusable[0]!
      const lastElement = focusable[focusable.length - 1]!
      const focusedElement = document.activeElement

      // Anything not *in* the cycle enters it at whichever end the key was
      // heading for. That covers focus that escaped, and — the case a container
      // check misses — the container itself, which holds focus on open but is
      // `tabindex="-1"`: leaving it to the browser sends Shift+Tab straight out
      // the back of the dialog into the page behind.
      if (!focusable.includes(focusedElement as HTMLElement)) {
        keyboardEvent.preventDefault()
        ;(keyboardEvent.shiftKey ? lastElement : firstElement).focus()
        return
      }
      if (keyboardEvent.shiftKey && focusedElement === firstElement) {
        keyboardEvent.preventDefault()
        lastElement.focus()
      } else if (!keyboardEvent.shiftKey && focusedElement === lastElement) {
        keyboardEvent.preventDefault()
        firstElement.focus()
      }
    }

    // Capture, so the wrap still happens if something inside stops the event.
    document.addEventListener('keydown', containFocusOnTab, true)
    return () => {
      document.removeEventListener('keydown', containFocusOnTab, true)
      if (openerElement !== null && openerElement.isConnected) openerElement.focus()
    }
  }, [isActive])

  return containerRef
}
