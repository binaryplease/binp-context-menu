/**
 * 05 · Sigil — you don't open a menu, you cast one.
 *
 * There is no list, no wheel, nothing to scan. A command is whatever stroke you
 * gave it; you trace that over the object and the system reads your intent. Draw
 * from memory, or consult the Lexicon until the runes are yours. The menu stops
 * being something you look at and becomes something you speak.
 *
 * The alphabet is *the user's*. Nothing arrives bound: the Lexicon lists every
 * command with an empty slot beside it, and a rune is drawn on the field or taken
 * from the palette. The one exception is the library's own — a single stroke
 * from the top straight down, which closes the field, and which has to exist
 * before the alphabet does or a first-run field has no way out.
 *
 * 05B (Sigil Pad) is *this same field*, reached without the click first: the pad
 * on a card begins the stroke on pointerdown and the field picks it up mid-motion
 * through the stroke channel. One lifecycle, two entry surfaces — not two copies
 * of a stroke engine — one primitive per interaction class.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  IconArrowLeft,
  IconPencil,
  IconPlus,
  IconTrash,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react'
import { DISMISS_GLYPH, glyphPath, glyphPointsFromStroke, type Glyph } from '../lib/glyphs.ts'
import { lexiconPlacement, type LexiconPlacement } from '../lib/lexiconLayout.ts'
import {
  pathLength,
  prepareTemplate,
  recognize,
  type StrokePoint,
} from '../lib/unistroke.ts'
import { shortLabelOf, type Command } from '../schema/command.ts'
import { READING_CARD_MIN_DELAY_MS } from '../schema/config.ts'
import { CommandButton } from '../components/CommandButton.tsx'
import { CommandLabel } from '../components/CommandVisuals.tsx'
import { hoverToneClass, toneStyleOf } from '../components/commandTone.ts'
import { resolveColourTokens } from '../runtime/colourTokens.ts'
import { useContextMenuRuntime } from '../runtime/context.ts'
import { runeDisplayNameOf, type ResolvedRune } from '../runtime/runes.ts'
import type { SurfaceComponentProps } from './types.ts'

/**
 * A rune the field can read. `command: null` is the library's own dismiss rune —
 * it casts nothing, it closes the field, and it is the only rune that is here
 * without somebody having bound it.
 */
type FieldRune = { glyph: Glyph; command: Command | null }

type Reading = {
  glyph: Glyph
  command: Command
  confidence: number
  alternative: { glyph: Glyph; command: Command } | null
}

/**
 * A rune being bound — the command it is for, and the stroke drawn for it so far.
 *
 * `points: null` is the state before the first stroke: the panel is asking for
 * one, and the whole field is the input. Non-null is a stroke waiting to be kept
 * or redrawn — never written to the config until the user says so, because a
 * rune is muscle memory and a slip should not overwrite one silently.
 */
type RuneDraft = { command: Command; points: [number, number][] | null }

/**
 * Above this, two runes are close enough that the recognizer will pick between
 * them on stroke noise. It is the confidence a *draft* scores against the runes
 * already on the field, so it is the same number the field itself would compute
 * a second later — the warning cannot disagree with the behaviour it predicts.
 */
const RUNE_COLLISION_CONFIDENCE = 0.72

/**
 * The trail's three inks, as token references.
 *
 * The trail is the one thing in this library painted imperatively, so these
 * cannot be Tailwind utilities — but they are still tokens, resolved off the
 * canvas itself by `resolveColourTokens` (see there for why reading the custom
 * property directly does not work). A host re-themes the ink the same way it
 * re-themes everything else.
 */
const TRAIL_INK_TOKENS = {
  ink: 'var(--color-cm-cast-trail)',
  glow: 'var(--color-cm-cast-glow)',
  core: 'var(--color-cm-cast-ink)',
}

