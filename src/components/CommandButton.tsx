/**
 * The one control that invokes a command — and the one place that knows what an
 * unavailable command looks like, and what a command that opens a URL is.
 *
 * Unavailable is never invisible: an unavailable action stays visible, keeps its
 * place, and
 * explain itself on hover *and* on keyboard focus (rules 1–4). A native `disabled` button
 * can do none of that: it is unfocusable and fires no pointer events, so its
 * `title` never reaches a keyboard or touch user. This primitive therefore uses
 * `aria-disabled` and refuses activation itself, keeping the control focusable
 * with the reason wired up through `aria-describedby`.
 *
 * A command carrying an `href` renders as a real `<a>` here rather than as a
 * button with an `onClick` that calls `window.open`. That is the difference
 * between a link and a thing that looks like one: middle-click opens a
 * background tab, ⌘/ctrl-click does too, the status bar previews the target, and
 * "copy link address" is in the browser's own menu. An `onClick` swallows all
 * four. A *plain* left click is still handed to `runCommand`, so the one run
 * path keeps recording usage and closing the menu.
 *
 * The explanation itself is *floated*, through the one mount point, rather than
 * absolutely positioned inside the control. A chip inside the control is at the
 * mercy of whatever the surface around it does: the Sigil Lexicon and Whisper's
 * results both scroll, so an `overflow` two elements up sliced the chip in half
 * and left the board showing through the missing part; the Compass label is
 * rotated to its arc, so the chip rotated with it. `OverlayPortal` puts it at the
 * end of `document.body` — outside every clip and every stacking context — and
 * `placeExplanation` puts it back where it belongs, against the control's own
 * box. It is `position: fixed`, which is sound because a menu closes on scroll:
 * the anchor it was measured against cannot move underneath it.
 *
 * Every surface composes this. None of them re-derives "greyed out plus a
 * title", and none of them writes its own anchor — this file is the one shared
 * wrapper, and re-deriving it is exactly the drift the guard script watches
 * for.
 */
import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, FocusEvent, MouseEvent, ReactNode } from 'react'
import { placeExplanation, type Box, type Point } from '../lib/geometry.ts'
import { OverlayPortal } from '../runtime/OverlayPortal.tsx'
import type { Command } from '../schema/command.ts'

export type CommandButtonProps = {
  command: Command
  onActivate: (command: Command) => void
  children: ReactNode
  className?: string
  /**
   * Added on top of `className` when the command cannot run. The default dims
   * each child box rather than the button itself: opacity multiplies through to
   * everything below it, and dimming the control dims what a surface renders
   * *inside* it — an icon, a label, a caption — by whatever it has already dimmed
   * them to. (The explanation is out of reach of both now that it is floated, so
   * it can no longer end up the faintest thing on screen either way.)
   */
  unavailableClassName?: string
  style?: CSSProperties
  onHover?: (command: Command) => void
  /**
   * Menus open on a press and are frequently chosen before a full click lands,
   * so `mousedown` is the default. Surfaces reached by a deliberate click (the
   * Lexicon) opt into `click`.
   *
   * Ignored for a command with an `href`: a link is activated by the click, and
   * `mousedown` activation would have to `preventDefault()` — which is the very
   * thing that kills the native modifier-click behaviours the anchor is for.
   */
  activateOn?: 'mousedown' | 'click'
  /** Where the explanation sits relative to the control. */
  explanationPlacement?: 'above' | 'below'
  title?: string
}

/** Did this click ask the browser for one of its own link behaviours? */
function isBrowserLinkGesture(mouseEvent: MouseEvent): boolean {
  return (
    mouseEvent.button !== 0 ||
    mouseEvent.metaKey ||
    mouseEvent.ctrlKey ||
    mouseEvent.shiftKey ||
    mouseEvent.altKey
  )
}

