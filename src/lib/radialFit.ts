/**
 * How much room a label takes once it is placed — and therefore how big a radial
 * surface has to be to hold the one it was handed.
 *
 * Compass and Orbit both used to draw a fixed frame around variable content: a
 * wheel of a configured diameter, a field of configured ring radii, and labels
 * whose length is the host's business. Feed either a real command set — "New task
 * in context menu", "Open file explorer" — and the text sails off the rim
 * onto the page behind. The wheel has to serve the labels, not the other way
 * round, and that means turning "this box, at this angle" into a number.
 *
 * These live together with the rest of the placement maths because they share its
 * one dependency (arithmetic) and its one job (turning an anchor into
 * coordinates), and apart from the surfaces because both surfaces need the same
 * answer: a unit of code lives where its dependencies are.
 *
 * Nothing here measures anything: a width and a height arrive already measured
 * from `useLabelMetrics`, which reads the real DOM. Guessing a width from a
 * character count is exactly what this module exists so nobody does.
 */
import type { Point } from './geometry.ts'

const DEGREES_TO_RADIANS = Math.PI / 180

/** A label box, already placed: where its centre sits and how it is turned. */
export type LabelPlacement = {
  /** The box's centre, relative to the centre of the field. */
  centre: Point
  /** How the box itself is rotated, degrees clockwise. `0` is horizontal. */
  rotationDegrees: number
  width: number
  height: number
}

/**
 * The two numbers every question about a rotated box reduces to.
 *
 * A rotated box's corners are no longer at `centre ± (width/2, height/2)`, so it
 * is taken apart along its *own* axes instead: step from the centre to the middle
 * of each of the two long edges (half the height, across the text), and whatever
 * is left of the reach is half the width, along the text. Both edges come back
 * because either one can carry the corner that pokes out furthest, depending on
 * which side of the field the label sits on.
 *
 * This is why the same string does not cost the same everywhere: a label at 3
 * o'clock spends its width straight outward, while one at 12 o'clock — rotated a
 * quarter turn to stay readable — spends it along a different axis entirely.
 */
function edgeMidpoints(placement: LabelPlacement): { distance: number; alongComponent: number }[] {
  const rotation = placement.rotationDegrees * DEGREES_TO_RADIANS
  const alongX = Math.cos(rotation)
  const alongY = Math.sin(rotation)
  const halfHeight = placement.height / 2
  return [1, -1].map((side) => {
    // The across-axis is the along-axis turned a quarter turn: (-sin, cos).
    const midpointX = placement.centre.x - side * halfHeight * alongY
    const midpointY = placement.centre.y + side * halfHeight * alongX
    return {
      distance: Math.hypot(midpointX, midpointY),
      /** How much of that distance points along the text, either way. */
      alongComponent: Math.abs(midpointX * alongX + midpointY * alongY),
    }
  })
}

/** How far this label's furthest corner gets from the centre of the field. */
export function labelReach(placement: LabelPlacement): number {
  const halfWidth = placement.width / 2
  return Math.max(
    ...edgeMidpoints(placement).map(({ distance, alongComponent }) =>
      // |edge ± halfWidth·along|, taking the end of the text that reaches further.
      Math.sqrt(distance * distance + halfWidth * halfWidth + 2 * halfWidth * alongComponent),
    ),
  )
}

/**
 * The widest this label may be drawn without a corner passing `limitRadius`.
 *
 * The inverse of {@link labelReach} — solve `distance² + a² + 2·a·along = limit²`
 * for the half-width `a` — and the number a surface truncates to once it has
 * grown as far as the viewport allows. `0` comes back when the label's own
 * *height* already overruns the limit: there is no width that fits.
 */
export function labelWidthWithin(placement: LabelPlacement, limitRadius: number): number {
  return Math.min(
    ...edgeMidpoints(placement).map(({ distance, alongComponent }) => {
      const room = limitRadius * limitRadius - distance * distance
      if (room <= 0) return 0
      return 2 * (Math.sqrt(alongComponent * alongComponent + room) - alongComponent)
    }),
  )
}

/**
 * The slack every width comparison here carries, in pixels.
 *
 * A measured box is an integer — `offsetWidth` rounds — so it can sit up to half
 * a pixel under the text it holds, and the fixed point below stops a quarter of a
 * pixel short of exact. Both are invisible. An ellipsis on a label that fits by a
 * third of a pixel is not.
 */
const LABEL_SLACK = 1

/**
 * The `max-width` to draw a label at: none while it fits, the room it has once it
 * does not.
 *
 * Leaving a label uncapped while it fits is the point. The wheel has already
 * grown to hold it, so a cap could only ever be a rounding error away from
 * clipping a label that had the room — and a spurious ellipsis is the exact
 * failure this whole exercise is about. At the ceiling, where the field cannot
 * grow any further, the cap is real and the label is clipped to it.
 */
export function labelWidthCap(naturalWidth: number, limitWidth: number): number | undefined {
  return naturalWidth > limitWidth + LABEL_SLACK ? limitWidth : undefined
}

/** Passes of the fixed point below. Each closes half the gap; 24 is far past exact. */
const FIT_PASSES = 24
/** Sub-pixel differences are not worth another pass. */
const FIT_TOLERANCE = 0.25

export type FieldFit = {
  /** Where the labels would sit if the field's outer radius were this. */
  placementsAt: (outerRadius: number) => LabelPlacement[]
  /** The configured radius. The field never comes out smaller than this. */
  minRadius: number
  /** The viewport's (or the host's) ceiling. The field never comes out bigger. */
  maxRadius: number
  /** Breathing room between the outermost corner and the rim. */
  padding: number
}

/**
 * The smallest outer radius that holds every label.
 *
 * A formula would be nice, but growing the field *moves the labels*: a Compass
 * label rides halfway between the kind ring and the rim it has to stay inside, so
 * the answer depends on itself. It is a fixed point instead — and a fast,
 * well-behaved one, because that halfway means each pass closes half the
 * remaining gap and the sequence only ever rises toward the answer.
 */
export function fitFieldRadius({ placementsAt, minRadius, maxRadius, padding }: FieldFit): number {
  let radius = minRadius
  for (let pass = 0; pass < FIT_PASSES; pass += 1) {
    const reaches = placementsAt(radius).map((placement) => labelReach(placement) + padding)
    // Rounded *outward*, so the answer is never a fraction of a pixel short of
    // the label that decided it — and so the wheel comes out a whole number.
    const needed = Math.max(minRadius, Math.min(maxRadius, Math.ceil(Math.max(...reaches))))
    if (Math.abs(needed - radius) < FIT_TOLERANCE) return needed
    radius = needed
  }
  return radius
}

/**
 * The radius at which `count` boxes of `width` sit side by side on a ring without
 * touching.
 *
 * Orbit's constraint is angular rather than radial: a ring does not have to hold
 * the longest caption end to end, it has to keep two *neighbours'* captions
 * apart, and the room between two neighbours is a chord. One item on a ring has
 * no neighbour to collide with, so it constrains nothing.
 */
export function ringRadiusForChord(width: number, count: number, gap: number): number {
  if (count < 2) return 0
  return (width + gap) / (2 * Math.sin(Math.PI / count))
}

/** How wide each of `count` boxes may be drawn on a ring of this radius. */
export function chordWidthOnRing(radius: number, count: number, gap: number): number {
  if (count < 2) return Number.POSITIVE_INFINITY
  return Math.max(0, 2 * radius * Math.sin(Math.PI / count) - gap)
}
