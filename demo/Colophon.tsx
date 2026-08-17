/**
 * The sidebar's last line — what this is licensed under, and the way to the
 * notices that have to travel with the build.
 *
 * It is here rather than in a README because of the fonts. The demo self-hosts
 * Inter and JetBrains Mono instead of linking a font CDN — nothing is fetched
 * from a third party at runtime — so their
 * `.woff2` files ship inside `dist/demo`, and OFL-1.1 clause 2 is a condition on
 * the copy: whoever receives the fonts receives the copyright notice and the
 * licence text with them. Someone loading the hosted demo has received the
 * fonts — a notices file that only exists in the git repo has not reached them.
 * `scripts/thirdPartyNotices.ts` puts the page in the build; this is the link to
 * it, and the two agree by `NOTICES_HREF` (`test/third-party-notices.test.ts`).
 *
 * Relative, like every other reference the built demo makes, because it is
 * served from a subpath and not a root (see `base` in `vite.config.ts`).
 *
 * New tab, because the board behind it is stateful — a visitor two directions
 * and a drawn rune into the demo should not have to rebuild that to read a
 * licence and come back.
 */
import { IconExternalLink } from '@tabler/icons-react'

/** Where the notices page lands in the build — `NOTICES_PAGE`, made relative. */
export const NOTICES_HREF = './third-party-notices.html'

export function Colophon() {
  return (
    <div className="mt-3 border-t border-cm-rule px-1.5 pt-3 text-[10.5px] leading-relaxed text-cm-ink-3">
      <span>MIT-licensed.</span>{' '}
      <span>
        Set in Inter and JetBrains Mono, bundled here under the SIL Open Font License 1.1.
      </span>{' '}
      <a
        href={NOTICES_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-cm-ink-2 underline decoration-cm-rule underline-offset-2 hover:text-cm-ink hover:decoration-cm-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cm-accent"
      >
        Third-party notices
        <IconExternalLink size={11} className="shrink-0 opacity-70" aria-hidden />
      </a>
    </div>
  )
}