export function SigilSurface({ invocation }: SurfaceComponentProps) {
  const {
    commands,
    glyphs,
    runeFor,
    bindRune,
    unbindRune,
    runCommand,
    config,
    updateConfig,
    close,
    sfx,
    strokeChannel,
  } = useContextMenuRuntime()
  const sigil = config.sigil
  const soundEnabled = config.sound.enabled

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailInkRef = useRef<Record<keyof typeof TRAIL_INK_TOKENS, string> | null>(null)
  const pointsRef = useRef<StrokePoint[]>([])
  const lastPointRef = useRef<StrokePoint | null>(null)
  const drawingRef = useRef(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [reading, setReading] = useState<Reading | null>(null)
  const [castProgress, setCastProgress] = useState(0)
  const [draft, setDraft] = useState<RuneDraft | null>(null)

  /**
   * True while this open is still *a cast in progress* rather than a field you
   * have arrived at — the 05B path where the press on the pad was already the
   * first millimetre of the stroke.
   *
   * It matters because the two are not the same surface doing the same job. A
   * cast is aimed at the object under the pad, and the veil's blur plus the
   * alphabet laid across it hide exactly that object, at the one moment the hand
   * is still moving over it. So while a direct cast is live the field is a clear
   * sheet: no blur, no Lexicon, just the trail over the board it acts on.
   *
   * It seeds from `invocation.seededStroke` and drops the first time the field
   * *stands* — a tap on the pad, a twitch, a stroke nothing could read. That is
   * what makes a pad **click** the untouched case: the click degrades to plain
   * "open the field" (see `CastPad`), so blur and Lexicon fade in a beat later,
   * and every other way in never had this true to begin with.
   */
  const [directCast, setDirectCast] = useState(invocation.seededStroke)

  // What the field can read: the way out, plus every command someone has bound a
  // rune to. A command with no rune is not a candidate — matching a shape nobody
  // drew would be an unrecognizable failure — but it is still in the Lexicon,
  // one press from having one.
  const boundRunes = useMemo(() => {
    const bound: FieldRune[] = []
    for (const command of commands) {
      const resolved = runeFor(command)
      if (resolved !== null) bound.push({ glyph: resolved.glyph, command })
    }
    return bound
  }, [commands, runeFor])

  const templates = useMemo(
    () =>
      [{ glyph: DISMISS_GLYPH, command: null } as FieldRune, ...boundRunes].map((fieldRune) =>
        prepareTemplate(fieldRune, fieldRune.glyph.points.map(([x, y]) => ({ x, y }))),
      ),
    [boundRunes],
  )

  useEffect(() => {
    sfx.summon()
    sfx.ambientStart()
  }, [sfx])

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const context = canvas.getContext('2d')
    if (context === null) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    const points = pointsRef.current
    if (points.length < 2) return
    // Resolved once when the stroke began, not per frame: each read forces a
    // style recalculation, and a pointer stream would pay for it sixty times a
    // second for a value that cannot change mid-gesture.
    const ink = trailInkRef.current ?? resolveColourTokens(canvas, TRAIL_INK_TOKENS)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const strokePath = () => {
      context.beginPath()
      context.moveTo(points[0]!.x, points[0]!.y)
      for (let index = 1; index < points.length; index++) {
        context.lineTo(points[index]!.x, points[index]!.y)
      }
      context.stroke()
    }
    // Two passes: a wide glowing ink under a thin bright core. One pass reads as a
    // line; two read as light.
    context.strokeStyle = ink.ink
    context.shadowColor = ink.glow
    context.shadowBlur = 20
    context.lineWidth = 9
    strokePath()
    context.shadowBlur = 0
    context.strokeStyle = ink.core
    context.lineWidth = 2.5
    strokePath()
    const head = points[points.length - 1]!
    context.beginPath()
    context.arc(head.x, head.y, 5, 0, Math.PI * 2)
    context.shadowColor = ink.glow
    context.shadowBlur = 22
    context.fillStyle = ink.core
    context.fill()
    context.shadowBlur = 0
  }, [])

  const clearInk = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const finishStroke = useCallback(() => {
    const points = pointsRef.current
    if (points.length < sigil.minStrokePoints || pathLength(points) < sigil.minStrokeLength) {
      // A tap or a twitch is not a glyph. Wipe it and let the field stand — and a
      // field that stands is a field, not a cast in flight, so it takes its blur
      // and its alphabet back. This is the path a plain click on the pad ends on.
      window.setTimeout(clearInk, 200)
      setDirectCast(false)
      return
    }
    window.setTimeout(clearInk, 260)

    // Binding a rune is the same gesture as casting one, deliberately: you learn
    // the stroke by making it where you will make it, at the size you will make
    // it. Only what happens on release differs.
    if (draft !== null) {
      setDraft({ command: draft.command, points: glyphPointsFromStroke(points) })
      sfx.read()
      return
    }

    const scored = recognize(points, templates)
    const best = scored[0]
    // Nothing to read against — the field stands, so it stops being a cast.
    if (best === undefined) {
      setDirectCast(false)
      return
    }
    if (best.meta.command === null) {
      // The way out is never *offered*: an uncertain dismiss is a redraw, not a
      // card asking whether you meant to leave. Anything else would put "close"
      // in front of someone whose stroke was closest to it by accident.
      if (best.confidence < sigil.confidenceThreshold) {
        sfx.uncertain()
        setDirectCast(false)
        return
      }
      sfx.cast()
      close()
      return
    }
    const runnerUp = scored.slice(1).find((candidate) => candidate.meta.command !== null)
    setReading({
      glyph: best.meta.glyph,
      command: best.meta.command,
      confidence: best.confidence,
      alternative:
        runnerUp === undefined || runnerUp.meta.command === null
          ? null
          : { glyph: runnerUp.meta.glyph, command: runnerUp.meta.command },
    })
  }, [
    clearInk,
    close,
    draft,
    sfx,
    sigil.confidenceThreshold,
    sigil.minStrokeLength,
    sigil.minStrokePoints,
    templates,
  ])

  // ── the stroke engine — the field's own pointer handlers and the cast pad are
  //    two entry surfaces onto this one lifecycle ─────────────────────────────
  const beginStroke = useCallback(
    (point: StrokePoint) => {
      drawingRef.current = true
      setIsDrawing(true)
      setReading(null)
      pointsRef.current = [point]
      lastPointRef.current = point
      // Re-read at the top of every stroke rather than once on mount, so a theme
      // switch between two casts reaches the ink.
      const canvas = canvasRef.current
      if (canvas !== null) trailInkRef.current = resolveColourTokens(canvas, TRAIL_INK_TOKENS)
      sfx.traceStart()
    },
    [sfx],
  )

  const extendStroke = useCallback(
    (point: StrokePoint) => {
      if (!drawingRef.current) return
      const previous = lastPointRef.current
      const strokeSpeed = previous === null ? 0 : Math.hypot(point.x - previous.x, point.y - previous.y)
      lastPointRef.current = point
      pointsRef.current.push(point)
      paint()
      sfx.traceMove(strokeSpeed)
    },
    [paint, sfx],
  )

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return
    drawingRef.current = false
    setIsDrawing(false)
    sfx.traceEnd()
    finishStroke()
  }, [finishStroke, sfx])

  useEffect(
    () =>
      strokeChannel.subscribe((event) => {
        if (event.type === 'begin') beginStroke(event.point)
        else if (event.type === 'extend') extendStroke(event.point)
        else endStroke()
      }),
    [beginStroke, endStroke, extendStroke, strokeChannel],
  )

  // ── the reading → cast ────────────────────────────────────────────────────
  const isConfident = reading !== null && reading.confidence >= sigil.confidenceThreshold
  // A reading of a command that cannot run right now is a *reading*, not a cast:
  // the card names it and explains itself, and the timer never starts, because a
  // progress bar counting down to nothing is the "unavailable is never invisible"
  // failure with a stopwatch.
  const willCast = isConfident && reading.command.disabledReason === null

  /**
   * Whether this reading gets a card.
   *
   * A countdown shorter than `READING_CARD_MIN_DELAY_MS` cannot be read in the time
   * it is up, so under that the field casts with no card at all and the whole
   * gesture is stroke → cast. The cue still fires (`sfx.read`), which is the
   * feedback that survives at that speed.
   *
   * The gate is on the *countdown*, not on the reading: `!willCast` — an uncertain
   * reading offering two candidates, or a command explaining why it cannot run —
   * always gets its card, at any delay. Neither of those is on a timer, and the
   * second is an "unavailable is never invisible" explanation, which a knob about
   * speed must not be able to switch off.
   */
  const showReadingCard =
    reading !== null &&
    draft === null &&
    (!willCast || sigil.autoCastDelayMs >= READING_CARD_MIN_DELAY_MS)

  // A reading that is *not* going to cast — two candidates to choose between, or a
  // command that explains why it cannot run — has turned the field into a place
  // with a decision in it, which is the other half of "the field stands". The
  // confident reading keeps the direct cast, because it is still one gesture
  // finishing: it counts down and closes, and blurring the board for that beat
  // would be a flash of chrome on the way out.
  useEffect(() => {
    if (reading !== null && !willCast) setDirectCast(false)
  }, [reading, willCast])

  useEffect(() => {
    if (reading === null) return
    if (reading.confidence >= sigil.confidenceThreshold) sfx.read()
    else sfx.uncertain()
  }, [reading, sfx, sigil.confidenceThreshold])

  const castReading = useCallback(
    (command: Command) => {
      sfx.cast()
      runCommand(command)
    },
    [runCommand, sfx],
  )

  useEffect(() => {
    if (reading === null || !willCast) return
    setCastProgress(0)
    const startProgress = window.requestAnimationFrame(() => setCastProgress(1))
    const castTimer = window.setTimeout(() => castReading(reading.command), sigil.autoCastDelayMs)
    return () => {
      window.cancelAnimationFrame(startProgress)
      window.clearTimeout(castTimer)
    }
  }, [castReading, reading, sigil.autoCastDelayMs, willCast])

  // ── binding a rune ────────────────────────────────────────────────────────
  const startBinding = useCallback(
    (command: Command) => {
      setReading(null)
      clearInk()
      setDraft({ command, points: null })
    },
    [clearInk],
  )

  const keepDraft = useCallback(() => {
    if (draft === null || draft.points === null) return
    bindRune(draft.command.id, { name: '', points: draft.points })
    sfx.cast()
    setDraft(null)
  }, [bindRune, draft, sfx])

  const takeGlyph = useCallback(
    (glyph: Glyph) => {
      if (draft === null) return
      bindRune(draft.command.id, { name: glyph.name, points: glyph.points })
      sfx.cast()
      setDraft(null)
    },
    [bindRune, draft, sfx],
  )

  const dropRune = useCallback(() => {
    if (draft === null) return
    unbindRune(draft.command.id)
    sfx.uncertain()
    setDraft(null)
  }, [draft, sfx, unbindRune])

  /**
   * The rune a draft would be confused with, if any — scored against the field's
   * own templates, minus the command being bound (redrawing a rune as itself is
   * not a collision).
   */
  const draftCollision = useMemo(() => {
    if (draft === null || draft.points === null) return null
    const others = templates.filter(
      (template) => template.meta.command?.id !== draft.command.id,
    )
    const [closest] = recognize(
      draft.points.map(([x, y]) => ({ x, y })),
      others,
    )
    if (closest === undefined || closest.confidence < RUNE_COLLISION_CONFIDENCE) return null
    return closest.meta.command === null ? 'the rune that closes the field' : closest.meta.command.label
  }, [draft, templates])

  /** Palette runes not already spoken for by some *other* command. */
  const takenGlyphNames = useMemo(() => {
    const taken = new Map<string, Command>()
    for (const fieldRune of boundRunes) {
      if (fieldRune.glyph.name === '' || fieldRune.command === null) continue
      taken.set(fieldRune.glyph.name, fieldRune.command)
    }
    return taken
  }, [boundRunes])

  const anchor = invocation.anchor
  const ringSize = sigil.ringDiameter
  const padOrigin = invocation.padOrigin

  /**
   * Where the Lexicon lays itself out — under the ring, centred on the same point
   * the stroke starts from.
   *
   * It was a card pinned to one side of the viewport, which made it a panel the
   * field had opened: it sat in the drawing area, it had to be told which half of
   * the board to vacate, and its plate was the loudest object on the surface. Under
   * the ring it is the alphabet laid out beneath the place you cast, in up to three
   * columns and with no plate at all — see `lexiconLayout.ts` for the three
   * decisions that placement forces.
   *
   * `padOrigin` no longer steers it. The pad's stroke leaves the card travelling
   * right and the Lexicon is now below, not beside, so there is nothing for it to
   * get out of the way of.
   */
  const lexiconBox = lexiconPlacement({
    anchorX: anchor.x,
    anchorY: anchor.y,
    ringSize,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    itemCount: commands.length,
    compact: draft !== null,
  })

  /**
   * The field's one line of instruction, and it has three things to say: what a
   * stroke will do right now, that a first-run field has no alphabet yet, and
   * where an alphabet comes from. A user who has bound nothing and is told to
   * "trace a glyph" has been handed a blank field and no way off it.
   */
  const prompt =
    draft !== null
      ? { lead: `a rune for “${shortLabelOf(draft.command)}”`, tail: 'release to keep it' }
      : boundRunes.length === 0
        ? { lead: 'no runes bound yet', tail: sigil.showLexicon ? 'draw one in the Lexicon' : 'turn the Lexicon on to bind one' }
        : { lead: directCast ? 'keep drawing' : 'trace a glyph', tail: 'release to cast' }

  return (
    <div
      // The veil is a token pair, so the field stays a *deep* field on a dark
      // board instead of a faint grey wash the runes and the trail disappear into.
      //
      // The blur is 7px and not the 2px it was, because the veil now has to carry
      // the whole alphabet. When the only thing set on it was one line of prose, a
      // board reading through was atmosphere; with the Lexicon on the field, the
      // host's own headings were interleaving with the command labels. Blur rather
      // than a deeper wash: in the light palette the labels are *dark* ink, so
      // darkening what is behind them costs the contrast it was meant to buy —
      // what needs to go is the competing text, not the light.
      //
      // And it is 0 for the length of a direct cast, because that argument runs the
      // other way there: the veil carries no alphabet during one, and the thing
      // behind it is the object the stroke is aimed at. Blurring the card you are
      // casting on is the cost with none of the benefit. It is a transition and not
      // a swap so the pad's *click* — which degrades to the standing field — reads
      // as the veil settling rather than as a flash.
      className={`absolute inset-0 animate-cm-scrim-in cursor-crosshair touch-none bg-[radial-gradient(130%_130%_at_50%_42%,var(--color-cm-cast-veil-near),var(--color-cm-cast-veil-far))] font-cm-sans transition-[backdrop-filter] duration-200 ${
        directCast ? 'backdrop-blur-[0px]' : 'backdrop-blur-[7px]'
      }`}
      onPointerDown={(pointerEvent) => {
        if (pointerEvent.button !== 0) return
        pointerEvent.preventDefault()
        beginStroke({ x: pointerEvent.clientX, y: pointerEvent.clientY })
        pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId)
      }}
      onPointerMove={(pointerEvent) =>
        extendStroke({ x: pointerEvent.clientX, y: pointerEvent.clientY })
      }
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    >
      {/* 05B: echo the pad the stroke was launched from, so the gesture stays
          anchored to the object it acts on once the field dims the board. */}
      {padOrigin === null ? null : (
        <div
          className="pointer-events-none absolute animate-cm-origin-in rounded-cm-md border border-cm-cast-rune/80 shadow-cm-cast-origin"
          style={{
            left: padOrigin.left,
            top: padOrigin.top,
            width: padOrigin.width,
            height: padOrigin.height,
          }}
        />
      )}

      <CastingRing x={anchor.x} y={anchor.y} size={ringSize} dimmed={isDrawing} />

      <div
        // The field's one line of prose, and the only thing on it that is *read*
        // rather than traced — so it takes the ink token and the accent, both of
        // which invert, rather than the field's own fixed light ink. The veil is
        // a wash, not an opaque plate: white here was unreadable on a light board.
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[12.5px] tracking-[0.02em] whitespace-nowrap text-cm-ink transition-opacity [text-shadow:0_1px_10px_var(--color-cm-cast-shadow)]"
        // Its side comes from the Lexicon's placement, because it is the same
        // question about the same ring — see `promptTop`.
        style={{ left: anchor.x, top: lexiconBox.promptTop, opacity: isDrawing ? 0 : 1 }}
      >
        {prompt.lead} ·{' '}
        <b className="font-cm-mono text-[11px] font-medium text-cm-cast-accent">{prompt.tail}</b>
      </div>

      {/* Muting is a persisted preference, not a per-open toggle — the field
          remembers you did not want to hear it. */}
      <button
        type="button"
        className={`absolute top-6 left-6 flex cursor-pointer items-center gap-2 rounded-full border border-cm-cast-plate-edge bg-cm-cast-plate py-2 pr-3.5 pl-3 text-xs font-semibold shadow-cm-cast-plate backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent ${
          soundEnabled ? 'text-cm-ink-2' : 'text-cm-ink-4'
        }`}
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onClick={(mouseEvent) => {
          mouseEvent.stopPropagation()
          updateConfig((current) => ({
            ...current,
            sound: { ...current.sound, enabled: !current.sound.enabled },
          }))
          if (!soundEnabled) sfx.read()
        }}
      >
        {soundEnabled ? (
          <IconVolume size={15} className="text-cm-cast-accent" />
        ) : (
          <IconVolumeOff size={15} />
        )}
        <span>{soundEnabled ? 'Sound' : 'Muted'}</span>
      </button>

      {sigil.showLexicon ? (
        <LexiconField placement={lexiconBox} dimmed={isDrawing} hidden={directCast}>
          {draft === null ? (
            <RuneList
              commands={commands}
              runeFor={runeFor}
              columns={lexiconBox.columns}
              onPick={castReading}
              onBind={startBinding}
            />
          ) : (
            <RuneEditor
              command={draft.command}
              points={draft.points}
              rune={runeFor(draft.command)}
              palette={glyphs}
              takenGlyphNames={takenGlyphNames}
              collision={draftCollision}
              onTake={takeGlyph}
              onKeep={keepDraft}
              onRedraw={() => setDraft({ command: draft.command, points: null })}
              onDrop={dropRune}
              onClose={() => setDraft(null)}
            />
          )}
        </LexiconField>
      ) : null}

      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="pointer-events-none absolute inset-0"
      />

      {!showReadingCard || reading === null ? null : (
        <ReadingCard
          reading={reading}
          isConfident={isConfident}
          willCast={willCast}
          castProgress={castProgress}
          castDurationMs={sigil.autoCastDelayMs}
          onCast={castReading}
        />
      )}
    </div>
  )
}

