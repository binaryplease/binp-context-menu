/**
 * 04 · Orbit — the menu that rearranges for you.
 *
 * Commands are pulled toward the cursor and sized by how often you use them:
 * your top few are big and hug the pointer, the long tail shrinks into a distant
 * cloud. Run one and it grows for next time. The thing you want becomes the
 * biggest, closest target on screen — Fitts's law, weaponised.
 *
 * This is the surface that makes persistence matter: without a place to keep
 * what it learned, Orbit resets to a stranger's menu on every reload.
 *
 * **The field is sized by its captions**, the same bargain the Compass strikes,
 * on the constraint Orbit actually has. A ring does not have to hold the longest
 * caption end to end; it has to keep two *neighbours'* captions apart, and the
 * room between neighbours is a chord. So each ring is pushed out until that chord
 * clears the widest caption on it, outer rings move out by as much as the ring
 * inside them did (their configured gaps survive), growth stops at the viewport,
 * and a caption that still will not fit is clipped to the chord it has.
 */
import { useMemo } from 'react'
import { clampCentre, lighten, polar } from '../lib/geometry.ts'
import { chordWidthOnRing, labelWidthCap, ringRadiusForChord } from '../lib/radialFit.ts'
import { CommandButton } from '../components/CommandButton.tsx'
import { CommandLabel } from '../components/CommandVisuals.tsx'
import { toneColorOf } from '../components/commandTone.ts'
import { useContextMenuRuntime } from '../runtime/context.ts'
import { useLabelMetrics } from '../runtime/useLabelMetrics.tsx'
import { titleTextOf, type Command } from '../schema/command.ts'
import type { SurfaceComponentProps } from './types.ts'

/** Clear air between two neighbours' captions. */
const LABEL_MARGIN = 8
/** The caption's own gap under its bubble. */
const LABEL_OFFSET = 3
/** How close the field may come to the edge of the viewport. */
const VIEWPORT_MARGIN = 12

/**
 * The caption under a bubble. Shared with the measure pass, so what is measured
 * is what is drawn — placement and the width cap are the caller's, because only
 * the real one has a bubble to hang under.
 */
function BubbleLabel({ command }: { command: Command }) {
  return (
    <CommandLabel
      command={command}
      // Clipped rather than shortened: the text stays whole in the DOM, so the
      // bubble's accessible name is still the command's full label.
      className="block overflow-hidden rounded-[3px] bg-cm-bg/80 px-[3px] text-[10px] tracking-[-0.01em] text-ellipsis whitespace-nowrap text-cm-ink-2"
      monoClassName="font-cm-mono font-medium"
      proseClassName="font-semibold"
    />
  )
}

