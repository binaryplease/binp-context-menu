# Third-party notices

context menu is under the MIT License. Its text is the LICENSE file at the
root of this repository, and it is reproduced at the foot of this page in the
copy that ships with the built demo.

This file covers the third-party software that travels with the library: the
fonts bundled into that demo, and the packages it depends on.

The dependencies are all MIT, which asks only that their notices travel with a
redistribution. The two font families are under the SIL Open Font License 1.1,
which asks for the copyright notice AND the licence text. The demo self-hosts
its faces rather than linking a font CDN, so the font files are
inside dist/demo, and the notice has to be inside it too. That is why this file
is emitted into the build as third-party-notices.html and linked from the demo's
sidebar -- see scripts/thirdPartyNotices.ts. There is one copy of this text, and
this is it.


## Fonts -- SIL Open Font License 1.1

### Inter

Bundled via the package @fontsource-variable/inter.
Upstream: https://github.com/rsms/inter

    Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) Inter-Italic[opsz,wght].ttf: Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)

### JetBrains Mono

Bundled via the package @fontsource/jetbrains-mono.
Upstream: https://github.com/JetBrains/JetBrainsMono

    Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) JetBrainsMono-Italic[wght].ttf: Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)

### The licence, in full

Both families are licensed under the SIL Open Font License, Version 1.1, and
both ship byte-identical copies of its text. It is reproduced once below,
verbatim, and applies to each of them. It is also available with a FAQ at
http://scripts.sil.org/OFL

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.

## Packages -- MIT License

Each of these is under the MIT License, whose text is the same as this project's
with its own copyright holder in place of ours.

  @tabler/icons-react   Copyright (c) 2020-2024 Pawel Kuna
                        https://github.com/tabler/tabler-icons

  react                 Copyright (c) Meta Platforms, Inc. and affiliates.
                        https://github.com/facebook/react

  react-dom             Copyright (c) Meta Platforms, Inc. and affiliates.
                        https://github.com/facebook/react

  tailwindcss           Copyright (c) Tailwind Labs, Inc.
                        https://github.com/tailwindlabs/tailwindcss

  zod                   Copyright (c) 2020 Colin McDonnell
                        https://github.com/colinhacks/zod

react, react-dom and zod are peer dependencies -- a host supplies its own
copies, and this list records what the demo builds against.
