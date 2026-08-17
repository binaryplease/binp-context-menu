/**
 * A $1-style unistroke recognizer — the engine behind Sigil.
 *
 * Resample the drawn path to a fixed point count, translate it to the origin,
 * scale it to a unit box, then compare it point-for-point against each template.
 * No rotation normalization: a glyph's orientation *is* its meaning here (a
 * forward stroke is Continue, a descending one is New task), so a rotated stroke
 * should read as a different rune, not the same one drawn sideways.
 *
 * Pure geometry, no DOM — the surface owns pointers, this owns shape. Single
 * purpose, so it is testable without a harness and readable without its caller.
 */

export type StrokePoint = { x: number; y: number }

/** Points per normalized stroke. Enough to separate ○ from □ at low cost. */
export const RESAMPLE_COUNT = 48

export function distanceBetween(first: StrokePoint, second: StrokePoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

export function pathLength(points: readonly StrokePoint[]): number {
  let total = 0
  for (let index = 1; index < points.length; index++) {
    total += distanceBetween(points[index - 1]!, points[index]!)
  }
  return total
}

/** Re-space `points` into exactly `count` evenly-spaced points along the path. */
export function resample(points: readonly StrokePoint[], count: number): StrokePoint[] {
  if (points.length < 2) return points.map((point) => ({ ...point }))
  const step = pathLength(points) / (count - 1)
  if (step === 0) return points.slice(0, count).map((point) => ({ ...point }))

  const resampled: StrokePoint[] = [{ ...points[0]! }]
  let accumulated = 0
  let previous: StrokePoint = { ...points[0]! }

  for (let index = 1; index < points.length; ) {
    const current = points[index]!
    const segmentLength = distanceBetween(previous, current)
    if (segmentLength === 0) {
      index++
      continue
    }
    if (accumulated + segmentLength >= step) {
      const ratio = (step - accumulated) / segmentLength
      const interpolated = {
        x: previous.x + ratio * (current.x - previous.x),
        y: previous.y + ratio * (current.y - previous.y),
      }
      resampled.push(interpolated)
      previous = interpolated
      accumulated = 0
    } else {
      accumulated += segmentLength
      previous = { ...current }
      index++
    }
  }

  const lastPoint = points[points.length - 1]!
  while (resampled.length < count) resampled.push({ ...lastPoint })
  return resampled.slice(0, count)
}

/** Centre on the origin and scale the longer axis to 1 — size- and place-blind. */
export function normalize(points: readonly StrokePoint[]): StrokePoint[] {
  if (points.length === 0) return []
  let centroidX = 0
  let centroidY = 0
  for (const point of points) {
    centroidX += point.x
    centroidY += point.y
  }
  centroidX /= points.length
  centroidY /= points.length

  let minimumX = Infinity
  let minimumY = Infinity
  let maximumX = -Infinity
  let maximumY = -Infinity
  for (const point of points) {
    minimumX = Math.min(minimumX, point.x)
    minimumY = Math.min(minimumY, point.y)
    maximumX = Math.max(maximumX, point.x)
    maximumY = Math.max(maximumY, point.y)
  }
  const scale = Math.max(maximumX - minimumX, maximumY - minimumY) || 1

  return points.map((point) => ({
    x: (point.x - centroidX) / scale,
    y: (point.y - centroidY) / scale,
  }))
}

/** Mean point-to-point distance between two equally-sized normalized strokes. */
export function meanDistance(first: readonly StrokePoint[], second: readonly StrokePoint[]): number {
  const count = Math.min(first.length, second.length)
  if (count === 0) return Infinity
  let total = 0
  for (let index = 0; index < count; index++) {
    total += distanceBetween(first[index]!, second[index]!)
  }
  return total / count
}

export type StrokeTemplate<Meta> = {
  meta: Meta
  normalized: StrokePoint[]
}

export function prepareTemplate<Meta>(meta: Meta, points: readonly StrokePoint[]): StrokeTemplate<Meta> {
  return { meta, normalized: normalize(resample(points, RESAMPLE_COUNT)) }
}

export type Recognition<Meta> = {
  meta: Meta
  distance: number
  /** `0..1`. Above the configured threshold the reading casts itself. */
  confidence: number
}

/**
 * Score a drawn stroke against every template, best first.
 *
 * The distance→confidence curve is empirical: a mean distance of ~0.43 in unit
 * space is where a reading stops being trustworthy, so that maps to zero.
 */
export function recognize<Meta>(
  drawnPoints: readonly StrokePoint[],
  templates: readonly StrokeTemplate<Meta>[],
): Recognition<Meta>[] {
  const drawn = normalize(resample(drawnPoints, RESAMPLE_COUNT))
  return templates
    .map((template) => {
      const distance = meanDistance(drawn, template.normalized)
      return {
        meta: template.meta,
        distance,
        confidence: Math.max(0, Math.min(1, 1 - distance * 2.35)),
      }
    })
    .sort((first, second) => first.distance - second.distance)
}
