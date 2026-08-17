# Contributing

Thanks for looking. This is a client-side React library — seven context-menu
surfaces over one command set, one config and one persistence seam. There is no
server, no API and no build step for the library itself, so getting from a clone
to a running board is short.

## Get it running

```bash
bun install
mise run dev     # the demo on 127.0.0.1:5173 (or the next free port)
```

[mise](https://mise.jdx.dev) is what the repo pins its toolchain with (`bun 1`,
in `.mise.toml`) and what the docs quote, but every task has a `bun run`
equivalent in `package.json` if you would rather not install it:

| With mise | Without |
|---|---|
| `mise run dev` | `bun run dev` |
| `mise run typecheck` | `bun run typecheck` |
| `mise run lint` | `bun run guard` |
| `mise run test` | `bun run test` |
| `mise run check` | `bun run check` |

The demo in `demo/` is also the reference host — a real board wired to the
library the way a consumer would wire it. It is where you look at a change.

## The gate

```bash
mise run check   # typecheck + surface guard + tests
```

That is the whole gate, and it is what CI runs on every pull request
(`.github/workflows/check.yml`) — the workflow calls the same task rather than
re-spelling its steps, so a green run locally means a green run there. It takes
about two seconds.

Run it before you push. If it is red, CI will be red for the same reason.

## What the surface guard is for

The library's premise is that seven surfaces share one affordance, and that only
holds while every surface goes through the shared primitives. The guard
(`scripts/guard-surfaces.ts`) is the executable half of that: it fails the build
on six regressions that typecheck perfectly well — a hand-rolled `disabled=`
control, a hand-written `href=`, a hand-rolled `cm-danger` tint, a second
`createPortal`, a direct write to `config.usage`, and a raw colour literal under
`src/surfaces` or `src/components`.

It is deliberately narrow, and every failure names the primitive to use instead:

```
  src/surfaces/YourSurface.tsx:42  hand-rolled disabled control
    → render the command through <CommandButton>, which owns aria-disabled + the
      hover/focus explanation
```

Take the fix it names. Each allowlist entry is a canonical primitive; widening
one is a deliberate change with a comment, not a way past a red build.

## The two things the gate cannot check

Both of these have been shipped as defects here before. Neither is automatable,
so they are yours.

**1. Look at what you changed, in both themes.** These are seven *visual*
surfaces and the interesting failures are geometric — a label that clips, a wheel
that sizes itself wrong, a panel that hangs off the viewport edge. `mise run
check` passes happily on all of them. It also passes happily on a menu that is a
white plate on a black page: a colour regression is invisible in whichever theme
you happened to be in. So open `mise run dev`, open each direction you touched,
and use the demo header's light · dark · system control on each one. It is one
click per direction.

**2. Zod is a peer on `^3.24 || ^4`, and that range is load-bearing.** Hosts
mount this library by aliasing its TypeScript source, so `import { z } from
'zod'` resolves against *their* copy — and the app it was first built for is
still on zod 3. The dev dependency here is zod 4, which means a zod-4-only API
typechecks locally, passes CI, and explodes at a host's mount. If you touch a
schema, check the other major:

```bash
bun add -d zod@3.24.4 && mise run check    # then put zod 4 back
```

The trap that bites most often is `.default()` on a nested config object: its
argument is the *input* type on zod 3 (and is parsed) and the *output* type on
zod 4 (and is not). The shape that means the same thing on both is an
already-parsed object — `.default(() => TheSchema.parse({}))`, which is what the
config schemas use.

## Where the rest is written down

- [`README.md`](README.md) is the public API and is canonical for it.
- [`AGENTS.md`](AGENTS.md) is the working guide — which primitive owns what, the
  house rules this code is written against with the file or guard rule that
  enforces each one, and the traps this codebase has already paid for. It is
  long and written for coding agents, so it reads as process rather than prose.
  You do not need it to
  make a small change, but its *primitives* table is the fastest answer to "is
  there already something that does this?" — and the answer is usually yes.

Adding an eighth surface is five steps, listed under *Adding an eighth surface*
in `AGENTS.md`.

## Opening a pull request

Nothing ceremonial: one focused change, a green `mise run check`, and a
description that says what you changed and why.

If the change is user-facing, say which directions you opened and which themes
you looked at them in. That is the part no one else can reproduce from the diff,
and it is the review most of these changes actually need.
