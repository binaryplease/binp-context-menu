/**
 * Where the Lexicon goes, and how many columns it gets.
 *
 * The Lexicon used to be a card pinned to one side of the viewport, which made it
 * a panel the field had opened rather than a part of the field. It now sits
 * *under the casting ring*, centred on the same point the stroke starts from, with
 * no plate around it — so the crib sheet reads as the alphabet laid out beneath
 * the place you cast, and the field is one composition instead of a surface plus a
 * sidebar.
 *
 * That placement is the whole reason this maths exists. A side panel could be one
 * fixed rectangle because the viewport edge never moves; a panel under the ring is
 * placed against an anchor that lands anywhere on the board, so the space it has
 * is different on every invocation. Three things follow, and they are what the two
 * functions below decide:
 *
 *   1. **How wide.** Wide enough for up to three columns, never wider than the
 *      viewport allows, and never wider than the command set needs.
 *   2. **How many columns.** Three is the cap: past that the eye stops reading
 *      rows and starts reading a table, and a rune belongs beside its command.
 *   3. **Below, or above.** Below is the rule. A right-click near the bottom of
 *      the board leaves no room there, and a list squeezed into 40px is not a
 *      concession worth making, so it flips over the ring instead.
 *
 * Pure functions over numbers, and therefore tested — the failure here is
 * geometric, and geometry is the one thing in this library a test can hold.
 */

/**
 * The narrowest a column reads at: a rune socket, the gap, a label with enough
 * room to be a label rather than an ellipsis, and the control that binds it.
 * Below this the labels truncate before the layout has run out of room, which is
 * the wrong order for the two to fail in.
 */
export const LEXICON_COLUMN_WIDTH = 224

/** Between columns. Deliberately tight — the sockets are what separate them. */
export const LEXICON_COLUMN_GAP = 8

/**
 * Three, and not because of the arithmetic. A fourth column pushes the outermost
 * runes past where the eye sweeps from the ring, and the Lexicon stops being a
 * thing you glance at mid-gesture.
 */
export const MAX_LEXICON_COLUMNS = 3

/** The clear space kept between the Lexicon and every viewport edge. */
export const LEXICON_INSET = 24

/**
 * The editing face is one command, one preview and a palette — one column, always,
 * and narrow enough that the palette's runes stay big enough to tell apart.
 */
export const LEXICON_EDITOR_WIDTH = 336

/**
 * Under this, "below the ring" is not a placement, it is a sliver. The Lexicon
 * goes above instead — the one case where the rule bends, and it bends rather
 * than breaks because a scrollable 40px strip is worse than either.
 */
export const MIN_LEXICON_HEIGHT = 190

/**
 * How far under the anchor the field's own line of prose sits, as a fraction of
 * the ring. It is the same number `SigilSurface` places the caption with — the
 * Lexicon starts below *that*, not below the ring, or the first row lands on the
 * instruction telling you what a stroke will do.
 */
const PROMPT_OFFSET_RATIO = 0.635

/**
 * Between the prompt line and the Lexicon's nearest row.
 *
 * Generous, and deliberately so: the ring, its instruction and the alphabet are
 * three separate statements stacked on one axis, and at 30px they read as one
 * block that happens to change size. The gap is what says the crib sheet is
 * *below* the casting, not part of it — and what leaves the field's own centre of
 * gravity around the ring instead of halfway down the list.
 */
export const PROMPT_CLEARANCE = 56

export type LexiconPlacementInput = {
  anchorX: number
  anchorY: number
  /** The casting ring's diameter — `config.sigil.ringDiameter`. */
  ringSize: number
  viewportWidth: number
  viewportHeight: number
  /** How many commands the list has to hold. */
  itemCount: number
  /** The editing face, which is one column at a fixed width whatever the room. */
  compact: boolean
}

export type LexiconPlacement = {
  left: number
  width: number
  columns: number
  /**
   * Where the field's own line of prose goes — under the ring normally, over it
   * when the Lexicon has flipped.
   *
   * It lives here because it is the same question, asked about the other thing
   * that hangs off the ring: a cast near the bottom edge used to push the
   * instruction clean off the viewport while leaving the alphabet on it, which is
   * the wrong one of the two to lose.
   */
  promptTop: number
  /** Set when the Lexicon hangs below the ring; `null` when it has flipped. */
  top: number | null
  /** Set when it has flipped above the ring, so it grows upward from the ring. */
  bottom: number | null
  maxHeight: number
  placedAbove: boolean
}

/**
 * How many columns fit in `availableWidth`, capped at three and at the number of
 * things there are to show — two commands in three columns is a gap pretending to
 * be a layout.
 */
export function lexiconColumns(availableWidth: number, itemCount: number): number {
  const fits = Math.floor(
    (availableWidth + LEXICON_COLUMN_GAP) / (LEXICON_COLUMN_WIDTH + LEXICON_COLUMN_GAP),
  )
  return Math.max(1, Math.min(MAX_LEXICON_COLUMNS, fits, Math.max(itemCount, 1)))
}

/**
 * The box the Lexicon occupies for one invocation.
 *
 * Width is resolved before height on purpose: the column count decides how tall
 * the list wants to be, and the list is what the remaining height has to hold.
 */
export function lexiconPlacement(input: LexiconPlacementInput): LexiconPlacement {
  const { anchorX, anchorY, ringSize, viewportWidth, viewportHeight, itemCount, compact } = input

  const roomAcross = Math.max(0, viewportWidth - LEXICON_INSET * 2)
  const columns = compact ? 1 : lexiconColumns(roomAcross, itemCount)
  const wanted = compact
    ? LEXICON_EDITOR_WIDTH
    : columns * LEXICON_COLUMN_WIDTH + (columns - 1) * LEXICON_COLUMN_GAP
  const width = Math.min(wanted, roomAcross)

  // Centred on the anchor, then pushed back inside the viewport — a cast near the
  // edge should still put the alphabet under the ring, not off the board.
  const left = Math.min(
    Math.max(anchorX - width / 2, LEXICON_INSET),
    Math.max(LEXICON_INSET, viewportWidth - LEXICON_INSET - width),
  )

  // The prompt rides at a fixed fraction of the ring, and the Lexicon clears it
  // by the same margin on whichever side it lands — so flipping moves the pair,
  // not just one of them.
  const promptOffset = ringSize * PROMPT_OFFSET_RATIO
  const belowTop = anchorY + promptOffset + PROMPT_CLEARANCE
  const roomBelow = viewportHeight - LEXICON_INSET - belowTop
  const aboveBottomEdge = anchorY - promptOffset - PROMPT_CLEARANCE
  const roomAbove = aboveBottomEdge - LEXICON_INSET

  // Below unless below is unusable — and then only if above is genuinely better,
  // so a field on a short viewport does not flip to something equally cramped.
  const placedAbove = roomBelow < MIN_LEXICON_HEIGHT && roomAbove > roomBelow
  return placedAbove
    ? {
        left,
        width,
        columns,
        promptTop: anchorY - promptOffset,
        top: null,
        bottom: Math.max(LEXICON_INSET, viewportHeight - aboveBottomEdge),
        maxHeight: Math.max(0, roomAbove),
        placedAbove: true,
      }
    : {
        left,
        width,
        columns,
        promptTop: anchorY + promptOffset,
        top: belowTop,
        bottom: null,
        maxHeight: Math.max(0, roomBelow),
        placedAbove: false,
      }
}