export function CommandButton({
  command,
  onActivate,
  children,
  className = '',
  unavailableClassName = 'cursor-not-allowed [&>*]:opacity-45',
  style,
  onHover,
  activateOn = 'mousedown',
  explanationPlacement = 'above',
  title,
}: CommandButtonProps) {
  const explanationId = useId()
  const reason = command.disabledReason
  const isUnavailable = reason !== null
  // Where the explanation is pointing, or `null` while it is not showing. Set
  // from the event's own `currentTarget` rather than from a ref, because the
  // control is an `<a>` on one path and a `<button>` on the other and the
  // handlers below are shared by both.
  const [anchor, setAnchor] = useState<Box | null>(null)
  // A pointer leaving must not take the explanation away from a keyboard user
  // who is standing on the same control — the two ways in are independent, and
  // the focused one outlives the hover.
  const isKeyboardFocused = useRef(false)
  // An unavailable link is not a link. Rendering the `<a>` without its `href`
  // would make it unfocusable — and an explanation a keyboard user cannot reach
  // is the failure rule 3 is about — so it falls back to the button, which is
  // focusable, inert and described.
  const isLink = command.href !== null && !isUnavailable

  function activate() {
    if (isUnavailable) return
    onActivate(command)
  }

  /**
   * The control's box, as the chip will be placed against it.
   *
   * A rect and not `offsetWidth`/`offsetTop`, which is the opposite of the rule
   * everywhere else in this library: what a chip points at is where the control
   * *appears*, and a Compass label is rotated to its arc while an Orbit bubble
   * grows under the pointer. The transformed box is the honest one here.
   */
  function showExplanationAt(control: HTMLElement) {
    const rect = control.getBoundingClientRect()
    setAnchor({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
  }

  const sharedProps = {
    role: 'menuitem' as const,
    // Focusable on purpose — see the note at the top of this file.
    'aria-disabled': isUnavailable,
    // Resolves across the whole document, so the chip being floated out to the
    // end of `<body>` costs the description nothing.
    'aria-describedby': isUnavailable ? explanationId : undefined,
    title,
    style,
    // No `group` of its own any more. It was here for the nested chip's
    // `group-hover:`, and an *unnamed* group shadows an outer one for everything
    // inside it — a Strata lane's `group-hover:shadow-cm-lane` would have stopped
    // working the day someone moved it onto a row.
    className: [className, isUnavailable ? unavailableClassName : ''].join(' '),
    onMouseEnter: (mouseEvent: MouseEvent<HTMLElement>) => {
      onHover?.(command)
      if (isUnavailable) showExplanationAt(mouseEvent.currentTarget)
    },
    onMouseLeave: () => {
      if (!isKeyboardFocused.current) setAnchor(null)
    },
    onFocus: (focusEvent: FocusEvent<HTMLElement>) => {
      // `:focus-visible`, matched on the element rather than reproduced here:
      // the explanation is for someone who arrived by keyboard, and a control
      // that merely took focus from the click that is about to run it should not
      // grow a chip on the way.
      if (!isUnavailable || !focusEvent.currentTarget.matches(':focus-visible')) return
      isKeyboardFocused.current = true
      showExplanationAt(focusEvent.currentTarget)
    },
    onBlur: () => {
      isKeyboardFocused.current = false
      setAnchor(null)
    },
  }

  const explanation = isUnavailable ? (
    <OverlayPortal>
      <CommandExplanation id={explanationId} anchor={anchor} placement={explanationPlacement}>
        {reason}
      </CommandExplanation>
    </OverlayPortal>
  ) : null

  if (isLink) {
    return (
      <a
        {...sharedProps}
        href={command.href ?? undefined}
        // A menu row is a poor place to lose the page you were on, and the host
        // never gets to choose the opener's origin, so both are fixed here.
        target="_blank"
        rel="noopener noreferrer"
        onClick={(mouseEvent) => {
          // A gesture aimed at the browser (middle button, ⌘/ctrl, shift, alt) is
          // left entirely to the browser: it opens its tab or window, the menu
          // stays put, and nothing is recorded — the user did not pick this
          // command, they took a copy of where it points.
          if (isBrowserLinkGesture(mouseEvent)) return
          // A plain click goes through the one run path instead, so usage is
          // learned and the menu closes. `runCommand` performs the navigation.
          mouseEvent.preventDefault()
          activate()
        }}
        onKeyDown={(keyboardEvent) => {
          // Enter is the anchor's own activation and arrives as a click, which
          // the handler above already owns. Space is not — an anchor ignores it —
          // so it is forwarded to the same place rather than to a second path.
          if (keyboardEvent.key !== ' ') return
          keyboardEvent.preventDefault()
          activate()
        }}
      >
        {children}
        {explanation}
      </a>
    )
  }

  return (
    <button
      {...sharedProps}
      type="button"
      onMouseDown={
        activateOn === 'mousedown'
          ? (mouseEvent) => {
              mouseEvent.preventDefault()
              activate()
            }
          : undefined
      }
      onClick={activateOn === 'click' ? activate : undefined}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return
        keyboardEvent.preventDefault()
        activate()
      }}
    >
      {children}
      {explanation}
    </button>
  )
}

/**
 * The chip itself — floated, measured, then placed.
 *
 * The same measure-then-place shape `useAnchoredPanel` uses, and for the same
 * reason: its size is not knowable until it has rendered, and it cannot be
 * clamped to the viewport or flipped to the other side of the control before it
 * is. The first frame after a hover is therefore at the previous position with
 * the chip still transparent, which is invisible — it is the frame the fade-in
 * starts from.
 *
 * It stays mounted while the command is unavailable rather than appearing with
 * the pointer, so `aria-describedby` always resolves: an explanation that only
 * exists once someone has hovered is not an explanation a screen reader can
 * read. Hidden by `opacity`, never `visibility` or `hidden`, for the same reason
 * every other hidden-but-present thing in this library is (rule 3: the
 * explanation has to reach assistive tech, so it has to exist before the hover).
 *
 * Sizes are `offsetWidth`/`offsetHeight` — layout, which does not see the
 * transform the surface underneath is animating with.
 */
function CommandExplanation({
  id,
  anchor,
  placement,
  children,
}: {
  id: string
  anchor: Box | null
  placement: 'above' | 'below'
  children: ReactNode
}) {
  const chipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Point | null>(null)

  useLayoutEffect(() => {
    const element = chipRef.current
    if (element === null || anchor === null) return
    setPosition(
      placeExplanation(
        anchor,
        placement,
        element.offsetWidth,
        element.offsetHeight,
        window.innerWidth,
        window.innerHeight,
      ),
    )
  }, [anchor, placement])

  const isShowing = anchor !== null && position !== null

  return (
    <div
      ref={chipRef}
      id={id}
      role="tooltip"
      style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
      className={[
        // Above the menu layer and the settings dialog, because it explains
        // something on them. The font is named rather than inherited: at the end
        // of `<body>` the chip is outside every surface, and a host's own face is
        // not this library's.
        'pointer-events-none fixed z-70 w-max max-w-[220px] rounded-cm-md border border-cm-tip-edge bg-cm-tip px-2.5 py-1.5 font-cm-sans text-[11px] leading-snug font-medium whitespace-normal text-cm-ink shadow-cm-tip backdrop-blur-md transition-opacity duration-100',
        isShowing ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {children}
    </div>
  )
}