export function OrbitSurface({ invocation }: SurfaceComponentProps) {
  const { commands, kindOf, weightOf, runCommand, config } = useContextMenuRuntime()
  const orbit = config.orbit

  const ranked = useMemo(
    () => [...commands].sort((first, second) => weightOf(second) - weightOf(first)),
    [commands, weightOf],
  )

  const heaviest = ranked.length === 0 ? 0 : weightOf(ranked[0]!)
  const lightest = ranked.length === 0 ? 0 : weightOf(ranked[ranked.length - 1]!)
  const weightRange = heaviest - lightest || 1
  const diameterFor = (command: Command) =>
    orbit.minDiameter +
    ((weightOf(command) - lightest) / weightRange) * (orbit.maxDiameter - orbit.minDiameter)

  // Rings fill inner-first by rank; whatever overflows the declared capacities
  // joins the outermost ring rather than falling off the field.
  const ringGroups = useMemo(() => {
    const groups: { radius: number; startAngle: number; commands: Command[] }[] = orbit.rings.map(
      (ring) => ({ radius: ring.radius, startAngle: ring.startAngle, commands: [] }),
    )
    if (groups.length === 0) return groups
    let cursor = 0
    orbit.rings.forEach((ring, ringIndex) => {
      const isLastRing = ringIndex === orbit.rings.length - 1
      const take = isLastRing ? ranked.length - cursor : Math.min(ring.capacity, ranked.length - cursor)
      groups[ringIndex]!.commands = ranked.slice(cursor, cursor + Math.max(0, take))
      cursor += Math.max(0, take)
    })
    return groups
  }, [orbit.rings, ranked])

  const { boxes, measureLayer } = useLabelMetrics(
    commands.map((command) => ({ id: command.id, children: <BubbleLabel command={command} /> })),
  )
  const isFitting = orbit.fitLabels && boxes !== null
  const widthOf = (command: Command) => boxes?.get(command.id)?.width ?? 0
  const captionHeight = Math.max(0, ...[...(boxes?.values() ?? [])].map((box) => box.height))

  // A bubble on the outermost ring still needs its own radius and its caption
  // underneath, so the ring itself stops short of the viewport by that much.
  const captionDepth = orbit.maxDiameter / 2 + LABEL_OFFSET + captionHeight
  const fieldCeiling = Math.min(window.innerWidth, window.innerHeight) / 2 - VIEWPORT_MARGIN
  const ringCeiling = fieldCeiling - captionDepth

  // Outer rings move out by as much as the widest push any ring inside them
  // needed, so the field's configured spacing survives growing: a ring never
  // lands on the one it used to sit outside of. A ring is never pulled *in* —
  // a command set that already fitted comes out at its configured radii.
  let push = 0
  const rings = ringGroups.map((ring) => {
    const widest = Math.max(0, ...ring.commands.map(widthOf))
    const spaced = isFitting ? ringRadiusForChord(widest, ring.commands.length, LABEL_MARGIN) : 0
    const radius = Math.min(
      Math.max(ring.radius + push, spaced),
      Math.max(ring.radius, ringCeiling),
    )
    push = Math.max(push, radius - ring.radius)
    return {
      ...ring,
      radius,
      // What the chord between two neighbours leaves each caption. Above the
      // ceiling this is wider than any caption on the ring and nothing is cut.
      widthLimit: isFitting
        ? chordWidthOnRing(radius, ring.commands.length, LABEL_MARGIN)
        : Number.POSITIVE_INFINITY,
    }
  })

  const outermost = Math.max(0, ...rings.map((ring) => ring.radius))
  const widestCaption = Math.max(
    0,
    ...rings.flatMap((ring) => ring.commands.map((command) => Math.min(widthOf(command), ring.widthLimit))),
  )
  // What the field actually occupies, so the clamp keeps the captions on screen
  // too — half a caption sticks out sideways past the bubble it hangs under.
  const outerRadius = Math.min(
    fieldCeiling,
    outermost + (isFitting ? Math.max(orbit.maxDiameter, captionDepth, widestCaption / 2) : orbit.maxDiameter),
  )
  const centre = clampCentre(
    invocation.anchor.x,
    invocation.anchor.y,
    outerRadius,
    window.innerWidth,
    window.innerHeight,
  )

  return (
    <div
      className="pointer-events-none absolute inset-0"
      // The rings' radii are their captions', so nothing is placed until those
      // are measured. The measurement lands in a layout effect, before paint.
      style={{ opacity: orbit.fitLabels && boxes === null ? 0 : undefined }}
      role="menu"
      aria-label="Command orbit"
    >
      {measureLayer}

      {/* The core marks where the pointer was, so the field reads as *pulled
          toward you* rather than as a thing that landed somewhere arbitrary. */}
      <div
        className="absolute size-4 -translate-x-1/2 -translate-y-1/2"
        style={{ left: centre.x, top: centre.y }}
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full bg-cm-ink opacity-15" />
        <div className="absolute -inset-2 rounded-full border border-dashed border-cm-ink-4 opacity-40" />
      </div>

      {rings.flatMap((ring, ringIndex) => {
        const step = ring.commands.length === 0 ? 0 : 360 / ring.commands.length
        return ring.commands.map((command, commandIndex) => {
          const kind = kindOf(command)
          const angle = ring.startAngle + commandIndex * step
          const point = polar(centre.x, centre.y, ring.radius, angle)
          const diameter = diameterFor(command)
          // The bubble is filled with the command's tone, so a destructive
          // command is a red planet in the field rather than one more green one
          // with a differently-coloured caption.
          const colour = toneColorOf(command, kind)
          const widthCap = labelWidthCap(widthOf(command), ring.widthLimit)
          return (
            <CommandButton
              key={command.id}
              command={command}
              onActivate={runCommand}
              title={`${titleTextOf(command)} · weight ${Math.round(weightOf(command))}`}
              className={[
                // The rim and the icon are the ink *on a saturated fill*, which is
                // one token (`cm-on-tone`) rather than the page's ink: a bubble is
                // a coloured planet under both themes, so what reads on it does
                // not flip with the board behind it.
                'pointer-events-auto absolute grid -translate-x-1/2 -translate-y-1/2 animate-cm-bubble-in place-items-center rounded-full border-[1.5px] border-cm-on-tone/55 text-cm-on-tone shadow-cm-bubble transition-transform',
                command.disabledReason === null ? 'cursor-pointer hover:z-[3] hover:scale-110' : '',
                // A clipped caption reads better over its neighbours than under
                // them, and it is the one under the pointer that is being read.
                widthCap === undefined ? '' : 'hover:z-[4]',
              ].join(' ')}
              style={{
                left: point.x,
                top: point.y,
                width: diameter,
                height: diameter,
                background: `radial-gradient(circle at 35% 30%, ${lighten(colour, 20)}, ${colour})`,
                // Stagger by ring, not by index: the biggest, most-used bubbles at
                // the centre land immediately, so nobody waits on the tail.
                animationDelay: `${ringIndex * 45}ms`,
              }}
            >
              {command.icon === null ? null : (
                <command.icon size={Math.round(diameter * 0.44)} stroke={1.9} />
              )}
              <span
                className="pointer-events-none absolute top-[calc(100%+3px)] left-1/2 -translate-x-1/2"
                style={{ maxWidth: widthCap }}
              >
                <BubbleLabel command={command} />
              </span>
            </CommandButton>
          )
        })
      })}
    </div>
  )
}
