---
name: Huuhka.net
description: A personal technical publication with an image-led article index.
colors:
  paper: "#ffffff"
  ink: "#202b3a"
  muted: "#596574"
  blue: "#087caf"
  link: "#076b97"
  line: "#dce3e8"
  popular-ground: "#f1f5f7"
  popular-hover: "#e8f0f5"
  control-border: "#b9c5ce"
  popular-hover-border: "#aabfcc"
  nav-highlight: "#eef1f3"
  article-ground: "#f7f9fa"
  image-backdrop: "rgb(20 29 40 / 82%)"
typography:
  brand:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  author:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  section:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "19px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  compact-title:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.012em"
  body:
    fontFamily: "'Source Sans 3 Variable', sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  date:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.04em"
  label:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
  tag:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.04em"
  code:
    fontFamily: "'SauceCodePro Nerd Font Mono', ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  reading-title:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "clamp(30px, 3.2vw, 44px)"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  reading-body:
    fontFamily: "'Source Sans 3 Variable', sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.7
  reading-heading:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.3
  reading-subheading:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.3
  reading-date:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
  reading-rail:
    fontFamily: "'Source Sans 3 Variable', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  reading-rail-label:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.06em"
  reading-next-title:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.45
  image-toolbar:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  inline-code:
    fontFamily: "'SauceCodePro Nerd Font Mono', ui-monospace, monospace"
    fontSize: "0.9em"
rounded:
  control: "6px"
  inline-code: "4px"
  popular-card: "12px"
  article-card: "14px"
  archive-image: "13px 13px 0 0"
  navigation: "9px"
  portrait: "50%"
spacing:
  compact: "12px"
  section-block: "24px"
  archive-separation: "28px"
  count-before: "8px"
  card-inset: "16px"
  popular-gap: "18px"
  archive-gap: "32px"
  article-inset: "22px"
  code-inset: "20px"
  desktop-gutter: "48px"
components:
  load-more:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 22px"
  load-more-hover:
    textColor: "{colors.link}"
  text-button:
    textColor: "{colors.link}"
    typography: "{typography.body}"
    padding: "0"
  search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    width: "340px"
  popular-card:
    backgroundColor: "{colors.popular-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.compact-title}"
    rounded: "{rounded.popular-card}"
    padding: "16px"
  popular-card-hover:
    backgroundColor: "{colors.popular-hover}"
  article-card:
    backgroundColor: "{colors.article-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.article-card}"
  article-content:
    padding: "22px"
  archive-image:
    backgroundColor: "{colors.popular-ground}"
    rounded: "{rounded.archive-image}"
  popular-image:
    backgroundColor: "{colors.popular-ground}"
    rounded: "{rounded.control}"
    width: "72px"
    height: "72px"
  popular-image-tablet:
    width: "56px"
    height: "56px"
  popular-image-phone:
    width: "62px"
    height: "62px"
  topic-tag:
    backgroundColor: "{colors.nav-highlight}"
    textColor: "{colors.muted}"
    typography: "{typography.tag}"
    rounded: "{rounded.control}"
    padding: "3px 8px"
  navigation:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.navigation}"
    padding: "7px 12px"
  navigation-current:
    backgroundColor: "{colors.nav-highlight}"
    textColor: "{colors.ink}"
  code-block:
    backgroundColor: "{colors.popular-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.popular-card}"
    padding: "20px"
  inline-code:
    backgroundColor: "{colors.popular-ground}"
    typography: "{typography.inline-code}"
    rounded: "{rounded.inline-code}"
    padding: "2px 5px"
  menu-toggle:
    backgroundColor: "{colors.nav-highlight}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    width: "44px"
    height: "44px"
  reading-prose:
    textColor: "{colors.ink}"
    typography: "{typography.reading-body}"
    width: "720px"
  reading-rail-desktop:
    width: "128px"
  reading-rail-large:
    width: "160px"
  reading-media-desktop:
    width: "800px"
  reading-media-large:
    width: "960px"
  reading-caption:
    width: "720px"
  image-viewer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.popular-card}"
    width: "calc(100% - 64px)"
  image-viewer-panel:
    padding: "16px 24px 24px"
  image-viewer-mobile:
    width: "calc(100% - 16px)"
  image-viewer-panel-mobile:
    padding: "12px 4px"
  image-viewer-close:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.image-toolbar}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  image-viewer-close-hover:
    backgroundColor: "{colors.nav-highlight}"
  reading-contents:
    textColor: "{colors.muted}"
    typography: "{typography.reading-rail}"
    padding: "7px 0 7px 14px"
  reading-contents-subheading:
    padding: "7px 0 7px 24px"
  reading-callout:
    backgroundColor: "{colors.popular-ground}"
    textColor: "{colors.ink}"
    padding: "16px 24px"
