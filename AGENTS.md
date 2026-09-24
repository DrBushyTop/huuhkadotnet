# Working in this repository

This folder is the Astro application and Git root. Keep application and design
work here. The older application in the parent folder is not part of this build.

## Design work

- Use the local Impeccable skill at `.agents/skills/impeccable/SKILL.md`.
- Read `PRODUCT.md` for product constraints and `DESIGN.md` for the design system.
- Read `.impeccable/surfaces/src-pages-index-astro.md` for homepage decisions.
- Keep `.impeccable/design.json` consistent with approved design-system changes.
- Preserve real article titles, publication dates, images, and destination URLs.
- Deploy when the requested work needs Azure verification. Do not remove
  `noindex` or add analytics to the public site without an explicit request.
  Never modify production Ghost during ordinary development.

Run the skill launcher from this directory:

```sh
.agents/skills/impeccable/scripts/impeccable context --target src/pages/index.astro
.agents/skills/impeccable/scripts/impeccable doctor --json
```

Run context once per design session. The launcher downloads a version-pinned
platform binary when none is available. Local binaries are ignored by Git.

## Verification

Run `npm run build` and `npm test` after code changes. Check desktop and phone
layouts in the shared browser for visual changes. Report the limits of what was
tested, especially keyboard behavior and untested external embeds.

Apply the `unslop` skill when available. Keep prose plain and concise.