function CastingRing({ x, y, size, dimmed }: { x: number; y: number; size: number; dimmed: boolean }) {
  const centre = size / 2
  const ticks = Array.from({ length: 12 }, (_unused, index) => {
    const angle = (index / 12) * 2 * Math.PI
    return {
      x1: centre + centre * 0.814 * Math.cos(angle),
      y1: centre + centre * 0.814 * Math.sin(angle),
      x2: centre + centre * 0.881 * Math.cos(angle),
      y2: centre + centre * 0.881 * Math.sin(angle),
    }
  })
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
      style={{ left: x, top: y, width: size, height: size, opacity: dimmed ? 0.3 : 1 }}
      aria-hidden
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full overflow-visible">
        <g className="animate-cm-ring-spin" style={{ transformOrigin: `${centre}px ${centre}px` }}>
          {/* The ring is chrome that is *read*, so it takes the two tokens that
              invert — the accent and the ink — and not the field's fixed lilac and
              white. That is the same call the prompt line above already makes, for
              the same reason: the veil is a wash, not an opaque plate, so white on
              a light board is a circle nobody can see, and the whole composition
              now hangs off a ring that had all but vanished in one palette. The
              dark half barely moves — the accent's dark violet and the ink's near
              white are a shade off the two they replace — and the light half
              arrives.

              Utilities rather than `stroke=` attributes, because a presentation
              attribute does not substitute `var()`. */}
          <circle
            cx={centre}
            cy={centre}
            r={centre * 0.949}
            fill="none"
            className="stroke-cm-cast-accent/45"
            strokeDasharray="2 9"
          />
          {ticks.map((tick, index) => (
            <line
              key={index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              className="stroke-cm-cast-accent/55"
              strokeWidth={1.5}
            />
          ))}
        </g>
        <circle
          cx={centre}
          cy={centre}
          r={centre * 0.661}
          fill="none"
          className="stroke-cm-ink/35"
        />
        <circle
          cx={centre}
          cy={centre}
          r={centre * 0.373}
          fill="none"
          className="stroke-cm-cast-accent/65"
        />
        <circle cx={centre} cy={centre} r={2.5} className="fill-cm-ink/85" />
      </svg>
    </div>
  )
}

