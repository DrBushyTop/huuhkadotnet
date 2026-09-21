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
  inline-code:
    fontFamily: "'SauceCodePro Nerd Font Mono', ui-monospace, monospace"
    fontSize: "0.9em"
rounded:
  control: "6px"
  inline-code: "4px"
  popular-card: "12px"
  article-card: "14px"
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
---

# Design system: Huuhka.net

## Overview

**Creative North Star: "Articles first"**

Huuhka.net is a personal technical publication. Article images, publication dates, and clear titles carry the page. The small author portrait and compact navigation identify Pasi without competing with the writing.

The implemented direction uses white backgrounds, slate text, restrained blue details, and sans-serif typography. Compact popular links sit above larger rounded archive cards with padded text, topic tags, and dates. This is the approved preliminary homepage direction, not final production polish.

**Key Characteristics:**
- Image-led article links with compact topic tags, visible dates, and no excerpts.
- A light sticky header with an original geometric H, mono navigation, and a single-row mobile menu trigger.
- Compact popular cards and roomier rounded archive cards with restrained borders.
- A secondary author introduction with a real portrait.

Source authority: the user selected round-four A on September 21, 2026, then requested the more prominent compact rectangular popular cards. The user subsequently requested Encore-like mono navigation and neutral highlights, a single-row mobile header with a menu, and rounded padded archive cards with compact topic tags and smaller titles. The user then approved Geist Sans for headings, article titles, and the wordmark. These refinements supersede the earlier unboxed cards and provisional font choices. The homepage composition belongs in `.impeccable/surfaces/src-pages-index-astro.md`. The tokens here come from `src/styles/global.css` and `src/styles/code.css`; markup and behavior come from `src/components/Header.astro`, `src/pages/index.astro`, and `src/layouts/Base.astro`. `package.json` records the installed font packages. `PRODUCT.md` retains migration and product constraints. Shipping image sources are recorded in `public/images/provenance.json`.

The requested header, card, and font refinements are implemented. Geist Sans is the approved heading and wordmark family; Source Sans 3 remains the body font, and Geist Mono handles navigation, tags, and dates. The earlier article-reader sidebar and mobile-control arrangements are proposals, not an implemented or approved reading system. Bespoke posts may vary visually, and external destinations should remain identifiable. Content migration and deployment are separate work.

## Colors

The palette uses cool neutrals with a small blue accent. Frontmatter records the current CSS values rather than the earlier mockup estimates.

### Primary

- `blue` colors the H, focus outlines, and input caret.
- `link` is the darker blue for link feedback and the current mobile menu item.

### Neutral

- `paper` is the page and control background. The header stays light.
- `ink` is primary text, including article titles and the current desktop navigation item.
- `muted` is secondary copy, dates, topic tags, inactive navigation, search hints, and counts.
- `line` separates the header and footer and borders both card types.
- `popular-ground` fills popular cards and unloaded image areas. `popular-hover` changes their hover fill.
- `nav-highlight` fills active and hovered navigation, menu buttons, and topic tags. `article-ground` fills archive cards.
- `control-border` outlines search and pagination controls. `popular-hover-border` defines the popular-card hover edge.

**The restrained accent Rule.** Keep the header light. Concentrate blue in the logo, links, and keyboard focus rather than a full-width pastel band.

## Typography

The user approved Geist Sans for all headings, archive and popular titles, and the Huuhka.net wordmark. Its CSS family is Geist Variable. Source Sans 3 Variable remains the body font. Geist Mono Variable handles navigation, topic tags, and dates. `Base.astro` imports Geist and Source Sans 3; `Header.astro` imports Geist Mono. These replace the earlier provisional Manrope treatment.

The frontmatter captures the desktop hierarchy. Author and section headings share a 26px size and 600 weight. Archive titles use 19px at 500 weight; popular titles use 16px at 500 weight. Dates sit in the card footer, with tabular numerals. Navigation, tags, and dates use uppercase letters with modest positive tracking. Body copy remains sans-serif rather than adopting mono throughout.

