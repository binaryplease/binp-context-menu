/**
 * Each direction's own knobs — one component per direction, pointed at from the
 * registry entry beside its `Component`.
 *
 * Why here and not in the panel: the settings panel shows *only the active
 * direction's* section, and the mapping from direction to section has to be a
 * property of the direction rather than a `switch` inside the panel — otherwise
 * an eighth direction gets added to `SURFACES`, appears in the picker, and its
 * knobs are orphaned in a file nobody thought to open. The registry is the one
 * place a direction is declared — it is the one descriptor — so it is where the
 * section is
 * declared too, and `test/surface-settings.test.ts` fails the build on a
 * direction whose config sub-object has no section.
 *
 * Why one module rather than one per surface: a section is a handful of rows over
 * a config sub-object, and its dependencies are the config schema plus the row
 * vocabulary — not the surface that reads the values ("a unit of code lives
 * where its dependencies are"). Deleting
 * `OrbitSurface` would not break `OrbitSettings`, so it does not live inside it.
 *
 * Everything here writes through `updateConfig`, so a knob turned in the demo's
 * column and the same knob in the modal are one write path — and one persist call.
 */
import { useContextMenuConfig } from '../runtime/context.ts'
import {
  OrbitRingSchema,
  PadBackgroundSchema,
  READING_CARD_MIN_DELAY_MS,
  SurfaceIdSchema,
} from '../schema/config.ts'
import { ActionRow, NumberRow, SelectRow, TextRow, ToggleRow } from '../components/SettingsRows.tsx'
import { PAD_BACKGROUNDS } from '../components/padBackgrounds.ts'
// The registry imports this module for the sections it points at, so this edge
// closes a cycle — deliberately, and harmlessly: the list is read inside a render,
// long after both modules have finished evaluating. The alternative is a second
// hand-written list of the directions' names, which is the thing the registry
// exists to be the only copy of.
import { SURFACES } from './registry.ts'

export function WhisperSettings() {
  const { config, updateConfig } = useContextMenuConfig()
  const whisper = config.whisper

  return (
    <>
      <ToggleRow
        label="Lead with most used"
        checked={whisper.showMostUsed}
        onChange={(checked) =>
          updateConfig((current) => ({
            ...current,
            whisper: { ...current.whisper, showMostUsed: checked },
          }))
        }
      />
      <NumberRow
        label="Most used shown"
        value={whisper.mostUsedCount}
        min={0}
        max={8}
        step={1}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            whisper: { ...current.whisper, mostUsedCount: Math.round(value) },
          }))
        }
      />
      <ToggleRow
        label="Group browse list by kind"
        checked={whisper.groupByKind}
        onChange={(checked) =>
          updateConfig((current) => ({
            ...current,
            whisper: { ...current.whisper, groupByKind: checked },
          }))
        }
      />
      <NumberRow
        label="Panel width"
        value={whisper.width}
        min={260}
        max={480}
        step={4}
        onChange={(value) =>
          updateConfig((current) => ({ ...current, whisper: { ...current.whisper, width: value } }))
        }
      />
      <TextRow
        label="Placeholder"
        value={whisper.placeholder}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            whisper: { ...current.whisper, placeholder: value },
          }))
        }
      />
    </>
  )
}

export function CompassSettings() {
  const { config, updateConfig } = useContextMenuConfig()
  const compass = config.compass

  return (
    <>
      <ToggleRow
        label="Rotate labels along the arc"
        checked={compass.radialLabels}
        onChange={(checked) =>
          updateConfig((current) => ({
            ...current,
            compass: { ...current.compass, radialLabels: checked },
          }))
        }
      />
      <ToggleRow
        label="Grow to fit the labels"
        checked={compass.fitLabels}
        onChange={(checked) =>
          updateConfig((current) => ({
            ...current,
            compass: { ...current.compass, fitLabels: checked },
          }))
        }
      />
      {/* Both radii below are floors while that is on, which is why the wheel can
          read wider than what these two say — turn it off to pin them. */}
      <NumberRow
        label={compass.fitLabels ? 'Smallest diameter' : 'Wheel diameter'}
        value={compass.diameter}
        min={260}
        max={560}
        step={4}
        onChange={(value) =>
          updateConfig((current) => ({ ...current, compass: { ...current.compass, diameter: value } }))
        }
      />
      <NumberRow
        label="Largest diameter · 0 = viewport"
        value={compass.maxDiameter}
        min={0}
        max={900}
        step={4}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            compass: { ...current.compass, maxDiameter: value },
          }))
        }
      />
      <NumberRow
        label="Hub radius"
        value={compass.hubRadius}
        min={34}
        max={96}
        step={2}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            compass: { ...current.compass, hubRadius: value },
          }))
        }
      />
      <NumberRow
        label="Kind ring radius"
        value={compass.kindRingRadius}
        min={64}
        max={148}
        step={2}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            compass: { ...current.compass, kindRingRadius: value },
          }))
        }
      />
      <NumberRow
        label="Command ring radius"
        value={compass.itemRingRadius}
        min={120}
        max={272}
        step={2}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            compass: { ...current.compass, itemRingRadius: value },
          }))
        }
      />
    </>
  )
}