/**
 * The Lexicon, laid out on the field — the crib sheet *and* the place a rune is
 * bound, changed or taken away.
 *
 * It is one region with two faces rather than a separate editor, because the
 * alphabet and the editing of it are the same subject, and because the field has
 * to stay clear: the stroke is drawn on the board, not in a dialog over it
 * ("affordances live next to what they change" — the affordance sits beside what
 * it changes, and what it changes is what this region lists).
 *
 * **There is no plate.** It was a card — a bordered, blurred, shadowed panel — and
 * a card is a thing *over* a surface. The alphabet belongs *to* the casting field,
 * so it is set directly on the veil, in the page's ink with the field's own halo
 * behind it: the same treatment the field's line of prose already uses, because it
 * is the same problem (readable text on a wash, under both palettes). What is left
 * of the old panel is the part that was never chrome — the rune sockets, which are
 * the field's motif, and the mono captions, which are its voice.
 *
 * Two consequences worth knowing:
 *
 *   - **The region does not block the field.** It is `pointer-events-none` and
 *     hands them back only on the controls, so the gaps between columns stay
 *     castable — press between two rows and you start a stroke, which is right,
 *     because there is no longer a card there to press *on*. `stopPropagation` on
 *     the bubbled press is what keeps a control out of the ink.
 *   - **It dims while you draw**, exactly as the prompt line hides: mid-gesture the
 *     crib sheet is not what you are looking at, and the trail should not have to
 *     compete with twenty-six labels. `hidden` is the same argument taken all the
 *     way: through a *direct* cast off the pad there is no moment at which the
 *     alphabet is the subject — the stroke was already begun when the field
 *     arrived — so the crib sheet stays out of the way entirely and fades in only
 *     if the gesture settles into a field to stand in.
 *
 * Both are `opacity`, never an unmount and never `visibility`: the rows keep their
 * boxes, their tab stops and their accessible names, so nothing here is *hidden*
 * from a keyboard or a screen reader — it is dimmed, and a hidden subtree cannot
 * take focus (see `useFocusTrap`).
 */
