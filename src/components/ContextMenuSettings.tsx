/**
 * The configuration surface — every persisted knob, in one place a host can drop
 * into its own preferences screen.
 *
 * It is deliberately a *component*, not a documented shape you build a form
 * against: the config schema grows, and a settings UI that lives outside the
 * library goes stale the first time a knob is added. Everything here writes
 * through `updateConfig`, so a change lands in the same persist call as any other
 * (a surface switch, a learned usage bump) with no second write path.
 *
 * ── What it shows, and what it does not ─────────────────────────────────────
 * The panel is scoped to the direction you are actually using: the picker and
 * the settings that apply to every direction (Learning), then *one* direction's
 * own knobs — the active one's — and the sound palette only while a scored
 * direction is active. Seven directions' knobs at once meant someone on Orbit
 * scrolling past Whisper's grouping and Compass's wheel diameter to reach
 * nothing of their own.
 *
 * That is the *relevance* carve-out, not a breach of the rule: another
 * direction's knobs
 * are not an *unavailable* control, they are irrelevant to this context, which
 * that rule leaves to information architecture. What makes it legitimate is that
 * the picker is the first thing in the panel and switching direction reveals that
 * direction's knobs, so nothing here is unreachable. It does not extend to
 * disabled *commands*, which stay visible and explained on every surface.
 *
 * Which section belongs to which direction is a property of the direction
 * (`SURFACES[].settings`), not a `switch` in this file — see the registry.
 *
 * `scope` chooses how much of that is on screen: everything, or the active
 * direction's half alone for a shell that already carries a picker beside it. It
 * is one panel either way — the rows have exactly one spelling, and a shell that
 * drops the shared half owes its user another way to those knobs (see the prop).
 */
import { IconRefresh } from '@tabler/icons-react'
import { useContextMenuConfig, useContextMenuRuntime } from '../runtime/context.ts'
import { SURFACES_BY_ID } from '../surfaces/registry.ts'
import { ActionRow, NumberRow, Section, SelectRow, ToggleRow } from './SettingsRows.tsx'
import { SurfacePicker } from './SurfacePicker.tsx'

export type ContextMenuSettingsProps = {
  className?: string
  /**
   * Suppress the sound section outright, for a host that never wants the menu to
   * make a noise. Left `true`, the section still appears only under the two
   * scored directions — the ones that have anything to play.
   */
  showSound?: boolean
  /**
   * How much of the panel to render.
   *
   * `'all'` (the default) is the whole thing: the picker, what applies to every
   * direction, the active direction's own section, and Restore defaults. It is
   * what the dialog shell mounts and what a host's preferences screen wants.
   *
   * `'direction'` is the second half alone — the active direction's knobs, and
   * Sound under a scored one. It exists for a shell that *already* carries a
   * picker next to it and would otherwise show a second one two hundred pixels
   * from the first. The rows are identical either way (the panel is the
   * invariant): this chooses
   * how much of one panel is on screen, never a second spelling of a knob.
   *
   * Two conditions come with it, and a shell that cannot meet them wants
   * `'all'`. A picker has to be visible beside it, because "switch direction to
   * reveal that direction's knobs" is what makes showing one direction's
   * information architecture rather than a hidden control (rule 5 again). And
   * the shared knobs — Learning, Restore defaults — have to be reachable
   * somewhere else, which in the demo is the Configure dialog.
   */
  scope?: 'all' | 'direction'
}

export function ContextMenuSettings({
  className = '',
  showSound = true,
  scope = 'all',
}: ContextMenuSettingsProps) {
  const { config, resetConfig } = useContextMenuConfig()
  const { commands } = useContextMenuRuntime()

  const surface = SURFACES_BY_ID[config.surface]
  const DirectionSettings = surface.settings.Component
  const learnedCount = Object.keys(config.usage).length
  const isDirectionOnly = scope === 'direction'

  return (
    <div
      // Named so the reduced-motion rule in theme.css reaches the section swap in
      // *both* shells — the modal carries its own attribute, an inline mount has
      // nothing but this one.
      data-binp-context-menu-settings=""
      className={`flex flex-col gap-5 font-cm-sans text-[13px] text-cm-ink ${className}`}
    >
      {isDirectionOnly ? null : (
        <Section title="Direction" hint="Which surface opens on invocation.">
          <SurfacePicker />
        </Section>
      )}

      {isDirectionOnly ? null : (
        <LearningSection learnedCount={learnedCount} commandCount={commands.length} />
      )}

      {/* The direction-scoped half. Under `'all'` it takes its own plate, so the
          boundary between "applies to every direction" and "applies to this one"
          is legible rather than inferred from a heading; under `'direction'` the
          shell around it *is* that boundary, and a box drawn inside a column that
          holds nothing else is a frame around the whole column.

          Keyed on the direction so the swap re-animates in place: the picker sits
          above it — in this panel or, under `'direction'`, in the host's shell
          beside it — so a taller or shorter section can never move the control you
          switched with. */}
      <div
        key={config.surface}
        className={`animate-cm-section-in flex flex-col gap-5 ${
          isDirectionOnly ? '' : 'rounded-cm-lg border border-cm-rule bg-cm-bg-soft px-3.5 py-3'
        }`}
      >
        <Section title={surface.name} hint={surface.settings.hint}>
          {DirectionSettings === null ? undefined : <DirectionSettings />}
        </Section>

        {showSound && surface.scored ? <SoundSection /> : null}
      </div>

      {isDirectionOnly ? null : (
        <button
          type="button"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-cm-md border border-cm-rule px-3 py-2 text-[12.5px] font-medium hover:bg-cm-hover"
          onClick={resetConfig}
        >
          <IconRefresh size={14} />
          Restore defaults
        </button>
      )}
    </div>
  )
}