export function StrataSettings() {
  const { config, updateConfig } = useContextMenuConfig()
  const strata = config.strata

  return (
    <>
      <NumberRow
        label="Lane width"
        value={strata.columnWidth}
        min={96}
        max={240}
        step={2}
        onChange={(value) =>
          updateConfig((current) => ({ ...current, strata: { ...current.strata, columnWidth: value } }))
        }
      />
      <TextRow
        label="Caption"
        value={strata.caption}
        onChange={(value) =>
          updateConfig((current) => ({ ...current, strata: { ...current.strata, caption: value } }))
        }
      />
    </>
  )
}

export function OrbitSettings() {
  const { config, updateConfig } = useContextMenuConfig()
  const orbit = config.orbit
  const lastRingIndex = orbit.rings.length - 1

  /**
   * Ring count is a length, so it truncates or grows the array rather than
   * editing a field. A new ring starts from the schema's own defaults — the same
   * object a fresh config would have got — placed one gap outside the last one,
   * so growing the field never lands a ring on top of an existing one.
   */
  const setRingCount = (count: number) =>
    updateConfig((current) => {
      const rings = current.orbit.rings.slice(0, count)
      while (rings.length < count) {
        const outermost = rings[rings.length - 1]
        const fresh = OrbitRingSchema.parse({})
        rings.push(outermost === undefined ? fresh : { ...fresh, radius: outermost.radius + 72 })
      }
      return { ...current, orbit: { ...current.orbit, rings } }
    })

  const patchRing = (ringIndex: number, patch: { radius?: number; capacity?: number }) =>
    updateConfig((current) => ({
      ...current,
      orbit: {
        ...current.orbit,
        rings: current.orbit.rings.map((ring, index) =>
          index === ringIndex ? { ...ring, ...patch } : ring,
        ),
      },
    }))

  return (
    <>
      {/* On, a ring's radius is a floor: it is pushed out until two neighbours'
          captions clear each other, and the ones outside it move with it. */}
      <ToggleRow
        label="Space rings for the captions"
        checked={orbit.fitLabels}
        onChange={(checked) =>
          updateConfig((current) => ({ ...current, orbit: { ...current.orbit, fitLabels: checked } }))
        }
      />
      <NumberRow
        label="Rings"
        value={orbit.rings.length}
        min={1}
        max={5}
        step={1}
        onChange={(value) => setRingCount(Math.round(value))}
      />
      {orbit.rings.map((ring, ringIndex) => (
        <div key={ringIndex} className="flex flex-col gap-1">
          <NumberRow
            label={`Ring ${ringIndex + 1} · radius`}
            value={ring.radius}
            min={40}
            max={340}
            step={2}
            onChange={(value) => patchRing(ringIndex, { radius: value })}
          />
          {/* The outermost ring takes whatever overflows the ones inside it, so it
              has no capacity of its own to set — a slider there would do nothing. */}
          {ringIndex === lastRingIndex ? null : (
            <NumberRow
              label={`Ring ${ringIndex + 1} · holds`}
              value={ring.capacity}
              min={1}
              max={24}
              step={1}
              onChange={(value) => patchRing(ringIndex, { capacity: Math.round(value) })}
            />
          )}
        </div>
      ))}
      <NumberRow
        label="Smallest bubble"
        value={orbit.minDiameter}
        min={16}
        max={72}
        step={1}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            orbit: { ...current.orbit, minDiameter: value },
          }))
        }
      />
      <NumberRow
        label="Largest bubble"
        value={orbit.maxDiameter}
        min={36}
        max={128}
        step={1}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            orbit: { ...current.orbit, maxDiameter: value },
          }))
        }
      />
    </>
  )
}