At content widths of 700px and below, the author and section headings become 24px. Archive titles remain 19px and popular titles remain 16px. At the header's separate 760px breakpoint, the wordmark becomes 21px. Mobile menu page links use 16px Geist Mono. The introduction copy becomes 15px with a 1.4 line height and a 29ch maximum width. Secondary counts and footer copy use 14px.

The user selected SauceCodePro Nerd Font Mono for code. `Base.astro` imports `src/styles/code.css`, which defines the code font, 14px block size, and 1.65 line height. The self-hosted WOFF2 files include regular, bold, italic, and bold italic faces, with normal and italic styles at weights 400 and 700 and `font-display: swap`. The full glyph set is retained. The files, license, and conversion provenance are in `public/fonts/sauce-code-pro/`. Use this family for `pre`, `code`, `kbd`, and `samp`, with ligatures disabled. Inline code, keyboard input, and sample output use 0.9em.

Do not add a large display type role or a serif masthead. Long-form reading measures and the complete article reader still await implementation.

## Layout

The shared page container uses `min(1200px, calc(100% - 96px))`. The header has a separate 1440px maximum width, 48px horizontal padding, and a 64px minimum height. It is sticky at the top, with 80px document scroll padding. The author introduction uses a 56px portrait with a 19px gap and 24px top and bottom padding at every width.

Desktop archive grids have three equal columns with a shared 32px gap. Popular groups also have three columns, with their own tighter gap. Section headings leave 12px below them. The archive starts 28px after the popular cards. The archive search field sits beside its heading, and its result count has 8px above and 16px below. Archive cards stretch their links to the full card height; their padded content grows so metadata aligns toward the bottom.

Between 701px and 1000px, page gutters become 32px and the archive has two columns. Popular cards remain in three columns, but each places its image above its title with 14px padding and 56px thumbnails.

At 700px and below, page gutters become 20px. The portrait becomes 48px. Both card groups become one column; popular cards return to horizontal image-and-title layouts with 62px thumbnails and 13px padding. The archive starts 24px after the popular cards. Its search field takes the full width below the heading with a 12px gap. Introduction padding, heading bottom margin, and result-count margins stay unchanged. Archive gaps become 28px, card content padding becomes 20px, and the footer stacks vertically.

The header switches at 760px, independently of the content grid. With JavaScript, it stays in one row with the brand, GitHub icon, and menu button. The full-screen menu uses the device viewport height and safe-area bottom padding. Without JavaScript, ordinary page and social links remain visible and may wrap to a second row.

The page scrolls normally. The current preview shows twelve articles before an explicit loading control, not automatic infinite scrolling. This pagination count describes the homepage implementation, not a universal layout token.

## Elevation & Depth

There are no shadows. White space, image blocks, borders, and the cool card fills separate content. Hover changes color and border only; cards do not lift or scale.

Keyboard focus uses a 3px blue outline offset by 5px. The search container instead uses a 2px blue outline offset by 2px on focus within. Popular-card fill and border transitions and archive-card border transitions take 160ms with `ease-out`. Navigation color and background changes take 150ms. Opening the mobile menu reveals the page links with a 160ms clipping animation, without moving the page. Reduced-motion preferences disable animations and transitions and use automatic scroll behavior. The sticky header sits at z-index 10; the modal dialog uses the browser top layer.

## Shapes

Archive cards use rounded containers with 1px borders. Their images have a 1.6 aspect ratio and 13px upper corners that fit inside the outer card border; lower image corners stay square. Popular cards remain compact horizontal rectangles with softened corners, and their square thumbnails use the control radius. Navigation and menu controls have their own 9px radius. Search, topic tags, and pagination controls share the smaller control radius. Only the author portrait is circular. The previous active-navigation underline is replaced by a neutral rounded highlight.

## Components

### Header and navigation

