/**
 * 05B's defining affordance — the ruled patch of parchment at the end of a card.
 *
 * Direction 05 still costs a right-click before the ritual begins. Here the
 * press *is* the beginning of the stroke: pointerdown opens the field and starts
 * the ink in the same instant, the pad keeps pointer capture so every subsequent
 * move is forwarded into the field's stroke engine, and you draw straight out
 * across the board. Summon and trace collapse into one gesture, and the pad
 * marks which object you are casting on — intent and target chosen in one motion.
 *
 * A press with no drag degrades to plain "open the field", which is exactly
 * direction 05's starting state.
 *
 * **How loudly it says all that is the user's, not ours.** This is the one piece
 * of the library that stands on a host's own card whether or not a menu is ever
 * invoked, so what it announces is a knob rather than a constant: the patch's
 * grain is `config['sigil-pad'].background` (`padBackgrounds.ts` holds the list),
 * and the traced mark with its caption — the part that *teaches* — is
 * `showSignal`, which a hand that has learned its runes can put away. Neither
 * touches the accessible name, the pointer behaviour, or any interaction state.
 *
 * **Why this is absent rather than disabled on the other six surfaces.** Hiding
 * is correct only when it is about *relevance*, not *availability*: a control is
 * omitted when the feature does not exist in the current context at all, as
 * opposed to an available action whose precondition is unmet.
 * A cast pad under Whisper is not a temporarily-blocked cast — Whisper has no
 * casting; the pad would be a control for a feature that context never provides.
 * The direction switcher is where that choice lives, and it explains itself.
 */
import { useRef } from 'react'
import { useContextMenuRuntime } from '../runtime/context.ts'
import { padBackgroundClassName } from './padBackgrounds.ts'

export type CastPadProps = {
  /** Passed through to `onRun` — the object the cast acts on. */
  target?: unknown
  /** Named in the accessible label, so the pad says *what* it casts on. */
  targetLabel?: string
  className?: string
  /**
   * The word under the mark — the host's wording for what this patch casts.
   * Drawn only while the user leaves `config['sigil-pad'].showSignal` on; the
   * accessible name above carries the same meaning either way.
   */
  label?: string
}

export function CastPad({ target = null, targetLabel, className = '', label = 'cast' }: CastPadProps) {
  const { config, open, strokeChannel } = useContextMenuRuntime()
  const padRef = useRef<HTMLButtonElement>(null)

  if (config.surface !== 'sigil-pad') return null

  const { background, showSignal } = config['sigil-pad']

  // The accessible name is *not* under the signalling knob. Turning the mark and
  // the caption off is a sighted user saying "I know what this patch is"; a
  // screen-reader user never had the mark or the caption in the first place, and
  // the name is the whole of what they do have.
  const accessibleName =
    targetLabel === undefined
      ? 'Cast a glyph — press and draw, or activate to open the casting field'
      : `Cast a glyph on “${targetLabel}” — press and draw, or activate to open the casting field`

  function openField(seededStroke: boolean) {
    const pad = padRef.current
    if (pad === null) return null
    const box = pad.getBoundingClientRect()
    open({
      anchor: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      target,
      // The pad is the one trigger that always means "the casting field", whatever
      // a plain right-click on the card around it has been pointed at
      // (`invocationSurface.ts`). Saying so here, rather than letting the layer
      // infer it from `padOrigin`, is what keeps that a rule instead of a habit.
      source: 'cast-pad',
      padOrigin: { left: box.left, top: box.top, width: box.width, height: box.height },
      seededStroke,
    })
    return box
  }

  return (
    <button
      ref={padRef}
      type="button"
      data-binp-context-menu-cast-pad=""
      aria-label={accessibleName}
      // Painted in the pad's own three tokens, which are neutral by default: this
      // sits on the *host's* card, not on the library's field, so it reads as a
      // ruled patch of that card rather than as our accent stamped across every
      // row of someone else's board. A host that wants it louder re-points
      // `--color-cm-pad-*` (see theme.css). The focus ring stays the shared
      // accent one — that is the library's focus treatment everywhere, and a
      // neutral pad is no reason for a keyboard user to lose it ("interaction
      // state is a shared token").
      className={[
        'group absolute top-2.5 right-2.5 bottom-2.5 flex w-[106px] cursor-crosshair touch-none flex-col items-center justify-center gap-[7px] rounded-cm-md border border-dashed border-cm-pad-edge transition-[border-color,box-shadow]',
        // Fill and grain are two layers on purpose: the fill is the pad's colour
        // and never moves, the grain is the configured pattern painted over it.
        'bg-cm-pad-fill',
        padBackgroundClassName(background),
        'hover:border-solid hover:border-cm-pad-ink/55 hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-cm-pad-ink)_11%,transparent)]',
        'focus-visible:border-solid focus-visible:border-cm-pad-ink/55 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cm-accent',
        className,
      ].join(' ')}
      // No stroke to seed from a keyboard, so activation just opens the field
      // over this card — the same place the pointer path would have started.
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return
        keyboardEvent.preventDefault()
        openField(false)
      }}
      onClick={(mouseEvent) => mouseEvent.stopPropagation()}
      onPointerDown={(pointerEvent) => {
        if (pointerEvent.button !== 0) return
        pointerEvent.preventDefault()
        pointerEvent.stopPropagation()
        if (openField(true) === null) return

        // The stroke begins before the field exists. The channel buffers it and
        // replays it the moment the field subscribes — see strokeChannel.ts.
        strokeChannel.emit({
          type: 'begin',
          point: { x: pointerEvent.clientX, y: pointerEvent.clientY },
        })

        const pad = pointerEvent.currentTarget
        pad.setPointerCapture(pointerEvent.pointerId)
        const forwardMove = (moveEvent: PointerEvent) =>
          strokeChannel.emit({ type: 'extend', point: { x: moveEvent.clientX, y: moveEvent.clientY } })
        const finish = () => {
          pad.removeEventListener('pointermove', forwardMove)
          pad.removeEventListener('pointerup', finish)
          pad.removeEventListener('pointercancel', finish)
          strokeChannel.emit({ type: 'end' })
        }
        pad.addEventListener('pointermove', forwardMove)
        pad.addEventListener('pointerup', finish)
        pad.addEventListener('pointercancel', finish)
      }}
    >
      {/* The signalling pair — the traced glyph and the word under it — is either
          both or neither: the mark without its caption is a decoration nobody can
          read, and the caption without its mark is a label on an empty box. Off,
          the patch keeps its edge, its grain and every interaction state; what it
          loses is the sentence it was repeating to someone who has learned it. */}
      {!showSignal ? null : (
        <>
          <svg
            viewBox="0 0 40 24"
            className="h-6 w-10 overflow-visible text-cm-pad-ink opacity-65 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <path
              d="M2 19 C 9 19, 8 5, 16 5 S 25 19, 31 8"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={78}
              className="group-hover:animate-cm-trace group-focus-visible:animate-cm-trace"
            />
            <path
              d="M31 8 l-1.5 5 M31 8 l4.5 2.6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-cm-mono text-[9px] tracking-[0.15em] text-cm-pad-ink uppercase opacity-85 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {label}
          </span>
        </>
      )}
    </button>
  )
}
