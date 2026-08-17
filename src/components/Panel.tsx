/**
 * The floating panel chrome — background, border, radius, shadow, entrance.
 *
 * Three surfaces float a panel (Original, Whisper, Strata). Sharing the chrome
 * means a change to the menu's material happens once, and no surface can end up
 * with a subtly different shadow because it was written on a different day.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { centreBelowPointer, clampToViewport, type Point } from '../lib/geometry.ts'

export type PanelProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  panelRef?: Ref<HTMLDivElement>
  /**
   * Where the entrance grows from — which is wherever the press was, so it must
   * match how the caller aligned the panel against the pointer: a corner-hung
   * panel pops from its corner, a centred-under one from its top edge. It is the
   * *only* thing a caller says about the entrance; the animation itself is the
   * panel's, so no surface can arrive with a pop of its own.
   */
  origin?: 'top-left' | 'top'
}

export function Panel({ children, className = '', style, panelRef, origin = 'top-left' }: PanelProps) {
  return (
    <div
      ref={panelRef}
      role="menu"
      style={style}
      // Positioning is the caller's — every surface that floats one places it
      // absolutely, at a point `useAnchoredPanel` worked out. The chrome is shared.
      className={[
        'rounded-xl border border-cm-rule bg-cm-bg p-1.5 font-cm-sans text-cm-ink shadow-cm-panel',
        'animate-cm-pop',
        origin === 'top' ? 'origin-top' : 'origin-top-left',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

/**
 * How a panel hangs off the pointer: by its top-left corner, or centred under it.
 *
 * One seam, two answers, because the measuring is the invariant and the arithmetic
 * is not, so the shared unit is sized to the measuring alone — a
 * surface that wanted the other alignment would otherwise
 * copy the measure-then-clamp dance and get its own subtly different version of
 * the frame-of-invisibility below.
 */
export type PanelAlignment = 'corner' | 'below-centred'

/**
 * Place a panel at the pointer without letting it fall off screen.
 *
 * The size is not knowable until the panel has rendered, so the first paint is
 * hidden at the raw anchor and the clamped position lands on the next frame —
 * one frame of invisibility beats a menu that opens half off the viewport.
 */
export function useAnchoredPanel(anchor: Point, alignment: PanelAlignment = 'corner') {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Point | null>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) return
    const place = alignment === 'corner' ? clampToViewport : centreBelowPointer
    // `offsetWidth`/`offsetHeight`, not a rect: the panel is mid-`animate-cm-pop`
    // when this runs, and a rect is the *transformed* box — it hands back the
    // scaled size, so the panel is clamped as if it were smaller than it settles
    // at and hangs off the edge it was clamped away from. Layout does not see
    // transforms. (Integers, which the 12px margin absorbs.)
    setPosition(
      place(
        anchor.x,
        anchor.y,
        element.offsetWidth,
        element.offsetHeight,
        window.innerWidth,
        window.innerHeight,
      ),
    )
  }, [alignment, anchor.x, anchor.y])

  // Hidden by opacity, not `visibility`: a `visibility: hidden` subtree cannot
  // take focus, so Whisper's caret would silently fail to land on the frame the
  // panel is being measured.
  const style: CSSProperties =
    position === null
      ? { left: anchor.x, top: anchor.y, opacity: 0, pointerEvents: 'none' }
      : { left: position.x, top: position.y }

  return { ref, style }
}