---

# Design system: Huuhka.net

## Overview

**Creative North Star: "Articles first"**

Huuhka.net is a personal technical publication. Article images, publication dates, and clear titles carry the index. The small author portrait and compact navigation identify Pasi without competing with the writing.

White backgrounds, slate text, restrained blue details, and sans-serif typography connect the index to the article reader. Compact popular links sit above larger padded archive cards. Long-form pages give prose, diagrams, and code their own reading space without changing the approved header or palette.

**Key Characteristics:**
- Image-led article links with compact topic tags, visible dates, and no excerpts.
- A light sticky header with the geometric H, mono navigation, and a single-row mobile menu trigger.
- Compact popular cards and roomier rounded archive cards with restrained borders.
- Centered long-form prose with a compact left reading rail, wider uncropped images, captioned image zoom, and horizontally scrolling code.
- A secondary author introduction with a real portrait.

The approved homepage composition and font choices remain unchanged. This document records the shared visual system and its implemented reader extension. Page composition lives in `.impeccable/surfaces/`. Source values come from `src/styles/global.css`, `src/styles/code.css`, `src/styles/article.css`, and `src/styles/image-viewer.css`; behavior comes from the page, layout, and header components. Migration scope and production limits belong in `docs/migration.md`.

## Colors

The palette uses cool neutrals with a small blue accent. Frontmatter holds the normative values.

### Primary

- `blue` colors the H, focus outlines, and input caret.
- `link` colors prose links, link feedback, and the current mobile menu item.

### Neutral

- `paper` fills the page, header, and controls. `ink` is primary text.
- `muted` is secondary copy, dates, tags, inactive navigation, and counts.
- `line` separates the header and footer and borders cards, code, and tables.
- `popular-ground` fills popular cards, code fallbacks, callouts, and table headings. `popular-hover` changes the popular-card hover fill.
- `nav-highlight` fills navigation highlights, menu buttons, and topic tags. `article-ground` fills archive cards.
- `control-border` outlines search, pagination, and image controls. `popular-hover-border` defines the popular-card hover edge.
- `image-backdrop` dims the article behind an enlarged image. It does not change the page or diagram palette.

**The restrained accent Rule.** Keep the header light. Concentrate blue in the logo, links, and keyboard focus rather than a full-width pastel band.

## Typography

Geist Sans is the approved heading and wordmark family, exposed as Geist Variable in CSS. Source Sans 3 Variable is the body font. Geist Mono Variable handles navigation, tags, and dates. Do not make body copy monospaced.

The existing index roles remain intact. Author and section headings are semibold; archive and popular titles use medium weight. At content widths of 700px and below, author and section headings become 24px. Archive and popular titles keep their desktop sizes. At the separate 760px header breakpoint, the wordmark becomes 21px and mobile page links use 16px Geist Mono. Phone introduction copy is 15px with 1.4 line height and a 29ch limit.

The reader uses the `reading-title`, `reading-body`, `reading-heading`, and `reading-subheading` roles. At 600px and below, prose becomes 18px, second-level headings 25px, and third-level headings 21px. The prose column is capped at 720px. Publication and updated dates use `reading-date`, uppercase letters, and tabular numerals. Archive dates retain their separate `date` role and tracking. Reader bylines and captions use 14px Source Sans 3. The enlarged-image toolbar uses `image-toolbar`. Existing article and index typography stays unchanged. Rail links use `reading-rail`; their compact navigation labels use `reading-rail-label`. Series names use 13px medium Geist Sans. The continuation title uses `reading-next-title`, becoming 16px on phones. Its mono navigation label uses 10px type with .04em tracking.

