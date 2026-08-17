/**
 * Which direction answers *this* invocation.
 *
 * For six of the seven the answer is `config.surface` and there is nothing to
 * decide. 05B is the one direction with two ways in — the cast pad, where the
 * press is already the first millimetre of the stroke, and every other trigger a
 * host armed (right-click on the card around the pad, the ⋮ button, `Shift+F10`)
 * — and a user may want those two to open different things: the field for the
 * hand that has learned its runes, a list for the one that has not.
 *
 * It is a function rather than a branch inside `open` because it is the *rule*,
 * and the rule has to be one thing: `MenuLayer` renders whatever the invocation
 * says, `CastPad` declares where its press came from, and neither gets a vote.
 * A second copy of this decision is how the ⋮ button ends up opening a different
 * surface from a right-click two pixels away from it.
 */
import type { ContextMenuConfig, SurfaceId } from '../schema/config.ts'

/**
 * Where an invocation came from. The cast pad is its own source because it is the
 * only trigger whose *identity* changes the answer; everything else — a
 * right-click, a menu key, a host's own button — is a plain trigger and gets the
 * same treatment, so a host never has to classify its own controls.
 */
export type InvocationSource = 'cast-pad' | 'trigger'

export function invocationSurfaceOf(
  config: ContextMenuConfig,
  source: InvocationSource,
): SurfaceId {
  if (config.surface !== 'sigil-pad' || source === 'cast-pad') return config.surface
  // Resolves to the casting field by default, which is what 05B did before this
  // knob existed — the pad direction only *adds* a way in, it never took the
  // right-click away.
  return config['sigil-pad'].secondarySurface
}
