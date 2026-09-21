# Huuhka.net

Static Astro blog with published Ghost content migrated to MDX. No CMS, database,
or production connection is needed to run the site.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4321`. Node 22.12 or newer is required.

```sh
npm run build
npm test
npm run validate:migration
npm run validate:local # requires the dev server
```

The homepage shows 12 articles at a time and searches the full collection. Article,
tag, author, community, and RSS links resolve locally. JavaScript is optional for
reading; without it, the archive shows every article.

## Write an article

Add `src/content/blog/your-slug.mdx` using an existing post as a template. Keep
`publishedAt` and `updatedAt` as quoted ISO timestamps. The filename and frontmatter
slug should match. `draft: true` excludes a post from public routes and feeds.

Use `tags` for display names and matching `tagSlugs` for archive URLs. Define any
new tags in `src/data/tags.json`. Store new images under `public/images/` and use
root-relative paths. Author information lives in `src/data/author.json`.

For a series, add its ID to the post's `series` array and add the post slug to the
ordered definition in `src/data/series.json`. Keep both in sync. Series links
appear in the reader's collapsible navigation, not in an opening callout.
Contents includes section headings and their immediate subheadings in article
order, starting at the shallowest heading depth of two or greater. The contents
disclosure appears when that list has more than one entry.

Plain Markdown works inside MDX. Use fenced code with a language identifier.
Migrated files include explicit anchors to preserve old links; new headings get
IDs automatically. Bespoke MDX components can be imported when needed.

`migration/` contains source-comparison records, not a second content store.
Intentional edits to migrated content may need corresponding validation changes;
do not blindly update the baseline to hide missing content.

## Design and migration

- `DESIGN.md` and `PRODUCT.md` describe the approved design and product constraints.
- `.impeccable/surfaces/` records page-specific decisions.
- `.agents/skills/impeccable/` contains the local design skill.
- `docs/migration.md` covers import tooling, source attribution, verification,
  known limits, and work deferred until deployment.

Headings use Geist Sans, navigation and metadata use Geist Mono, body text uses
Source Sans 3, and code uses SauceCodePro Nerd Font Mono. All fonts are self-hosted.
Font licenses and code-font provenance are under `public/fonts/`.

Azure deployment and GitHub Actions are configured under [deployment/](deployment/README.md).
Indexing remains blocked until custom-domain cutover. Analytics are disabled.

## Article images

The reader keeps text centered at 720px and puts the desktop
reading rail on the left. Feature images and standalone inline images widen to
800px at a 1200px viewport and 960px at 1440px. Captions stay at text width. Phone
images retain the 20px page gutters.

Click or focus and press Enter on an unlinked image to open its enlarged view with
the original caption. Open original links to the full asset. Close, Escape, or a
backdrop click dismisses the view and restores focus. Authored image links keep
their destinations. Without JavaScript, images and captions remain readable.
The build groups imported images and adjacent captions without rewriting MDX.
Image buttons have accessible names, focus rings, and a zoom-in cursor, with no
visible Zoom label or icon. Only the centered reader remains; comparison query
parameters and demos have been removed.

`ReaderFigure.astro` defaults to `width="wide"` for future MDX diagrams or
interactive components. It uses the approved wider media width on desktop; choose
`width="text"` to keep it within the prose column. Its children keep their own
behavior and are excluded from automatic image zoom. No animation framework is
required.

## Shared local preview

The server binds to loopback. The existing private Tailscale preview can point at it:

```sh
tailscale serve --bg --https=8445 http://127.0.0.1:4321
```

Stop that preview with `tailscale serve --https=8445 off`.
