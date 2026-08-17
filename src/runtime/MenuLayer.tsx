/**
 * The one overlay primitive.
 *
 * Every surface opens through this layer — there is no per-surface backdrop and
 * no surface that mounts itself somewhere else — one primitive per interaction
 * class. It owns menu dismissal (Escape, a click on the backdrop, a
 * scroll underneath) and the scrim; the surface owns everything inside. Where it
 * mounts is `<OverlayPortal>`'s, which is the only thing it shares with the
 * settings dialog.
 */
import { useEffect, useRef } from 'react'
import { OverlayPortal } from './OverlayPortal.tsx'
import { useContextMenuRuntime } from './context.ts'
import { SURFACES_BY_ID } from '../surfaces/registry.ts'

export function MenuLayer() {
  const { invocation, close, sfx } = useContextMenuRuntime()
  const isOpen = invocation !== null
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') close()
    }
    // Capture phase: a scroll *under* the menu invalidates the anchor the menu
    // was placed against, so it closes rather than drifting off its target.
    //
    // A scroll inside the layer is not that scroll. Whisper's result list is
    // taller than its frame and has to be scrollable — dismissing on it made the
    // list unreachable below the fold, and the anchor it was placed against has
    // not moved a pixel. The test is containment rather than a flag a surface
    // sets, so every surface that grows a scrollable region gets it for free.
    const closeOnScroll = (scrollEvent: Event) => {
      const scrolledNode = scrollEvent.target
      if (scrolledNode instanceof Node && layerRef.current?.contains(scrolledNode) === true) return
      close()
    }
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [close, isOpen])

  // The field's sustained carrier belongs to the invocation, not to the surface
  // component — stopping it here means no surface can leak a running oscillator
  // by unmounting on an unusual path.
  useEffect(() => {
    if (!isOpen) sfx.ambientStop()
  }, [isOpen, sfx])

  if (invocation === null) return null

  // The invocation's own direction, not the config's: under 05B the pad and a
  // plain right-click open different surfaces, and which one this press asked for
  // was decided when it happened (`invocationSurface.ts`).
  const surface = SURFACES_BY_ID[invocation.surface]
  const SurfaceComponent = surface.Component

  return (
    <OverlayPortal>
      <div
        ref={layerRef}
        className="fixed inset-0 z-50"
        data-binp-context-menu-layer={surface.id}
        onContextMenu={(mouseEvent) => mouseEvent.preventDefault()}
        onMouseDown={(mouseEvent) => {
          // Only a press on the backdrop itself dismisses. A surface that fills the
          // layer (Sigil) never lets this fire, which is why it owns its own close.
          if (mouseEvent.target === mouseEvent.currentTarget) close()
        }}
      >
        {/* Purely visual — `pointer-events-none` keeps the layer itself the press
            target, so a click on the dimmed area still dismisses. */}
        {surface.scrim ? (
          <div className="animate-cm-scrim-in pointer-events-none absolute inset-0 bg-cm-scrim backdrop-blur-[1.5px]" />
        ) : null}
        <SurfaceComponent key={invocation.key} invocation={invocation} />
      </div>
    </OverlayPortal>
  )
}
