/**
 * Placement maths shared by the surfaces — polar coordinates for Compass and
 * Orbit, annular wedges for Compass, and viewport clamping for every panel that
 * opens at the pointer.
 *
 * These live together because they share one dependency (none) and one job
 * (turning an anchor into coordinates), not because the surfaces are neighbours:
 * a unit of code lives where its dependencies are.
 */

export type Point = { x: number; y: number }

export type Box = {
  left: number
  top: number
  width: number
  height: number
}

/** Point at `radius` and `degrees` (clockwise from 3 o'clock) around a centre. */
export function polar(centreX: number, centreY: number, radius: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180
  return {
    x: centreX + radius * Math.cos(radians),
    y: centreY + radius * Math.sin(radians),
  }
}

/** SVG path for a wedge of an annulus — one slice of the Compass wheel. */
export function annularWedgePath(
  centreX: number,
  centreY: number,
  innerRadius: number,
  outerRadius: number,
  startDegrees: number,
  endDegrees: number,
): string {
  const outerStart = polar(centreX, centreY, outerRadius, startDegrees)
  const outerEnd = polar(centreX, centreY, outerRadius, endDegrees)
  const innerEnd = polar(centreX, centreY, innerRadius, endDegrees)
  const innerStart = polar(centreX, centreY, innerRadius, startDegrees)
  const isLargeArc = Math.abs(endDegrees - startDegrees) % 360 > 180 ? 1 : 0
  return [
    `M${outerStart.x} ${outerStart.y}`,
    `A${outerRadius} ${outerRadius} 0 ${isLargeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L${innerEnd.x} ${innerEnd.y}`,
    `A${innerRadius} ${innerRadius} 0 ${isLargeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

/**
 * Keep a fixed-size panel fully on screen.
 *
 * A panel that would overflow to the right flips to the *other* side of the
 * pointer rather than merely sliding left, so the pointer never ends up sitting
 * on top of the first row it is about to click.
 */
export function clampToViewport(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 12,
): Point {
  let left = anchorX
  let top = anchorY
  if (left + width > viewportWidth - margin) left = Math.max(margin, anchorX - width)
  if (top + height > viewportHeight - margin) top = Math.max(margin, viewportHeight - margin - height)
  return {
    x: Math.max(margin, left),
    y: Math.max(margin, top),
  }
}

/**
 * Keep a fixed-size panel on screen *under* the pointer, centred on it.
 *
 * The other placement hangs a panel off the pointer by its top-left corner,
 * which is right for a column you read downward — the first row is where the
 * hand already is. Strata is not a column: it is four lanes side by side, and
 * hanging six hundred pixels of them to the right of the click puts the lane you
 * want an arm's length from the one you pressed on. Centred, the wall grows
 * symmetrically out of the pointer and every lane is the same distance away.
 *
 * Vertically it flips *above* the pointer rather than sliding up, for the same
 * reason the other one flips sideways: a panel slid up until it fits lands under
 * the cursor, and the row the cursor is on is the row about to be clicked.
 */
export function centreBelowPointer(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 12,
): Point {
  const centredLeft = anchorX - width / 2
  const rightmostLeft = viewportWidth - margin - width
  let top = anchorY
  if (top + height > viewportHeight - margin) {
    const above = anchorY - height
    top = above >= margin ? above : Math.max(margin, viewportHeight - margin - height)
  }
  return {
    // A panel wider than the viewport has no fitting position at all, so it
    // takes the left margin and overflows the right — the same surrender
    // `clampToViewport` makes, spelled the same way.
    x: Math.max(margin, Math.min(centredLeft, rightmostLeft)),
    y: Math.max(margin, top),
  }
}

/**
 * Where the explanation on an unavailable command lands, given the control it
 * belongs to.
 *
 * Unlike the panels above, this is placed against a *box* rather than a point:
 * the chip is centred on the control and sits a hair off one of its edges, so
 * the thing being explained and the explanation read as one object. The
 * preferred side is the caller's — a row in a column wants its explanation
 * below, so it does not cover the row above it — and it flips to the other side
 * only when the preferred one has run out of room, because a chip that slides
 * until it fits ends up on top of the control it is describing.
 */
export function placeExplanation(
  anchor: Box,
  placement: 'above' | 'below',
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  gap = 6,
  margin = 8,
): Point {
  const above = anchor.top - gap - height
  const below = anchor.top + anchor.height + gap
  const fitsAbove = above >= margin
  const fitsBelow = below + height <= viewportHeight - margin
  const preferred = placement === 'above' ? above : below
  const flipped = placement === 'above' ? below : above
  const fitsPreferred = placement === 'above' ? fitsAbove : fitsBelow
  const fitsFlipped = placement === 'above' ? fitsBelow : fitsAbove
  // Neither side fits: keep the side that was asked for and let the clamp below
  // deal with it, rather than flipping to a second position that is no better.
  const top = fitsPreferred || !fitsFlipped ? preferred : flipped
  const centredLeft = anchor.left + anchor.width / 2 - width / 2
  return {
    // The same surrender the panels make, spelled the same way: a chip wider
    // than the viewport takes the left margin and overflows the right.
    x: Math.max(margin, Math.min(centredLeft, viewportWidth - margin - width)),
    y: Math.max(margin, Math.min(top, viewportHeight - margin - height)),
  }
}

/** Keep a centred field (Compass, Orbit) inside the viewport by its own radius. */
export function clampCentre(
  anchorX: number,
  anchorY: number,
  radius: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 10,
): Point {
  return {
    x: Math.min(viewportWidth - radius - margin, Math.max(radius + margin, anchorX)),
    y: Math.min(viewportHeight - radius - margin, Math.max(radius + margin, anchorY)),
  }
}

/**
 * Lift a colour toward the light that falls on it — the Orbit bubbles' specular
 * highlight, the thing that makes a flat disc read as a sphere.
 *
 * Mixed by CSS rather than in numbers, because none of the colours this is
 * handed can be read by JavaScript at all: a kind's colour arrives already
 * wrapped in the legibility mix `kindColorOf` applies, a destructive one is the
 * token reference `var(--color-cm-danger)`, and a host may hand over a
 * `light-dark()` pair. A numeric path would only ever fire for a bare
 * `#rrggbb`, and that case no longer reaches here.
 *
 * The highlight is `--color-cm-on-tone` for the same reason the bubble's icon is:
 * it is light striking a saturated fill, not ink on the page, so it does not flip
 * with the palette.
 */
export function lighten(colour: string, percent: number): string {
  return `color-mix(in srgb, ${colour} ${100 - percent}%, var(--color-cm-on-tone))`
}