function LexiconField({
  placement,
  dimmed,
  hidden,
  children,
}: {
  placement: LexiconPlacement
  dimmed: boolean
  hidden: boolean
  children: ReactNode
}) {
  return (
    <aside
      // The rows hand pointer events back to themselves, so hiding has to take
      // them away again on the way down — otherwise an invisible row is still a
      // hit target sitting over the board the stroke is being drawn on, and a
      // release could land on a command nobody could see.
      className={`pointer-events-none absolute flex flex-col text-cm-ink transition-opacity duration-200 [text-shadow:0_1px_8px_var(--color-cm-cast-shadow)] ${
        hidden ? '[&_*]:pointer-events-none' : ''
      }`}
      style={{
        left: placement.left,
        width: placement.width,
        // One of the two is always null — below the ring, or flipped above it and
        // grown upward from its edge.
        top: placement.top ?? undefined,
        bottom: placement.bottom ?? undefined,
        maxHeight: placement.maxHeight,
        opacity: hidden ? 0 : dimmed ? 0.22 : 1,
      }}
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
    >
      {children}
    </aside>
  )
}

/**
 * The field's own mark, at caption size — the casting ring with its dashed rim,
 * its inner circle and its centre, turning at the same rate the real one does.
 *
 * It is what tells you at a glance that this panel belongs to the surface behind
 * it, and it costs one shape: the instrument is stamped with the thing it is an
 * instrument for. Motion is the field's (`animate-cm-ring-spin`), so a host that
 * asks for reduced motion stops both together.
 */
function RingSeal({ size = 15 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="shrink-0 text-cm-cast-accent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <g className="animate-cm-ring-spin" style={{ transformOrigin: '10px 10px' }}>
        <circle
          cx="10"
          cy="10"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="1.6 3.2"
        />
      </g>
      <circle cx="10" cy="10" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.75" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
    </svg>
  )
}

/**
 * A section caption on the field: mono, upper, tracked — the same voice the field's
 * own line of prose ends in.
 */