SauceCodePro Nerd Font Mono remains the code family for `pre`, `code`, `kbd`, and `samp`, with ligatures disabled. Its self-hosted regular, bold, italic, and bold italic WOFF2 faces use `font-display: swap`. The full glyph set, license, and conversion provenance remain in `public/fonts/sauce-code-pro/`. Inline code uses its existing relative-size role; block code keeps 14px and 1.65 line height. Syntax highlighting does not replace these font settings.

## Layout

The shared page container is `min(1200px, calc(100% - 96px))`. The header has a separate 1440px maximum width, 48px horizontal padding, and a 64px minimum height. It stays at the top with 80px document scroll padding. Between 701px and 1000px, page gutters become 32px. At 700px and below, they become 20px.

The index keeps compact section spacing and padded cards. Desktop archive grids have three columns and a 32px gap, then two columns through tablet widths and one at 700px and below. Popular cards have a separate tighter grid. The index brief records its composition and pagination.

The reader has a separate container of `min(1480px, calc(100% - 64px))`. At 1200px and above, its grid has a central 720px column, two equal flexible outside columns, and 36px gaps. Header, prose, and continuation link occupy the center column. The approved reader places the rail in the left column without shifting the prose away from the viewport center. Rail and media widths use the `reading-rail-desktop` and `reading-media-desktop` tokens, switching to their `large` variants at 1440px. The rail sticks at 96px and scrolls within a maximum height of `calc(100dvh - 120px)` with contained overscroll.

Feature images, standalone inline-image figures, and wide authored figures extend symmetrically beyond the prose. Captions remain centered and capped at `reading-caption` width. Media returns to text width below 1200px. Code and tables stay within the prose column. The image viewer uses `image-viewer` width with a 1600px maximum and `calc(100dvh - 48px)` maximum height. At 600px and below, it uses the mobile width and panel padding tokens, with a `calc(100dvh - 24px)` maximum height. Its image is contained within `calc(100dvh - 220px)`; captions stay below it.

At 1199px and below, the reader becomes a single column of `min(720px, calc(100% - 48px))`. Series and contents disclosures precede the article body, have no sticky positioning or internal height limit, and leave 24px below the rail. At 600px and below, the reader uses 20px side gutters. The reader footer shares the 720px center alignment, uses compact 12px text and 18px/24px vertical padding, and wraps its links on phones rather than creating a large stacked block.

The header switches at 760px independently of the content grid. With JavaScript it stays in one row with the brand, Sessionize link, and menu button. GitHub remains in the menu. The full-screen menu uses the device viewport height and safe-area bottom padding. Without JavaScript, page and social links remain visible and may wrap.

## Elevation & Depth

There are no shadows. White space, image blocks, borders, and cool card fills separate content. Card images place a muted, blurred copy behind the sharp foreground image to fill unused space. This fixed backdrop treatment is not a hover effect. Hover changes color and border without lifting or scaling cards.

Keyboard focus uses a 3px blue outline offset by 5px. Search instead uses a 2px outline offset by 2px on focus within. Card transitions take 160ms with `ease-out`; navigation changes take 150ms. The mobile menu uses a 160ms clipping animation. Reduced-motion preferences disable animations and transitions and use automatic scroll behavior. The sticky header uses z-index 10; modal dialogs use the browser top layer. The image viewer uses the `image-backdrop` scrim rather than a shadow and contains its own scrolling.

The contents marker is a 2px blue line beside the active link. Its vertical transform and the disclosure chevron rotation use 160ms `ease-out` transitions. Reduced-motion preferences remove both transitions. Current-link text uses ink and semibold weight; the marker carries position, not additional elevation.

## Shapes

Archive cards have rounded containers and 1px borders. Their image containers keep a 1.6 aspect ratio and use `archive-image` corners inside the outer border. The sharp foreground image fits fully inside the container without cropping. Popular cards remain compact rectangles with softened corners and square image containers; their foreground images also retain their full proportions. Navigation has its own radius; search, tags, and pagination use the smaller control radius. Only the author portrait is circular.

