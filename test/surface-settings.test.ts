/**
 * The settings panel shows *one* direction's knobs — the active one's — so a
 * direction whose section nobody declared has knobs that are unreachable from the
 * UI entirely. That is the bug this file exists to fail on: Strata's lane width
 * and Orbit's rings were fully specified in the schema and had no UI at all,
 * because the panel carried a hand-written list of three sections and the registry
 * carried seven directions.
 *
 * Declaring the section on the registry entry is what makes the two lists one
 * list; these tests are the guard third of one descriptor, one wrapper, one
 * guard.
 */
import { describe, expect, test } from 'bun:test'
import type { ReactElement } from 'react'
import { SURFACES } from '../src/surfaces/registry.ts'
import { SigilPadSettings, SigilSettings } from '../src/surfaces/surfaceSettings.tsx'
import { defaultConfig, SURFACE_IDS } from '../src/schema/config.ts'

describe('every direction declares what the settings panel shows for it', () => {
  test('the registry covers all seven, once each', () => {
    expect(SURFACES.map((surface) => surface.id)).toEqual([...SURFACE_IDS])
  })

  test('each one explains its section in a line of copy', () => {
    // The hint is what a knob-less direction shows *instead* of an empty box, so
    // it is required even when there is no section component behind it.
    for (const surface of SURFACES) {
      expect(surface.settings.hint.length, `${surface.id} settings hint`).toBeGreaterThan(20)
    }
  })

  test('a direction with a config sub-object has somewhere to turn it', () => {
    const config = defaultConfig()
    for (const surface of SURFACES) {
      if (!Object.hasOwn(config, surface.id)) continue
      expect(surface.settings.Component, `${surface.id} has knobs but no section`).not.toBeNull()
    }
  })

  test('the only direction with no section is one with no knobs', () => {
    const config = defaultConfig()
    const knobless = SURFACES.filter((surface) => surface.settings.Component === null)
    // Original, and nothing else: every other direction owns a sub-object.
    expect(knobless.map((surface) => surface.id)).toEqual(['original'])
    for (const surface of knobless) {
      expect(Object.hasOwn(config, surface.id), `${surface.id} config sub-object`).toBe(false)
    }
  })

  test('sound belongs to the two casting directions and to nothing else', () => {
    // What the panel gates the Sound section on. A third scored direction adds
    // itself here rather than to a condition inside the panel.
    expect(SURFACES.filter((surface) => surface.scored).map((surface) => surface.id)).toEqual([
      'sigil',
      'sigil-pad',
    ])
  })

  test('the two casting directions share one section, not a copy of it', () => {
    const sigil = SURFACES.find((surface) => surface.id === 'sigil')
    const sigilPad = SURFACES.find((surface) => surface.id === 'sigil-pad')
    // Same field, same knobs. 05B's section is not *identical* to Sigil's, because
    // 05B has one knob Sigil cannot have — which direction a right-click opens,
    // there being no right-click path that misses the pad on a direction with no
    // pad. So the invariant is composition: the field's rows are one component,
    // and 05B's section renders it rather than restating it.
    expect(sigil?.settings.Component).toBe(SigilSettings)
    expect(sigilPad?.settings.Component).toBe(SigilPadSettings)

    // Hook-free by design (see SigilPadSettings), so the composition can be walked
    // here without a renderer: paste the field's rows in instead of the component
    // and this fails.
    const composed = SigilPadSettings()
    const children = (composed.props as { children: ReactElement[] }).children
    expect(children.map((child) => child.type)).toContain(SigilSettings)
  })
})