function FieldCaption({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      // `ink-3`, not the `ink-4` a caption this small invites: 9.5px uppercase
      // mono is the least legible text here, and the fourth ink step does not carry
      // it on the veil — the same call the cast pad's own caption makes.
      className={`font-cm-mono text-[9.5px] tracking-[0.12em] text-cm-ink-3 uppercase ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * A rune at whatever size the caller has room for — the 30px face in the palette,
 * the 92px one on the confirmation.
 */
function RuneMark({ glyph, size = 30 }: { glyph: Glyph; size?: number }) {
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 text-cm-cast-accent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <path
        d={glyphPath(glyph.points, size, size * 0.16)}
        fill="none"
        stroke="currentColor"
        strokeWidth={Math.max(1.6, size * 0.055)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * A rune in its socket — the Lexicon's unit, and the field's own motif at list
 * size.
 *
 * The socket is a *circle* because that is what the field is: every rune on this
 * list is drawn inside the casting ring, so the list draws each one inside a ring
 * too, and an alphabet reads as a column of seals rather than a column of
 * checkboxes. It replaces a dashed square, which said "empty form field" on a
 * surface where nothing else is square.
 *
 * `null` is a command nobody has bound: the socket stays, dashed, so the missing
 * rune is a shape you can see and the column does not go ragged. Deliberately
 * *empty* rather than holding a plus — the seal sits inside the row, which casts
 * the command, and the control that binds a rune is the one at the end of the
 * row. Two plus signs on one row would be one lie.
 *
 * `muted` is the library's own dismiss rune. It is bound, so it gets a solid
 * socket, but it is not a command, so it is not painted in the accent every
 * command's rune is — and its caption says "built in" beside it, because a
 * colour on its own is not a distinction (rule 2 of "unavailable is never
 * invisible" in miniature — the state has to be *said*, not just painted).
 */
function RuneSeal({
  glyph,
  muted = false,
  size = 30,
}: {
  glyph: Glyph | null
  muted?: boolean
  size?: number
}) {
  const inner = size * 0.63
  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 30 30"
        // The socket is drawn in the *theme-aware* violet, not the field's fixed
        // lilac: a socket is read against the page's ink, and #c4b5fd on a light
        // board is a circle nobody can see. An empty one steps down to ink rather
        // than fading the violet out, so "no rune here" is a different colour of
        // mark and not merely a fainter one.
        className={`absolute inset-0 size-full ${glyph === null ? 'text-cm-ink-3' : 'text-cm-cast-accent/45'}`}
      >
        <circle
          cx="15"
          cy="15"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray={glyph === null ? '1.5 3.5' : undefined}
        />
      </svg>
      {glyph === null ? null : (
        <svg
          viewBox={`0 0 ${inner} ${inner}`}
          style={{ width: inner, height: inner }}
          // Unlit. The trail's glow belongs to a stroke being *made* — on
          // twenty-six standing runes it read as a haze over the whole alphabet
          // and blunted the one distinction the column exists to draw, between a
          // socket that holds a rune and one that does not. Shape and colour carry
          // that on their own.
          className={`relative ${muted ? 'text-cm-ink-2' : 'text-cm-cast-accent'}`}
        >
          <path
            d={glyphPath(glyph.points, inner, 1.5)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  )
}

/**
 * Every command, with its rune or with the space for one.
 *
 * The whole command set is here, not only the part with runes, because binding
 * one is the point: a fresh field lists twenty commands and twenty empty slots,
 * and that is the alphabet's first page rather than an empty panel. Pressing the
 * row still casts the command — the crib sheet was always clickable, and a
 * command without a rune must not become *less* reachable than one with.
 */
function RuneList({
  commands,
  runeFor,
  columns,
  onPick,
  onBind,
}: {
  commands: Command[]
  runeFor: (command: Command) => ResolvedRune | null
  columns: number
  onPick: (command: Command) => void
  onBind: (command: Command) => void
}) {
  const bound = commands.filter((command) => runeFor(command) !== null)
  const unbound = commands.filter((command) => runeFor(command) === null)

  return (
    <>
      {/* The two lines that are the field's, not a command's, so they are centred
          on the ring above them rather than starting a column. */}
      <div className="flex shrink-0 items-center justify-center gap-2 pb-2">
        <RingSeal />
        <span className="font-cm-mono text-[10px] tracking-[0.14em] text-cm-ink-2 uppercase">
          Lexicon
        </span>
        {/* The count against the whole set, not on its own: "0 bound" is a
            number, "0 / 20" is the progress through an alphabet you are still
            inventing — which is what a first-run field is looking at. */}
        <span className="font-cm-mono text-[9.5px] tracking-[0.06em] text-cm-ink-3 tabular-nums">
          {bound.length} / {commands.length}
        </span>
      </div>

      {/* The library's own rune — above the list rather than in it, because it is
          the field's and not a command's, and because the way out of a surface
          must not be the thing that scrolls off the top of it. It is on screen at
          all rather than hidden because a gesture nobody documents is a gesture
          nobody uses. */}
      {/* The gap under this line is the second half of the breathing room: these
          two centred lines are the field talking about itself, and the columns
          below are the alphabet. They should not read as one stack. */}
      <div className="flex shrink-0 items-center justify-center gap-2 pb-4">
        <RuneSeal glyph={DISMISS_GLYPH} muted size={22} />
        <span className="text-[11px] font-semibold text-cm-ink-2">Close the field</span>
        <span className="font-cm-mono text-[9.5px] tracking-[0.03em] text-cm-ink-3">
          built in · one stroke down
        </span>
      </div>

      {/* The alphabet dissolves at both ends instead of being cut — there is no
          plate for a hard edge to belong to now, and the fade is the only thing
          that says "there is more". */}
      <div className="min-h-0 flex-1 overflow-auto [mask-image:linear-gradient(to_bottom,transparent,black_10px,black_calc(100%-10px),transparent)]">
        <div
          // A vertical gap as well as the column one: it is the air the rows want,
          // and it is also field — a press that lands between two rows starts a
          // stroke rather than hitting a row it was not aimed at.
          className="grid items-start gap-x-2 gap-y-1 py-1.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {/* A caption spans the grid rather than taking a cell: it labels the
              band below it, and a band is however many columns wide. */}
          {bound.length === 0 ? null : (
            <FieldCaption className="col-span-full px-1.5 pt-0.5 pb-1">bound</FieldCaption>
          )}
          {bound.map((command) => (
            <RuneRow
              key={command.id}
              command={command}
              rune={runeFor(command)}
              onPick={onPick}
              onBind={onBind}
            />
          ))}

          {unbound.length === 0 ? null : (
            <FieldCaption
              className={`col-span-full px-1.5 pb-1 ${bound.length === 0 ? 'pt-0.5' : 'pt-3'}`}
            >
              no rune yet
            </FieldCaption>
          )}
          {unbound.map((command) => (
            <RuneRow
              key={command.id}
              command={command}
              rune={null}
              onPick={onPick}
              onBind={onBind}
            />
          ))}
        </div>
      </div>
    </>
  )
}

/**
 * One command in the Lexicon: its rune, its name, and the way to change the rune.
 *
 * The two are siblings rather than nested, because the row *is* a `CommandButton`
 * — the shared control that owns the unavailable treatment and the anchor — and a
 * button inside a button is neither valid nor focusable in the order a reader
 * expects.
 *
 * **The row has no hover plate.** A filled rectangle behind one label is the last
 * card left on a surface that has none: it put a lit panel back on the veil, in
 * the middle of an alphabet whose whole job is to be quiet. The hover feedback is
 * the *rune control appearing* instead — a state change on the thing the pointer
 * is actually offering you, not a box around what it is over.
 *
 * That control is `opacity-0`, never `hidden`: it stays in the tab order, keeps
 * its accessible name, and `group-focus-within` brings it back for a keyboard
 * user the moment focus enters the row — so it is revealed-on-approach rather
 * than hidden, which is the distinction "unavailable is never invisible" turns
 * on. Losing the hover wash
 * also cost the row its only focus treatment, so the ring is explicit now — the
 * shared focus token, the same one every other control on this field carries.
 */
function RuneRow({
  command,
  rune,
  onPick,
  onBind,
}: {
  command: Command
  rune: ResolvedRune | null
  onPick: (command: Command) => void
  onBind: (command: Command) => void
}) {
  return (
    // `pointer-events-auto` here and not on the region: the gaps between the
    // columns stay part of the field, so a press that misses a row starts a
    // stroke instead of landing on a card that is no longer there.
    // A *named* group, because the row is what is hovered and the control that
    // reacts is the ＋/✎ two elements over — a sibling of the `CommandButton`,
    // not a child of it. Named rather than bare so nothing nested inside the
    // button can shadow it later.
    <div className="group/rune pointer-events-auto flex min-w-0 items-center gap-0.5">
      <CommandButton
        command={command}
        onActivate={onPick}
        activateOn="click"
        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-cm-lg px-1.5 py-1 text-left no-underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent ${
          command.disabledReason === null ? 'cursor-pointer' : ''
        }`}
      >
        <RuneSeal glyph={rune === null ? null : rune.glyph} />
        {/* Stretched, not `items-start`: the label truncates against the column
            it is in, and a column is a third of whatever room the field had. A
            shrink-to-fit box has no width for `truncate` to work against. */}
        <span className="flex min-w-0 flex-1 flex-col">
          <CommandLabel
            command={command}
            className="truncate text-[11.5px] font-semibold"
            monoClassName="font-cm-mono"
            proseClassName=""
          />
          {rune === null ? null : (
            <span className="truncate font-cm-mono text-[9.5px] tracking-[0.04em] text-cm-ink-3">
              {runeDisplayNameOf(rune.glyph)}
            </span>
          )}
        </span>
      </CommandButton>
      <button
        type="button"
        // The icon carries no name of its own ("real vector icons, never
        // characters"), so the control does —
        // and it names the command, because "edit" on twenty identical buttons
        // is twenty controls a screen reader cannot tell apart.
        aria-label={`${rune === null ? 'Draw a rune for' : 'Change the rune for'} ${command.label}`}
        title={rune === null ? 'Draw a rune' : 'Change this rune'}
        // Round, like everything else that holds a rune here — this control's
        // subject is the socket two elements to its left. It fades in with the
        // row rather than sitting in every one of twenty-six: a column of plus
        // signs reads as the subject of the list, and the runes are.
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-cm-ink-3 opacity-0 transition-opacity hover:text-cm-cast-accent focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent group-hover/rune:opacity-100 group-focus-within/rune:opacity-100"
        onClick={() => onBind(command)}
      >
        {rune === null ? <IconPlus size={14} /> : <IconPencil size={14} />}
      </button>
    </div>
  )
}