/**
 * What every direction is ranked by, so it sits outside the direction-scoped
 * plate — and, under `scope="direction"`, outside the panel entirely: a shell
 * showing one direction's knobs beside its own picker is not the place for a knob
 * that applies to all seven. It is a component rather than a block inline above
 * because that is what lets the scope choose, without a second copy of the rows.
 */
function LearningSection({
  learnedCount,
  commandCount,
}: {
  learnedCount: number
  commandCount: number
}) {
  const { config, updateConfig } = useContextMenuConfig()

  return (
    <Section
      title="Learning"
      hint="Running a command raises its weight — which is what Orbit sizes bubbles by and Whisper ranks with. Every direction is ranked by it."
    >
      <ToggleRow
        label="Learn from usage"
        checked={config.learnFromUsage}
        onChange={(checked) => updateConfig((current) => ({ ...current, learnFromUsage: checked }))}
      />
      <NumberRow
        label="Weight per invocation"
        value={config.orbit.learnIncrement}
        min={0}
        max={40}
        step={1}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            orbit: { ...current.orbit, learnIncrement: value },
          }))
        }
      />
      <NumberRow
        label="Weight ceiling"
        value={config.orbit.maxWeight}
        min={20}
        max={400}
        step={10}
        onChange={(value) =>
          updateConfig((current) => ({ ...current, orbit: { ...current.orbit, maxWeight: value } }))
        }
      />
      <ActionRow
        label="Learned commands"
        value={`${learnedCount} of ${commandCount}`}
        actionLabel="Forget usage"
        onAction={() => updateConfig((current) => ({ ...current, usage: {} }))}
      />
    </Section>
  )
}

/**
 * Sound belongs to the two casting directions and to nothing else, so it rides
 * inside the direction-scoped plate rather than standing as a section of its own:
 * on Orbit there is nothing to play, and a master gain with no cue behind it is
 * one more row between a user and their own knobs.
 */
function SoundSection() {
  const { config, updateConfig } = useContextMenuConfig()
  const { sfx } = useContextMenuRuntime()

  return (
    <Section title="Sound" hint="Synthesized in code — no audio files anywhere.">
      <ToggleRow
        label="Sound"
        checked={config.sound.enabled}
        onChange={(checked) =>
          updateConfig((current) => ({ ...current, sound: { ...current.sound, enabled: checked } }))
        }
      />
      <NumberRow
        label="Master gain"
        value={config.sound.masterGain}
        min={0}
        max={8}
        step={0.1}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sound: { ...current.sound, masterGain: value },
          }))
        }
      />
      <SelectRow
        label="Summon take"
        value={config.sound.summonTake}
        options={[
          ['bloom', 'bloom — partials stack upward'],
          ['tide', 'tide — one voice opens like an iris'],
        ]}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sound: { ...current.sound, summonTake: value === 'tide' ? 'tide' : 'bloom' },
          }))
        }
      />
      <SelectRow
        label="Cast take"
        value={config.sound.castTake}
        options={[
          ['collapse', 'collapse — the series lands'],
          ['comet', 'comet — the message leaves'],
        ]}
        onChange={(value) =>
          updateConfig((current) => ({
            ...current,
            sound: { ...current.sound, castTake: value === 'comet' ? 'comet' : 'collapse' },
          }))
        }
      />
      <ToggleRow
        label="Carrier bed"
        checked={config.sound.droneEnabled}
        onChange={(checked) =>
          updateConfig((current) => ({
            ...current,
            sound: { ...current.sound, droneEnabled: checked },
          }))
        }
      />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {(['summonBloom', 'summonTide', 'castCollapse', 'castComet', 'read', 'uncertain'] as const).map(
          (takeName) => (
            <button
              key={takeName}
              type="button"
              className="cursor-pointer rounded-full border border-cm-rule px-2.5 py-1 font-cm-mono text-[10.5px] hover:bg-cm-hover"
              onClick={() => sfx.preview(takeName)}
            >
              {takeName}
            </button>
          ),
        )}
      </div>
    </Section>
  )
}