Reader feature images use 12px corners and `object-fit: contain`. The desktop reader removes the 440px feature-image maximum height so diagrams keep their full proportions. Below 1200px, the existing feature-image height limit remains. Body images keep their proportions and use 6px corners. Code uses the existing popular-card radius. Callouts have a single blue left border rather than a card outline.

## Components

### Header and navigation

Keep the blue geometric H beside the capitalized Huuhka.net wordmark. The desktop Articles link uses uppercase Geist Mono with neutral current, hover, and focus backgrounds. `aria-current` identifies the current page. About is hidden from desktop and mobile navigation until its content is ready; the author archive and article bylines remain intact. LinkedIn, GitHub, Sessionize, and RSS icon links have accessible names. Sessionize uses the inline Simple Icons mark documented in `docs/icon-sources.md`.

The phone header has a 44px menu button. Its native modal dialog contains the brand, close control, page links, and labeled social links. Opening locks background scrolling. The close button and menu links dismiss it; closing restores focus to the trigger on mobile. Resizing to desktop closes it and focuses the current desktop page link. Preserve the no-JavaScript fallback. These implemented behaviors do not constitute a full keyboard audit.

### Popular and archive cards

Popular cards use a filled rectangle with a thumbnail, compact title, and corner arrow. The desktop minimum height is 116px; mobile uses 96px. Their three selections remain provisional, not analytics rankings, and the sample-selection label stays absent. The existing arrow is decorative; local article links must not be documented as external destinations.

Archive cards place up to two non-interactive topic labels above the title and a date opposite Read more below it. Suppress the redundant Artificial Intelligence label when AI is also present. Content has 22px desktop padding, 20px mobile padding, and 30px above metadata. The full card is a local article link with the title as its accessible name; Read more is not a nested link. Hover changes the border and underlines the blue Read more cue.

`CardImage` supplies the same treatment to homepage popular and archive cards and to tag and author archive cards. Both layers use the existing image URL. The foreground uses `object-fit: contain`; the decorative backdrop uses `object-fit: cover`, a 16px blur, scale 1.12, and opacity 0.3. The container clips the backdrop. The backdrop image has `aria-hidden="true"`, empty alternative text, and no pointer events. Card links retain their text labels.

Popular image dimensions use `popular-image`, switching to the tablet variant between 701px and 1000px and the phone variant at 700px and below. Archive aspect ratios, card radii, padding, and grid dimensions do not change. Both layers share the caller's loading policy, which defaults to lazy loading. No image assets are generated or edited for this treatment. Reader images and their zoom behavior stay separate.

### Search and progressive loading

The bordered search field has an accessible label, search icon, and an inline clear button when text is present. Fuzzy search covers the complete collection, including posts not yet shown. Counts are announced politely. No matches show a short explanation and a Clear search action. Escape clears the query and restores input focus; the URL reflects the query.

Load more uses a 46px minimum height and reveals another batch of articles. It disappears when no results remain. Focus moves to the first newly revealed article without forced scrolling. Without JavaScript all articles remain visible and search and loading controls stay hidden. The homepage brief owns the batch size, not the shared tokens.

### Article reading

The header contains an All articles link, title, author link, original publication date, and linked tags. If the updated calendar date differs, show Updated beside the author and publication date rather than repeating it below the article. Tag archives reuse the index card treatment. The optional feature image starts the centered article body and retains its original caption.

The compact rail groups native series disclosures with On this page. Series disclosures start collapsed at every width and remain user-controlled. Contents includes the shallowest eligible heading depth of two or greater and its immediate subheading depth, in article order. Show On this page when that combined list has more than one entry. Primary links use a 14px left inset; immediate subheadings use 24px. JavaScript opens contents at 1200px and above and closes it below that threshold, resetting the default when the breakpoint changes. Without JavaScript, all disclosures remain usable and initially collapsed. On narrow screens summaries have at least 44px height and links at least 38px height.

Contents links track the section crossing a 112px reading line below the viewport top. The active link receives `aria-current="location"`, darker semibold text, and the moving blue marker. Scroll, resize, hash changes, disclosure changes, body resizing, and font readiness schedule updates. On desktop, tracking keeps the selected rail entry visible without scrolling the article. Heading anchors combine 24px scroll margins with global 80px scroll padding, placing targets 104px below the top.

