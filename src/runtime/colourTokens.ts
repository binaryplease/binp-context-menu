/**
 * Reading a `cm-*` colour token back out of the DOM, for the one thing in this
 * library that paints without CSS: the Sigil trail on its `<canvas>`.
 *
 * `getComputedStyle(element).getPropertyValue('--color-cm-cast-ink')` looks like
 * the answer and is not. A custom property's computed value is its *token
 * stream*, so a `light-dark()` pair comes back as the literal text
 * `light-dark(#ffffff, #101010)` — which `strokeStyle` cannot parse, and which
 * Canvas2D discards in silence, leaving whatever colour was set before (black,
 * on the first stroke). The same is true of a `color-mix()` token.
 *
 * What does work is asking the browser to resolve it: assign the reference to a
 * real colour property on a live element and read *that* back. The resolved
 * value of `color` is a used value, so it arrives as `rgb(…)` — already resolved
 * against that element's own `color-scheme`, which is what makes the trail
 * follow a theme switch without a second copy of the palette in JavaScript.
 *
 * It lives on its own because its dependency is the DOM and the token layer, not
 * the surface that happens to need it: a unit of code lives where its
 * dependencies are.
 */

/**
 * Resolve one colour reference — `var(--color-cm-cast-ink)`, or any CSS colour —
 * against `element`, and hand back something Canvas2D can paint with.
 *
 * `element` has to be in the document for its custom properties and
 * `color-scheme` to be in scope; the canvas being painted is the natural choice.
 * Its own inline `color` is restored before returning, so the probe leaves no
 * trace on the element it borrowed.
 */
export function resolveColourToken(element: HTMLElement, reference: string): string {
  const previousInlineColour = element.style.color
  element.style.color = reference
  const resolved = window.getComputedStyle(element).color
  element.style.color = previousInlineColour
  return resolved
}

/**
 * Resolve a whole palette in one pass, keeping the caller's names.
 *
 * Each read forces a style recalculation, so callers resolve once per stroke
 * rather than once per frame — a theme switch between two strokes is picked up,
 * and a 120 Hz pointer stream is not charged for it.
 */
export function resolveColourTokens<TokenName extends string>(
  element: HTMLElement,
  references: Record<TokenName, string>,
): Record<TokenName, string> {
  const resolved = {} as Record<TokenName, string>
  for (const name of Object.keys(references) as TokenName[]) {
    resolved[name] = resolveColourToken(element, references[name])
  }
  return resolved
}
