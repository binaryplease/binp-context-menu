/**
 * 02 · Compass — a direction, not a line.
 *
 * Every command lives on its kind's arc, and every arc is on the wheel at once.
 * You flick toward a kind and slide out to the command; after a week the hand
 * knows "build = up-then-right" and stops reading entirely. The scan is replaced
 * by a gesture, which is the only reading cost that goes to zero with practice.
 *
 * The hub is the surface's one piece of prose: it names whatever the pointer is
 * over, so the wheel stays learnable while it is still unfamiliar.
 *
 * **The wheel is sized by its labels, not the other way round.** `diameter` and
 * `itemRingRadius` are floors: the ring labels are measured first (`useLabelMetrics`),
 * and the rim moves out until the longest one — at its own angle, in its own
 * face — sits inside it (`fitFieldRadius`). Growth stops at the viewport, because
 * the wheel is placed by its own radius and an unbounded one would only overflow
 * a different edge; past that point a label truncates to the width the rim leaves
 * it, keeps its full text in the DOM for the accessible name, and the hub still
 * spells it out under the pointer.
 */
import { useMemo, useState } from 'react'
import { annularWedgePath, clampCentre, polar } from '../lib/geometry.ts'
import {
  fitFieldRadius,
  labelWidthCap,
  labelWidthWithin,
  type LabelPlacement,
} from '../lib/radialFit.ts'
import { titleTextOf, type Command, type CommandKind } from '../schema/command.ts'
import { CommandIcon, CommandLabel } from '../components/CommandVisuals.tsx'
import { CommandButton } from '../components/CommandButton.tsx'
import { kindColorOf, toneColorOf } from '../components/commandTone.ts'
import { useContextMenuRuntime } from '../runtime/context.ts'
import { useLabelMetrics } from '../runtime/useLabelMetrics.tsx'
import type { SurfaceComponentProps } from './types.ts'

type Focus =
  | { type: 'kind'; kind: CommandKind }
  | { type: 'command'; command: Command; kind: CommandKind | null }

/** Clear air between the outermost label corner and the command ring. */
const LABEL_INSET = 8
/** How close the wheel may come to the edge of the viewport. */
const VIEWPORT_MARGIN = 12

/**
 * What makes a ring label a box: the face, the gap to its icon, the padding.
 *
 * Shared with the measure pass so that what is measured is what is drawn — a
 * second copy of this string is a wheel sized for a label nobody renders.
 */
const LABEL_BOX_CLASS = 'flex items-center gap-1.5 px-0.5 py-[3px] whitespace-nowrap'

/** Rotate a label along its arc, flipped where it would otherwise read upside-down. */
function labelRotation(angleDegrees: number, isRadial: boolean): number {
  if (!isRadial) return 0
  const turn = ((angleDegrees % 360) + 360) % 360
  return turn > 90 && turn < 270 ? turn + 180 : turn
}

/**
 * The label's own contents — icon plus short label.
 *
 * `emphasised` is the weight a label takes under the pointer. The measure pass
 * asks for it unconditionally: a wheel sized for the lighter face would let the
 * one label the user is actually pointing at grow past the rim.
 */
function RingLabel({
  command,
  kind,
  emphasised,
}: {
  command: Command
  kind: CommandKind | null
  emphasised: boolean
}) {
  return (
    <>
      <CommandIcon command={command} kind={kind} size={14} />
      <CommandLabel
        command={command}
        short
        // The truncation seam: capped by the button's own max-width, the text
        // stays whole in the DOM (so the accessible name is), and only its
        // rendering is cut.
        className="min-w-0 overflow-hidden text-[11px] tracking-[-0.01em] text-ellipsis text-cm-ink"
        // The emphasis is *inside* the face rather than a class appended to it.
        // Two font-weight utilities on one element resolve by stylesheet order,
        // not class order, so an appended `font-extrabold` lost to the
        // `font-semibold` it was meant to override and the focused label never
        // changed weight at all — the first Tailwind trap, again.
        monoClassName={`font-cm-mono text-[10.5px] ${emphasised ? 'font-extrabold' : 'font-medium'}`}
        proseClassName={emphasised ? 'font-extrabold' : 'font-semibold'}
      />
    </>
  )
}

