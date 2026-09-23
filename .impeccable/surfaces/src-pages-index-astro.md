---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets:
  - "src/components/FieldNotesHome.astro"
  - "src/components/PopularPosts.astro"
---

# Homepage

The owner selected fieldnotes as the sole homepage on September 23. `/` renders `FieldNotesHome.astro`. The owner also selected the ink popular-card presentation with code-block colors.

## Direction contract

THESIS: A featured article with its original architecture diagram, three compact popular articles, and a searchable text list of all writing.

OWN-WORLD: White light-mode ground, dark ink, fine rules, and incumbent Geist titles. Dark mode uses Macchiato. Preserve the shared header and real article content.

STORY: Read the featured article, open a popular post, or search all 55 articles by title or tag. Dates and reading estimates come from the content.

FIRST VIEWPORT: The author introduction precedes the hero, popular cards, and search above the independently scrolling list. The footer stays pinned.

FORM: One homepage at `/`. The article list needs no pagination.

FINISH: The build and tests pass. Browser checks confirm that cards and search match the code-block background in light and dark modes, search and Escape reset work, and desktop and phone layouts have no horizontal overflow. The compact desktop list retains two rows above the footer.

## Homepage behavior

The featured article is "Building your own PR reviewer with coding agents". Its original image, excerpt, date, and reading estimate remain. Three popular selections use the owner-supplied ranking.

All 55 article rows are available in a keyboard-focusable, independently scrolling region, including without JavaScript. There is no homepage pagination or automatic loading. Search filters only the list, leaving the hero and popular cards visible. Root `?q=` bookmarks search this list directly. Clear, Escape reset, query history, and the no-results state remain supported. Each search resets the list scroll position.

On desktops wider than 1000px and at least 760px high, the layout fits the viewport and only the list scrolls. The hero, cards, search, and footer stay in place. At desktop heights from 760px to 820px, tighter introduction and hero spacing preserves list space. Narrow or short screens allow page scrolling, with the footer pinned and the list at 55dvh.

## Popular component choice

The selected `PopularPosts.astro` cards place artwork on the right. Cards and image panels use `var(--code-ground)` with `var(--ink)` text; homepage search also uses `var(--code-ground)`. These reuse the code-block colors, light gray in Latte and dark in Macchiato. Card hover uses the existing popular-hover background and link color.

## Assets and boundaries

The hero reuses `public/images/ghost/8646679fc3845554da55.png` from the article frontmatter. Popular cards reuse existing `CardImage` assets and the pre-existing `public/images/pasi.webp` fallback. Original raster files remain unchanged. No new imagery is needed.

Global DESIGN.md, tokens, and `.impeccable/design.json` remain unchanged. The pre-existing doctor warning that DESIGN.md is newer than its sidecar remains outside this task. Local noindex and preview analytics exclusions remain. No deployment or analytics change accompanies this work.

On phone and short viewports, scrolling past either end of the article list passes to the page through native scroll chaining. Desktop layouts with a fixed page keep list scrolling contained.

Desktop writing rows vertically center dates, reading times, titles, and arrows. Metadata columns are 100px and 48px with 20px gaps, reducing the empty space before titles. Phone rows retain metadata above the title.

The author introduction includes the original circular portrait, 44px on desktop and 56px on phone. The homepage document title is `Huuhka.net | Pasi Huuhka`. Compact toolbar spacing preserves room for the writing list.