export function SigilSettings() {
  const { config, updateConfig } = useContextMenuConfig()
  const sigil = config.sigil

  return (
    <>
      {/* The alphabet itself is bound on the field, next to the command it casts
          ("affordances live next to what they change") — what belongs here is the
          standing count and the one thing
          the field has no room for: taking all of it back at once. The rune that
          closes the field is the library's, not a binding, so it is not counted
          and cannot be forgotten. */}
      <ActionRow
        label="Runes you have bound"
        value={String(sigil.runes.length)}
        actionLabel="Forget runes"
        onAction={() =>
          updateConfig((current) => ({ ...current, sigil: { ...current.sigil, runes: [] } }))
        }
      />
      {/* Off, the field is pure gesture — and the only place a rune is bound goes
          with it, which is why the label says what it is rather than "Lexicon". */}
      <ToggleRow
        label="Show the Lexicon (where runes are bound)"
        checked={sigil.showLexicon}
        onChange={(checked) =>
          updateConfig((current) => ({ ...current, sigil: { ...current.sigil, showLexicon: checked } }))
        }
      />
      <NumberRow
        label="Confidence threshold"
        value={sigil.confidenceThreshold}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sigil: { ...current.sigil, confidenceThreshold: value },
          }))
        }
      />
      {/* The label says what the number *does* once it crosses the line, because
          the reading card disappearing is the kind of change a user reads as a
          defect if the knob that caused it never mentioned it. Below 400 there is
          no beat left to show one in — see `READING_CARD_MIN_DELAY_MS`. */}
      <NumberRow
        label={
          sigil.autoCastDelayMs < READING_CARD_MIN_DELAY_MS
            ? 'Auto-cast delay (ms) — too short for a reading card'
            : 'Auto-cast delay (ms)'
        }
        value={sigil.autoCastDelayMs}
        min={0}
        max={3000}
        step={20}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sigil: { ...current.sigil, autoCastDelayMs: Math.round(value) },
          }))
        }
      />
      <NumberRow
        label="Field diameter"
        value={sigil.ringDiameter}
        min={160}
        max={340}
        step={4}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sigil: { ...current.sigil, ringDiameter: value },
          }))
        }
      />
      <NumberRow
        label="Shortest stroke (points)"
        value={sigil.minStrokePoints}
        min={2}
        max={24}
        step={1}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sigil: { ...current.sigil, minStrokePoints: Math.round(value) },
          }))
        }
      />
      <NumberRow
        label="Shortest stroke (px)"
        value={sigil.minStrokeLength}
        min={8}
        max={140}
        step={2}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sigil: { ...current.sigil, minStrokeLength: value },
          }))
        }
      />
    </>
  )
}

/**
 * 05B's section — the pad's own knobs, then the field's knobs *by composition*.
 *
 * The two casting directions share a field, so they share its knobs; what 05B
 * adds is a pad — a second way in, and a patch that stands on the host's card.
 * Both questions that follow ("what should the way in that is *not* the pad open?"
 * and "how loudly should the patch announce itself?") are questions only this
 * direction can be asked, so they cannot live in `SigilSettings` (they would
 * appear under plain Sigil, which has no pad) and they cannot be gated by a
 * `switch` on `config.surface` inside one (the panel is scoped by the registry,
 * not by conditions inside a section).
 *
 * So this is explicit extension, not a copy ("single-purpose functions, explicit
 * extension"): the pad's rows, then
 * `<SigilSettings />` verbatim. Deliberately hook-free, so the composition is
 * inspectable — `test/surface-settings.test.ts` calls it and walks the result to
 * fail the build if someone ever pastes the field's rows in here instead.
 */
export function SigilPadSettings() {
  return (
    <>
      <SigilPadOwnSettings />
      <SigilSettings />
    </>
  )
}

/**
 * The three knobs the pad direction has and the field alone does not: which
 * direction answers a right-click that missed the pad, and the two that decide
 * what the patch looks like sitting on someone's card.
 *
 * The face pair is here rather than in a "Pad appearance" section of its own
 * because the panel's unit is the *direction*, and a second heading inside one
 * direction's section is the beginning of seven directions' worth of sub-headings.
 */
function SigilPadOwnSettings() {
  const { config, updateConfig } = useContextMenuConfig()
  const sigilPad = config['sigil-pad']

  return (
    <>
      {/* Every direction is offered except 05B itself: as a secondary it would be
          the casting field with no pad to have come from, which is what `Sigil`
          already says. The options are built from the registry rather than typed
          out, so an eighth direction is offered here the moment it exists. */}
      <SelectRow
        label="Right-click opens"
        value={sigilPad.secondarySurface}
        options={SURFACES.filter((surface) => surface.id !== 'sigil-pad').map(
          (surface): [string, string] => [surface.id, `${surface.name} — ${surface.tagline}`],
        )}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            'sigil-pad': {
              ...current['sigil-pad'],
              // Parsed rather than cast: the value arrives as a string from a
              // `<select>`, and the schema is what decides whether it is a direction
              // ("Zod is the type source").
              secondarySurface: SurfaceIdSchema.parse(value),
            },
          }))
        }
      />
      {/* Same story one field over — the options are the descriptor list, so a
          sixth pattern is offered here without this file being opened. */}
      <SelectRow
        label="Pad background"
        value={sigilPad.background}
        options={PAD_BACKGROUNDS.map((background): [string, string] => [
          background.id,
          background.label,
        ])}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            'sigil-pad': { ...current['sigil-pad'], background: PadBackgroundSchema.parse(value) },
          }))
        }
      />
      {/* The label names the two things that go away, because "cast signalling"
          is our word for them and a user turning it off is entitled to know the
          patch stays. What it does not mention is the accessible name, which is
          not on this switch at all (see CastPad). */}
      <ToggleRow
        label="Show the cast mark and its label"
        checked={sigilPad.showSignal}
        onChange={(checked) =>
          updateConfig((current) => ({
            ...current,
            'sigil-pad': { ...current['sigil-pad'], showSignal: checked },
          }))
        }
      />
    </>
  )
}