export function CompassSurface({ invocation }: SurfaceComponentProps) {
  const { commands, kinds, kindOf, runCommand, config } = useContextMenuRuntime()
  const compass = config.compass

  const populatedKinds = useMemo(
    () => kinds.filter((kind) => commands.some((command) => command.kindId === kind.id)),
    [commands, kinds],
  )
  const [focus, setFocus] = useState<Focus | null>(() =>
    populatedKinds[0] === undefined ? null : { type: 'kind', kind: populatedKinds[0] },
  )

  const sweep = populatedKinds.length === 0 ? 360 : 360 / populatedKinds.length
  const spans = populatedKinds.map((kind, kindIndex) => {
    // -135° puts the first kind's arc across the top, so "up" is the first thing
    // a hand reaches for — the same place the flat list's first group sat.
    const centreAngle = kind.compassAngle ?? -135 + sweep / 2 + kindIndex * sweep
    return { kind, start: centreAngle - sweep / 2, end: centreAngle + sweep / 2 }
  })

  // Where every command sits on the rim, worked out before anything is sized: an
  // angle is a property of the command set, not of the wheel's diameter.
  const ringItems = spans.flatMap(({ kind, start, end }) => {
    const kindCommands = commands.filter((command) => command.kindId === kind.id)
    const step = (end - start) / kindCommands.length
    return kindCommands.map((command, commandIndex) => {
      const angle = start + (commandIndex + 0.5) * step
      return {
        command,
        kind,
        sliceStart: start + commandIndex * step,
        sliceStep: step,
        angle,
        rotation: labelRotation(angle, compass.radialLabels),
      }
    })
  })

  const { boxes, measureLayer } = useLabelMetrics(
    ringItems.map(({ command, kind }) => ({
      id: command.id,
      className: LABEL_BOX_CLASS,
      children: <RingLabel command={command} kind={kind} emphasised />,
    })),
  )
  const isFitting = compass.fitLabels && boxes !== null

  // The rim-to-edge slack the config asks for, kept as the wheel grows: diameter
  // and command ring are two knobs, and the difference between them is the margin
  // the wheel is drawn with. Preserving it is what makes a set that already
  // fitted come out at exactly the pixels it came out at before.
  const edgeSlack = Math.max(0, compass.diameter - compass.itemRingRadius * 2)
  const viewportCeiling = Math.min(window.innerWidth, window.innerHeight) - VIEWPORT_MARGIN * 2
  const hostCeiling = compass.maxDiameter === 0 ? Number.POSITIVE_INFINITY : compass.maxDiameter
  const diameterCeiling = Math.max(compass.diameter, Math.min(hostCeiling, viewportCeiling))

  const labelRadiusFor = (outerRadius: number) => (compass.kindRingRadius + outerRadius) / 2
  const placementAt = (labelRadius: number, item: (typeof ringItems)[number]): LabelPlacement => {
    const box = boxes?.get(item.command.id)
    return {
      centre: polar(0, 0, labelRadius, item.angle),
      rotationDegrees: item.rotation,
      width: box?.width ?? 0,
      height: box?.height ?? 0,
    }
  }

  const itemRingRadius = isFitting
    ? fitFieldRadius({
        placementsAt: (outerRadius) =>
          ringItems.map((item) => placementAt(labelRadiusFor(outerRadius), item)),
        minRadius: compass.itemRingRadius,
        maxRadius: Math.max(compass.itemRingRadius, (diameterCeiling - edgeSlack) / 2),
        padding: LABEL_INSET,
      })
    : compass.itemRingRadius

  const size = Math.max(compass.diameter, itemRingRadius * 2 + edgeSlack)
  const centre = size / 2
  const labelRadius = labelRadiusFor(itemRingRadius)

  // What the rim leaves each label, where that is less than the label wants.
  // Below the ceiling the wheel has already grown to hold it and nothing is
  // capped; at the ceiling this is the degradation — the text is clipped to an
  // ellipsis, and `title` plus the hub keep it readable.
  const widthCaps = new Map<string, number>()
  if (isFitting) {
    for (const item of ringItems) {
      const placement = placementAt(labelRadius, item)
      const cap = labelWidthCap(
        placement.width,
        labelWidthWithin(placement, itemRingRadius - LABEL_INSET),
      )
      if (cap !== undefined) widthCaps.set(item.command.id, cap)
    }
  }

  const placed = clampCentre(
    invocation.anchor.x,
    invocation.anchor.y,
    centre + 8,
    window.innerWidth,
    window.innerHeight,
  )

  const focusedKindId =
    focus === null ? null : focus.type === 'kind' ? focus.kind.id : focus.command.kindId
  const focusedCommandId = focus !== null && focus.type === 'command' ? focus.command.id : null

  return (
    <div
      className="absolute animate-cm-pop font-cm-sans"
      style={{
        left: placed.x - centre,
        top: placed.y - centre,
        width: size,
        height: size,
        // Nothing is placed until the labels have been measured, because the
        // wheel's size is theirs. The measurement is committed in a layout
        // effect, so this frame is never painted — and it hides with opacity,
        // which is how this codebase hides anything it still intends to use.
        opacity: compass.fitLabels && boxes === null ? 0 : undefined,
      }}
      role="menu"
      aria-label="Command compass"
    >
      {measureLayer}

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 overflow-visible drop-shadow-cm-wheel"
      >
        {/* The wheel is the panel material, so it is painted in the surface token
            and outlined in the rule token — never in a literal, or the disc stays
            a white plate on a dark board. `fill`/`stroke` arrive as utilities
            rather than presentation attributes because a presentation attribute
            does not substitute `var()`. */}
        <circle
          cx={centre}
          cy={centre}
          r={itemRingRadius}
          className="fill-cm-bg stroke-cm-rule"
        />

        {spans.map(({ kind, start, end }) => (
          <path
            key={kind.id}
            d={annularWedgePath(centre, centre, compass.hubRadius, compass.kindRingRadius, start, end)}
            // The focus wash is the kind's colour mixed into *the surface*, so it
            // lightens a white wheel and darkens a charcoal one off one recipe.
            style={{
              fill:
                focusedKindId === kind.id
                  ? `color-mix(in srgb, ${kindColorOf(kind)} 8%, var(--color-cm-bg))`
                  : 'var(--color-cm-bg)',
            }}
            strokeWidth={1.5}
            className="cursor-pointer stroke-cm-rule transition-[fill] duration-100"
            onMouseEnter={() => setFocus({ type: 'kind', kind })}
            onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
          />
        ))}

        {ringItems.map(({ command, kind, sliceStart, sliceStep }) => {
          const isDisabled = command.disabledReason !== null
          const tone = toneColorOf(command, kind)
          return (
            <path
              key={command.id}
              d={annularWedgePath(
                centre,
                centre,
                compass.kindRingRadius,
                itemRingRadius,
                sliceStart,
                sliceStart + sliceStep,
              )}
              // The slice's wash is the *command's* tone, not the kind's, so a
              // destructive command is the one red wedge on an otherwise
              // green lane. Mixed into the surface token, as the kind arcs are.
              style={{
                fill:
                  focusedCommandId === command.id
                    ? `color-mix(in srgb, ${tone} 13%, var(--color-cm-bg))`
                    : command.destructive
                      ? `color-mix(in srgb, ${tone} 5%, var(--color-cm-bg))`
                      : 'var(--color-cm-bg)',
              }}
              className={`stroke-cm-rule ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onMouseEnter={() => setFocus({ type: 'command', command, kind })}
              onMouseDown={(mouseEvent) => {
                mouseEvent.preventDefault()
                runCommand(command)
              }}
            >
              <title>
                {isDisabled
                  ? `${titleTextOf(command)} — ${command.disabledReason}`
                  : titleTextOf(command)}
              </title>
            </path>
          )
        })}

        <circle
          cx={centre}
          cy={centre}
          r={compass.kindRingRadius}
          fill="none"
          className="stroke-cm-rule"
        />
        <circle cx={centre} cy={centre} r={compass.hubRadius} fill="none" className="stroke-cm-rule" />
      </svg>

      {/* Hub — the wheel's one sentence, naming whatever the pointer is over. It
          is also where a truncated ring label goes to be read in full. */}
      <div
        className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cm-rule bg-cm-bg text-center shadow-cm-hub"
        style={{ width: compass.hubRadius * 2 - 6, height: compass.hubRadius * 2 - 6 }}
      >
        <div>
          <div
            className={`px-2.5 text-[13px] leading-tight font-extrabold tracking-[-0.01em] ${
              focus !== null && focus.type === 'command' && focus.command.monospace
                ? 'font-cm-mono text-xs font-semibold'
                : ''
            }`}
            style={{
              color:
                focus === null
                  ? undefined
                  : focus.type === 'kind'
                    ? kindColorOf(focus.kind)
                    : toneColorOf(focus.command, focus.kind),
            }}
          >
            {focus === null ? 'Compass' : focus.type === 'kind' ? focus.kind.label : focus.command.label}
          </div>
          <div className="mt-1.5 px-2 font-cm-mono text-[9.5px] leading-snug tracking-[-0.01em] text-cm-ink-3">
            {/* The hub is the wheel's one sentence, so a command's own `detail`
                displaces its kind's description while that command is under the
                pointer — the more specific line wins the slot. */}
            {focus === null
              ? 'move toward a kind'
              : focus.type === 'kind'
                ? focus.kind.description
                : (focus.command.detail ?? focus.kind?.description ?? '')}
          </div>
        </div>
      </div>

      {/* Kind labels, in the inner ring. */}
      {spans.map(({ kind, start, end }) => {
        const midpoint = polar(
          centre,
          centre,
          (compass.hubRadius + compass.kindRingRadius) / 2,
          (start + end) / 2,
        )
        return (
          <div
            key={kind.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-xs font-extrabold"
            style={{ left: midpoint.x, top: midpoint.y, color: kindColorOf(kind) }}
          >
            {kind.label}
          </div>
        )
      })}

      {/* Command labels, all shown at once — the wheel's whole promise is that
          nothing is hidden behind a hover. */}
      {ringItems.map(({ command, kind, angle, rotation }) => {
        const point = polar(centre, centre, labelRadius, angle)
        const isDimmed = focusedKindId !== null && focusedKindId !== kind.id
        const widthCap = widthCaps.get(command.id)
        return (
          <CommandButton
            key={command.id}
            command={command}
            onActivate={runCommand}
            onHover={() => setFocus({ type: 'command', command, kind })}
            // Only once the rim has actually cut the label: a native tooltip on
            // every label would fight the hub for the same job.
            title={widthCap === undefined ? undefined : titleTextOf(command)}
            className={[
              'absolute transition-opacity duration-100',
              LABEL_BOX_CLASS,
              isDimmed ? 'opacity-30' : '',
              command.disabledReason === null ? 'cursor-pointer' : '',
            ].join(' ')}
            style={{
              left: point.x,
              top: point.y,
              maxWidth: widthCap,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }}
          >
            <RingLabel command={command} kind={kindOf(command)} emphasised={focusedCommandId === command.id} />
          </CommandButton>
        )
      })}
    </div>
  )
}
