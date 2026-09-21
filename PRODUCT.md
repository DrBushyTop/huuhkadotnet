# huuhka.net

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro with Git-backed MDX content collections and local static assets.

## Users

Developers finding and reading Pasi Huuhka's hands-on Azure, DevOps, and AI engineering articles.

## Product purpose

A personal technical publication. Readers should be able to find a relevant post and read explanations, code, and architecture diagrams. The author profile stays secondary to the writing. The site supports its original light appearance and Catppuccin Macchiato dark mode, following the device by default with a saved reader override.

## Capabilities and constraints

- Preserve published article content, exact root-level slugs, timestamps, tags, images, captions, and explicit SEO metadata.
- Keep local article routes, tag archives, the author page, community activities, RSS, and sitemap. Author information remains global.
- Search covers the complete post collection. The homepage initially shows 12 posts and loads 12 more at a time; without JavaScript every post is visible.
- Builds use committed MDX and assets.
- Current work is local only. Do not deploy, change DNS, or modify production Ghost or Azure resources. Keep `noindex, nofollow` and the blocking robots file locally. Umami runs without analytics cookies or a consent banner on public HTTPS domains and honors Do Not Track; previews never load analytics or giscus.
- Eventual hosting belongs in Microsoft Azure Sponsorship, subscription `ede0939c-80c4-4dfe-bf3d-84521f3f6d1f`. The hosting adapter and DNS provider remain open decisions.

## Brand commitments

Keep huuhka.net and Pasi Huuhka as the publication and author identities, with the real portrait and published article imagery. Preserve the approved compact, light header and image-led homepage. Use Geist Sans headings and wordmark, Source Sans 3 body copy, Geist Mono navigation and metadata, and SauceCodePro Nerd Font Mono code. DESIGN.md records the visual rules; page briefs record composition.

The three popular selections follow the owner-supplied analytics ranking, excluding the front page. They are fixed article links, not a live analytics feed. Keep room for bespoke article visuals and explicitly external destinations without redesigning the shared index.

## Reading and series navigation

Keep desktop article text centered independently of the compact left reading rail. The approved reader gives images more width without widening prose or captions. Unlinked article images can open in a captioned viewer; authored image links retain their destinations. On narrow screens, native series and contents disclosures sit before the body. Contents includes section headings and their immediate subheadings, and tracks the section being read; series navigation starts collapsed. The centered reader is the only layout. Image controls have no visible overlay label or icon.

`src/data/series.json` defines Agentic Dev, AI Dev Platform, and Secure Enterprise AI Tooling On Azure as ordered post groups. Frontmatter `series` arrays support overlapping membership. Move only explicit theme-navigation callouts out of article bodies; preserve warnings, updates, and other author notes. The bottom link follows the first matching series when a next member exists, otherwise the older article. Keep metadata beside the title and the footer compact.
