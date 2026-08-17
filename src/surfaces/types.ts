/**
 * What a surface is, from the layer's point of view.
 *
 * A surface receives the invocation and nothing else — commands, kinds, config,
 * sound and the run path all come from the runtime context. That is deliberate:
 * a surface that had to be *handed* the command list could be handed a different
 * one, and the seven would drift.
 */
import type { ComponentType } from 'react'
import type { SurfaceId } from '../schema/config.ts'
import type { Invocation } from '../runtime/context.ts'

export type SurfaceComponentProps = {
  invocation: Invocation
}

/**
 * A direction's own knobs, as the settings panel needs them.
 *
 * The panel shows one of these at a time — the active direction's — so the
 * mapping from direction to section is declared on the direction (see
 * `SurfaceDefinition.settings`), never as a `switch` inside the panel: a
 * direction added to the registry without one would otherwise appear in the
 * picker with its knobs orphaned.
 */
export type SurfaceSettingsSection = {
  /** One line under the heading: what this direction's knobs change. */
  hint: string
  /**
   * The rows, composed from the shared settings vocabulary. `null` for a
   * direction that owns no knobs — the panel says so in a line of copy rather
   * than rendering an empty box.
   */
  Component: ComponentType | null
}

export type SurfaceDefinition = {
  id: SurfaceId
  /** Human name, used by settings UIs and by the demo's direction list. */
  name: string
  /** One line: what this direction *is*. */
  tagline: string
  /** The pitch — why this direction exists and what it buys. */
  description: string
  /** Dim the board behind the surface. */
  scrim: boolean
  /**
   * This direction is scored, so the sound palette is *its* configuration — the
   * settings panel shows the Sound section only while a scored direction is
   * active. Nothing else in the library makes a sound.
   */
  scored: boolean
  /** The knobs the settings panel shows while this direction is the active one. */
  settings: SurfaceSettingsSection
  Component: ComponentType<SurfaceComponentProps>
}
