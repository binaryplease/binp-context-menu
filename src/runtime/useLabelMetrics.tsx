/**
 * Measure the labels a surface is about to place, before it places them.
 *
 * The radial surfaces size themselves to their content: the Compass grows until
 * its longest label fits inside the rim, Orbit spaces its rings so two
 * neighbours' captions do not collide. Both need a number of pixels for a string
 * the host wrote, in a face the host may have re-pointed — and the only honest
 * source of that number is the browser. A character count cannot see the mono
 * face, the icon beside the text, the tracking, or the user's own font settings.
 *
 * So a surface renders its labels twice: once here, in a layer that is laid out
 * and measured but never seen, and once for real, at the geometry the measurement
 * produced. It is the same measure-then-place shape `useAnchoredPanel` uses for
 * the floating panels, and it lives beside it in the runtime for the same reason
 * — every surface that needs it needs the *same* one, and this file is that
 * one shared wrapper.
 *
 * Three things this has to get right:
 *
 * - **The layer is hidden with opacity, never `display: none`.** A display-none
 *   subtree has no boxes to measure at all. `visibility: hidden` would measure,
 *   but the codebase hides with opacity everywhere (a hidden subtree cannot take
 *   focus, which is what cost Whisper's caret), so there is one habit, not two.
 * - **Sizes are read with `offsetWidth`/`offsetHeight`, not
 *   `getBoundingClientRect()`.** The surfaces animate in with a `transform`, and
 *   a rect is the *transformed* box — a wheel measured mid-pop would come out
 *   scaled, and settle at the wrong diameter. Offset dimensions are layout, and
 *   layout does not see transforms.
 * - **Each specimen shrink-wraps (`w-max`).** A block-level flex row would
 *   otherwise be as wide as the layer, and every label would measure the same.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type MeasuredBox = { width: number; height: number }

export type LabelSpecimen = {
  /** What the caller looks the box up by — a command id. */
  id: string
  /** The classes that decide the box: face, size, padding, gap. */
  className?: string
  children: ReactNode
}

export type LabelMetrics = {
  /** `null` until the first measurement lands — until then, nothing is placed. */
  boxes: ReadonlyMap<string, MeasuredBox> | null
  /**
   * Render this *inside* the surface, so the specimens inherit the faces and
   * sizes the real labels will be drawn in.
   */
  measureLayer: ReactNode
}

export function useLabelMetrics(specimens: LabelSpecimen[]): LabelMetrics {
  const layerRef = useRef<HTMLDivElement>(null)
  const [boxes, setBoxes] = useState<ReadonlyMap<string, MeasuredBox> | null>(null)
  // A web font that lands after the first paint re-lays every label out, and the
  // effect below only runs on a render. This asks for one when the faces arrive.
  const [, setFontGeneration] = useState(0)

  useEffect(() => {
    let isCurrent = true
    void document.fonts.ready.then(() => {
      if (isCurrent) setFontGeneration((generation) => generation + 1)
    })
    return () => {
      isCurrent = false
    }
  }, [])

  // No dependency array, on purpose. The specimens are React children, so there
  // is nothing to compare but the boxes themselves: measure on every render,
  // commit only a *changed* map. That settles in one extra render, and it
  // re-measures whenever anything — the command list, a config knob, the face —
  // actually moves a pixel.
  //
  // A layout effect rather than an effect, because the sizes have to be in state
  // before the browser paints: the surface hides itself until they are, and one
  // painted frame of an unsized wheel is a visible jump.
  useLayoutEffect(() => {
    const layer = layerRef.current
    if (layer === null) return
    const measured = new Map<string, MeasuredBox>()
    for (const element of layer.querySelectorAll<HTMLElement>('[data-cm-measure]')) {
      const id = element.dataset.cmMeasure
      if (id === undefined) continue
      measured.set(id, { width: element.offsetWidth, height: element.offsetHeight })
    }
    setBoxes((current) => (isSameMeasurement(current, measured) ? current : measured))
  })

  const measureLayer = (
    <div ref={layerRef} aria-hidden className="pointer-events-none absolute top-0 left-0 opacity-0">
      {specimens.map((specimen) => (
        <div
          key={specimen.id}
          data-cm-measure={specimen.id}
          className={`w-max ${specimen.className ?? ''}`}
        >
          {specimen.children}
        </div>
      ))}
    </div>
  )

  return { boxes, measureLayer }
}

function isSameMeasurement(
  current: ReadonlyMap<string, MeasuredBox> | null,
  measured: ReadonlyMap<string, MeasuredBox>,
): boolean {
  if (current === null || current.size !== measured.size) return false
  for (const [id, box] of measured) {
    const previous = current.get(id)
    if (previous === undefined) return false
    if (previous.width !== box.width || previous.height !== box.height) return false
  }
  return true
}
