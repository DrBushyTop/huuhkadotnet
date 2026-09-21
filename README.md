# Huuhka.net

Preliminary Astro homepage based on the approved popular-first composition.

```sh
npm install
npm run dev
```

`npm run build` checks types and creates the static site in `dist/`.
`npm test` tests the search and preview data. Node 22.12 or newer is required.

## Preview scope

- Popular picks above a three-column dated archive, with compact rectangular cards.
- Twelve articles initially, then a button to reveal the remaining posts.
- Fuzzy search across all included article titles and tags, including unloaded rows.
- Original images stored locally, with below-the-fold article images lazy-loaded.
- All article, author, and RSS links still open the existing huuhka.net.
- Without JavaScript, all included articles remain visible.

`src/data/posts.json` is a snapshot of the public RSS feed taken September 21,
2026. It is preview data, not the completed Ghost migration. Popular picks are
sample selections, not analytics rankings. Image origins are recorded in
`public/images/provenance.json`.

Headings and the wordmark use Geist Sans. Navigation, tags, and dates use Geist
Mono. Body copy uses Source Sans 3. These fonts are self-hosted through
Fontsource packages. Code uses SauceCodePro Nerd Font Mono, with WOFF2 files,
license, and provenance in `public/fonts/sauce-code-pro/`. Code defaults are in
`src/styles/code.css`; other styles are in `src/styles/global.css`.

## Design context

- `PRODUCT.md`: audience, product constraints, and approved direction.
- `DESIGN.md`: current fonts, colors, spacing, and component rules.
- `.impeccable/design.json`: machine-readable design metadata and specimens.
- `.impeccable/surfaces/src-pages-index-astro.md`: homepage decisions.
- `.impeccable/config.json`: comp-led preference for new design explorations.
- `AGENTS.md`: repository instructions for future coding sessions.

The Impeccable skill lives in `.agents/skills/impeccable/`. Run its launcher
from this repository, for example:

```sh
.agents/skills/impeccable/scripts/impeccable doctor --json
```

The preview includes `noindex, nofollow` and a blocking `robots.txt`. Remove
those only when the migrated site is ready for production. No analytics,
content migration, redirects, or deployment are included in this pass.

## Remote preview

The dev server accepts the existing M1 Tailscale hostname. Keep it on loopback
and expose it through Tailscale Serve, not a public listener:

```sh
tailscale serve --bg --https=8445 http://127.0.0.1:4321
```

Stop this preview with
`tailscale serve --https=8445 off`.