/**
 * The panel's other face: one command, and the two ways to give it a rune.
 *
 * Drawing is first and takes the whole field; the palette is the fallback for
 * someone who would rather not invent a shape. Both land in the same place —
 * `bindRune` — so a picked rune and a drawn one are the same kind of thing
 * afterwards, and either can be redrawn over the other.
 */
function RuneEditor({
  command,
  points,
  rune,
  palette,
  takenGlyphNames,
  collision,
  onTake,
  onKeep,
  onRedraw,
  onDrop,
  onClose,
}: {
  command: Command
  points: [number, number][] | null
  rune: ResolvedRune | null
  palette: Glyph[]
  takenGlyphNames: Map<string, Command>
  collision: string | null
  onTake: (glyph: Glyph) => void
  onKeep: () => void
  onRedraw: () => void
  onDrop: () => void
  onClose: () => void
}) {
  return (
    <>
      <div className="flex shrink-0 items-start gap-2 pb-2.5">
        <button
          type="button"
          aria-label="Back to the Lexicon"
          // Leading the header rather than trailing it: this face is a detour off
          // the list, and the way back belongs where a reader looks first.
          className="pointer-events-auto mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-cm-ink-3 hover:bg-cm-hover hover:text-cm-cast-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent"
          onClick={onClose}
        >
          <IconArrowLeft size={15} />
        </button>
        <span className="min-w-0 flex-1">
          <span className="block font-cm-mono text-[9.5px] tracking-[0.12em] text-cm-ink-3 uppercase">
            Rune for
          </span>
          <span
            className={`block truncate text-[12.5px] font-bold ${command.monospace ? 'font-cm-mono' : ''}`}
          >
            {command.label}
          </span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {points === null ? (
          <>
            <p className="text-[11.5px] leading-snug text-cm-ink-3">
              Draw anywhere on the field — the stroke you release becomes this command's rune. It
              is not saved until you keep it.
            </p>
            {rune === null ? null : (
              <div className="mt-3 flex items-center gap-2.5">
                <RuneSeal glyph={rune.glyph} size={34} />
                <span className="min-w-0 flex-1 text-[11px] leading-tight text-cm-ink-3">
                  casts it today{rune.source === 'host' ? ' · shipped with the app' : ''}
                </span>
                <button
                  type="button"
                  className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-cm-cast-accent/45 px-2.5 py-1 text-[11px] font-medium hover:bg-cm-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent"
                  onClick={onDrop}
                >
                  <IconTrash size={12} />
                  Remove
                </button>
              </div>
            )}
            <FieldCaption className="pt-4 pb-2">or take one from the palette</FieldCaption>
            <div className="grid grid-cols-5 gap-1.5">
              {palette.map((glyph) => {
                const owner = takenGlyphNames.get(glyph.name)
                return (
                  <button
                    key={glyph.name}
                    type="button"
                    // Taken runes stay pickable rather than going grey: a named
                    // rune has one owner, so picking one *moves* it, and the
                    // title says so instead of the control saying nothing.
                    aria-label={
                      owner === undefined
                        ? `Use the ${glyph.name} rune`
                        : `Move the ${glyph.name} rune here from ${owner.label}`
                    }
                    title={owner === undefined ? glyph.name : `${glyph.name} · casts ${owner.label}`}
                    // A socket, like every other place a rune is shown here — and
                    // the taken ones keep the dashed edge, which is the same mark
                    // an empty socket carries in the list: this rune is somewhere
                    // else, not here.
                    className={`pointer-events-auto flex aspect-square cursor-pointer items-center justify-center rounded-full border hover:bg-cm-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cm-accent ${
                      owner === undefined
                        ? 'border-cm-cast-accent/45'
                        : 'border-dashed border-cm-ink-4'
                    }`}
                    onClick={() => onTake(glyph)}
                  >
                    <RuneMark glyph={glyph} size={26} />
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            {/* The stroke shown the way the field will hold it — inside a ring,
                lit by the trail's own glow. The ring *is* the container: a box
                around it would be a second frame for one shape, and the field has
                no boxes on it. */}
            <div className="flex justify-center py-1">
              <span className="relative flex size-[104px] items-center justify-center">
                <svg
                  viewBox="0 0 104 104"
                  className="absolute inset-0 size-full text-cm-cast-accent/45"
                  aria-hidden
                >
                  <circle
                    cx="52"
                    cy="52"
                    r="51"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="2 7"
                  />
                </svg>
                <span className="relative drop-shadow-[0_0_9px_var(--color-cm-cast-glow)]">
                  <RuneMark glyph={{ name: '', points }} size={78} />
                </span>
              </span>
            </div>
            {collision === null ? (
              <p className="mt-2.5 text-[11.5px] leading-snug text-cm-ink-3">
                Keep it and this stroke casts{' '}
                <b className="font-semibold text-cm-ink-2">{command.label}</b> from anywhere on the
                field.
              </p>
            ) : (
              <p className="mt-2.5 text-[11.5px] leading-snug text-cm-cast-accent">
                This reads a lot like <b className="font-semibold">{collision}</b> — the field will
                have to guess between them. Redrawing it less like that one is worth the second.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                // Ink on the accent, not on the page — the dark palette's accent
                // is a light violet, so the page's ink would be white on lilac.
                className="pointer-events-auto flex-1 cursor-pointer rounded-full bg-cm-cast-accent py-2 text-[12px] font-semibold text-cm-on-accent shadow-cm-cast-plate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent"
                onClick={onKeep}
              >
                Keep rune
              </button>
              <button
                type="button"
                className="pointer-events-auto flex-1 cursor-pointer rounded-full border border-cm-cast-accent/45 py-2 text-[12px] font-semibold hover:bg-cm-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent"
                onClick={onRedraw}
              >
                Redraw
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function ReadingCard({
  reading,
  isConfident,
  willCast,
  castProgress,
  castDurationMs,
  onCast,
}: {
  reading: Reading
  isConfident: boolean
  willCast: boolean
  castProgress: number
  castDurationMs: number
  onCast: (command: Command) => void
}) {
  const percent = Math.round(reading.confidence * 100)
  return (
    <div
      // The same plate as the Lexicon: the field has one instrument material,
      // and a reading is the other thing it puts on it.
      className="absolute top-1/2 left-1/2 w-[296px] -translate-x-1/2 -translate-y-1/2 animate-cm-pop rounded-cm-xl border border-cm-cast-plate-edge bg-cm-cast-plate px-[22px] pt-[22px] pb-[18px] text-center text-cm-ink shadow-cm-cast-plate backdrop-blur-xl"
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
    >
      <svg
        viewBox="0 0 100 100"
        className="mx-auto mb-3.5 size-[92px] text-cm-cast-accent drop-shadow-[0_0_10px_var(--color-cm-cast-glow)]"
      >
        <path
          d={glyphPath(reading.glyph.points, 100, 16)}
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="text-[15px] tracking-[-0.01em]">
        {/* A rune the user drew has no name, only a shape — and the shape is
            already the biggest thing on this card, so it says "drawn" rather
            than inventing a word for it. */}
        <span className="font-extrabold">{runeDisplayNameOf(reading.glyph)}</span>
        <span className="mx-[7px] text-cm-ink-4">→</span>
        <span
          className={`font-bold text-cm-cast-accent ${reading.command.monospace ? 'font-cm-mono' : ''}`}
          // The reading card is the surface's promise about what is *about* to
          // run, unprompted, on a timer — so a destructive reading has to say so
          // here more than anywhere else.
          style={toneStyleOf(reading.command)}
        >
          {reading.command.label}
        </span>
      </div>
      {reading.command.detail === null ? null : (
        <div className="mt-1.5 px-2 text-[11px] leading-snug text-cm-ink-3">
          {reading.command.detail}
        </div>
      )}
      <div className="mt-2 font-cm-mono text-[10px] tracking-[0.05em] text-cm-ink-3 uppercase">
        {isConfident ? `glyph read · ${percent}%` : `uncertain reading · ${percent}%`}
      </div>
      <div className="mx-auto mt-3 h-[5px] w-[82%] overflow-hidden rounded-[3px] bg-cm-bg-sink">
        <div
          className="h-full rounded-[3px] bg-cm-cast-accent transition-[width] duration-[450ms]"
          style={{ width: `${percent}%` }}
        />
      </div>

      {isConfident && reading.command.disabledReason !== null ? (
        // Read, understood, and not runnable — so the card says why and stops.
        // Nothing counts down, because there is nothing to count down to
        // ("unavailable is never invisible": the explanation is the point, and it
        // has to arrive).
        <p className="mt-3.5 rounded-cm-lg border border-cm-cast-plate-seam px-2.5 py-2 text-[11.5px] leading-snug text-cm-ink-2">
          {reading.command.disabledReason}
        </p>
      ) : willCast ? (
        <button
          type="button"
          // Ink on the *accent*, not on the page: the dark palette's accent is a
          // light violet, so white here would be white on lilac.
          className="relative mt-[15px] flex h-[34px] w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-cm-lg bg-cm-cast-accent text-[12.5px] font-semibold text-cm-on-accent"
          onClick={() => onCast(reading.command)}
        >
          <span
            className="absolute inset-y-0 left-0 bg-cm-on-accent/25 ease-linear"
            style={{
              width: `${castProgress * 100}%`,
              transitionProperty: 'width',
              transitionDuration: `${castDurationMs}ms`,
            }}
          />
          <span className="relative">casting…</span>
        </button>
      ) : (
        // Below the confidence threshold the reading is offered, never assumed —
        // both candidates stay visible with their names, so a misread costs one
        // click instead of an undo.
        <div className="mt-3.5 flex gap-2.5">
          <PickButton
            command={reading.command}
            sublabel={`${runeDisplayNameOf(reading.glyph)} · ${percent}%`}
            onPick={onCast}
          />
          {reading.alternative === null ? null : (
            <PickButton
              command={reading.alternative.command}
              sublabel={runeDisplayNameOf(reading.alternative.glyph)}
              onPick={onCast}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * One of the two candidates an uncertain reading offers.
 *
 * Through `CommandButton` rather than a plain button, because either candidate
 * may be a command that cannot run — and the shared control is what makes that
 * visible *and* explained here exactly as it is in the list, because both go
 * through the one shared wrapper.
 */
function PickButton({
  command,
  sublabel,
  onPick,
}: {
  command: Command
  sublabel: string
  onPick: (command: Command) => void
}) {
  return (
    <CommandButton
      command={command}
      onActivate={onPick}
      activateOn="click"
      explanationPlacement="below"
      className={`flex-1 rounded-cm-lg border border-cm-cast-plate-seam px-1.5 py-[9px] text-xs font-semibold no-underline ${
        command.disabledReason === null
          ? `cursor-pointer hover:border-cm-cast-plate-edge ${hoverToneClass(command)}`
          : ''
      }`}
    >
      <CommandLabel command={command} proseClassName="" />
      <small className="mt-0.5 block font-cm-mono text-[9px] font-medium tracking-[0.04em] text-cm-ink-4">
        {sublabel}
      </small>
    </CommandButton>
  )
}