Series membership and ordered post lists come from content metadata, not title matching. An article can appear in several series; the current article uses `aria-current="page"` in each list. Only explicit theme-navigation callouts move into this navigation. Warnings and other author notes remain in the article.

Below blog prose, one compact continuation link points to the next member of the primary series when available, otherwise to the older article. The label names the series or says Older article. The primary series is the first matching group in the series data file. Do not add repeated author blocks, updated dates, or another archive-return link at the bottom. Community pages do not enter the blog sequence. The shared reader footer contains copyright, Community activities, and RSS in a compact row that can wrap.

### Article images and zoom

The centered reader is the only layout. Its rules live in `src/styles/article.css` and apply without JavaScript. Reader query parameters, variant attributes, comparison controls, and interactive demos have been removed.

Standalone image paragraphs become semantic figures at build time. An adjacent imported caption joins the figure without editing MDX or changing its text. Linked images retain their authored destinations. `ReaderFigure` defaults to wide media and preserves its children's interactions; `width="text"` keeps a figure in the prose column.

JavaScript wraps unlinked article images outside authored `ReaderFigure` blocks in buttons with accessible names. The image itself is the control, with a zoom-in cursor and visible keyboard focus. Do not add a visible Zoom label, icon, or other image overlay cue. Without JavaScript, images and captions remain readable without inactive controls.

The native image dialog shows the enlarged image, its caption when present, Open original, and Close. Open original links to the same full local asset in a new tab. Close, Escape, and a backdrop click dismiss the dialog, restore focus without scrolling, and release the document scroll lock. Toolbar targets are at least 44px high. Caption content and links are retained, with copied IDs removed. Dialog behavior has desktop and phone spot checks, not a full-site keyboard or real Safari audit.

### Privacy and comments

The footer adds Privacy and Privacy settings. A non-modal analytics panel sits
at the bottom of the viewport without blocking reading. It uses the existing
paper, ink, line, and link colors. Accept analytics and Reject analytics use the
same outlined button treatment and 46px minimum height. The panel stacks its copy
and actions on narrow screens and can scroll on short viewports. It does not
steal focus when first shown. Opening it from the footer focuses a choice;
closing or choosing returns focus to Privacy settings.

Blog posts add a Comments section after the continuation link, within the prose
width. A quiet top border separates it from the article. Explain public GitHub
comments before the Show comments button; retain a GitHub link as the no-script
and error fallback. The embed loads only on request, uses the light giscus theme,
and stays off on preview hosts. Loading comments never grants analytics consent.
The shared visual tokens are unchanged.

### Code, tables, and callouts

Code blocks retain the existing light fallback fill, quiet border, padding, radius, and vertical margins. Syntax-highlighted blocks may supply their own theme colors. Preserve whitespace, two-space tabs, and horizontal scrolling within the available width. Nested code does not add another fill or padding. Inline code can wrap long tokens.

Tables scroll inside the article, use 16px text, quiet cell borders, and filled header cells. Callouts use the `reading-callout` treatment with a blue left border. Embedded video keeps a 16:9 ratio; playback still depends on the external host.

## Do's and Don'ts

### Do

- Keep the author's real portrait and published article imagery.
- Keep publication dates visible and preserve original article metadata.
- Distinguish compact popular links from larger padded archive cards.
- Keep keyboard focus visible and preserve usable article links without JavaScript.
- Use Geist Sans for headings and the wordmark, Source Sans 3 for body copy, Geist Mono for navigation, tags, and dates, and SauceCodePro Nerd Font Mono for code.
- Keep the contents list before prose in document order and allow code and tables to scroll within the reader.
- Give article images the approved wider measure while keeping prose and captions centered. Preserve authored image links and usable images without JavaScript.

### Don't

- Don't present provisional popular selections as measured rankings.
- Don't replace the light header with a flat pastel navigation band.
- Don't introduce a serif publication masthead or invented promotional copy.
- Don't crop the sharp foreground image in cards, article diagrams, or feature images. Only decorative card backdrops use cover cropping.
- Don't treat browser spot checks as a full keyboard or screen-reader audit.
