# Security policy

## Supported versions

This project is pre-1.0. Fixes land on `main` and go out in the next release;
there are no maintained release branches, so **the latest release is the only
supported version**.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it through GitHub's private vulnerability reporting, which is enabled on
this repository:

> [**Report a vulnerability**](https://github.com/binaryplease/binp-context-menu/security/advisories/new)
> — or, from the repository, the *Security* tab → *Report a vulnerability*.

That channel is private between you and the maintainers, and it is the one that
is monitored. You do not need a special relationship with the project to use it.

Please include what you would want to receive yourself: the version or commit,
what an attacker gets, and the shortest path to reproducing it.

**What to expect.** An acknowledgement within 7 days and an assessment within 14.
If the report is valid we will agree a disclosure timeline with you and credit
you in the advisory unless you would rather we did not. If we disagree that it is
a vulnerability, you will get the reasoning rather than silence.

## What is in scope

This is a **client-side React library**. It ships no server, no API client, no
authentication and no network calls — the demo is a static bundle and nothing is
fetched from a third party at runtime. That narrows the realistic surface to
roughly:

- **`Command.href` handling.** Links render as real anchors and script-executing
  schemes are refused when the command is parsed (`isSafeHref`, tab/newline
  evasions included). A scheme that gets past that filter is a vulnerability —
  please report it.
- **Host-supplied data rendered as content.** Command labels, details, kind
  labels and disabled reasons come from the host application. A path by which
  any of them escapes text rendering is in scope.
- **Persistence.** The library hands config to *your* persist functions and
  parses what comes back through Zod. A malformed or hostile stored config that
  gets past schema parsing into unsafe behaviour is in scope.
- **Supply chain.** Anything about this package's own dependency set or its
  published artifact.

## What is out of scope

- The behaviour of commands themselves. `onRun` is the host's callback and what
  a command *does* is the host application's responsibility, not the library's.
- Whatever a host chooses to put in a `Command.label`, `detail` or `href`. The
  library refuses unsafe schemes and renders the rest as text; it does not
  validate that a host's own data is trustworthy.
- The hosted demo's content. It is a static bundle of this repository with
  example commands that do nothing.
- Findings from an automated scanner with no demonstrated impact on this
  library. Please show the path.