Keep the original blue geometric H next to the capitalized Huuhka.net wordmark. Desktop Articles and About links use lightweight uppercase Geist Mono. Current, hover, and keyboard-focus states use neutral rounded backgrounds; `aria-current` identifies the page. LinkedIn, GitHub, and RSS are icon links at the right with accessible names. All links retain the global keyboard-focus outline.

The mobile header stays in one row with a GitHub link and a 44px menu button. The menu is a full-screen native modal dialog with the brand, a close button, large page links, and labeled social links at the bottom. Opening it locks background scrolling. The close control has autofocus; the close button and menu links dismiss the dialog. Native Escape dismissal is expected from the modal dialog but has not been confirmed through the T3 browser checks. Closing restores focus to the trigger on mobile. Resizing to desktop closes it and focuses the current desktop page link. Preserve the no-JavaScript navigation fallback.

### Popular cards

Use a filled, bordered rectangle with a thumbnail, compact title, and external-link arrow. The desktop minimum height is 116px; mobile uses 96px. The whole rectangle is a link. The title uses the compact-title role, and hover changes both fill and border.

The user requested removal of the visible "Sample selection" label. Keep it absent from the interface. Internally, the current three cards remain provisional picks from the first three preview entries, not verified analytics rankings.

### Archive cards

Use a large image followed by a padded content area. Compact topic tags precede the smaller title; the footer places the publication date opposite a Read more cue. Content padding is 22px on desktop and 20px on mobile, with 30px space above the metadata row. The light card fill and border enclose the whole link. Images crop with `object-fit: cover`. Hover darkens the border and turns the Read more cue blue with an underline; the title does not change color.

The whole card links to the original published article and uses the title as its accessible name. Read more is a visual cue, not a nested link. Show at most two non-interactive topic tags, suppressing the redundant Artificial Intelligence label when AI is also present. Tags wrap safely and do not replace fuzzy search with category filters. Preserve exact stored article metadata when migration begins.

### Code

Code blocks use a light fallback fill, a 1px quiet border, and the same 12px corner radius as popular cards. Keep 20px padding and 24px vertical margins. Blocks stay within the available width and scroll horizontally when needed; preserve whitespace and use a two-space tab size. Nested code inherits the block font size and line height without another fill or padding.

Inline code has a light fill, 4px corners, and 2px by 5px padding. Long inline tokens may wrap anywhere. Do not substitute Geist Mono for the code font: Geist Mono remains the navigation, tag, and date family. These defaults do not establish a syntax-highlighting palette or claim a finished article reader.

### Search

The bordered field has a search icon, an accessible label, and an inline clear button when text is present. Fuzzy search covers all fifteen preview entries, including entries not yet revealed. Counts are announced politely; no matches show a short explanation and a Clear search action. Escape clears the query and restores input focus. The query is reflected in the URL.

### Buttons and progressive loading

The bordered Load more button uses a 46px minimum height and the smaller corner radius. Its hover state changes text and border to blue. It reveals the remaining three preview articles, then disappears. Keyboard focus moves to the first newly revealed article without forced scrolling. The Clear search text button uses link blue and an underline on hover.

Without JavaScript, all fifteen article links remain visible and search and loading controls stay hidden. The footer identifies this as a design preview. Article, About, and RSS links still point to the live publication; this is not a completed local article reader.

## Do's and Don'ts

### Do

- Keep the author's real portrait and published article imagery.
- Keep publication dates visible and preserve the original article metadata.
- Distinguish compact popular links from larger padded archive cards.
- Keep keyboard focus visible and preserve usable article links without JavaScript.
- Use Geist Sans for headings and the wordmark, Source Sans 3 for body copy, Geist Mono for navigation, tags, and dates, and SauceCodePro Nerd Font Mono for code.

### Don't

- Don't present sample popular selections as measured rankings.
- Don't add excerpts, category-filter chips, a topic sidebar, or an oversized author hero to the approved homepage.
- Don't replace the light header with a flat pastel navigation band.
- Don't introduce a serif publication masthead or invented promotional copy.
- Don't claim the article reader, content migration, or deployment is complete.
