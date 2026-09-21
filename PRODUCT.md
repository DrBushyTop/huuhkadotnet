# huuhka.net

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro with MDX content collections. This repository contains the new application.

## Users

Developers finding and reading Pasi Huuhka's hands-on Azure, DevOps, and AI engineering articles.

## Product Purpose

A personal technical publication. Articles come first, with a small author profile. Readers should be able to find a relevant post and comfortably read explanations, code, and architecture diagrams.

## Capabilities and Constraints

- Preserve published content, exact post slugs, timestamps, tags, images, and explicit SEO metadata during migration from Ghost.
- Keep root-level post URLs, tag archives, the author page, RSS, and redirects.
- Store content in Git as MDX. Keep author information global.
- Carry existing Google Analytics into phase 1. Analytics replacement and optional editors are outside current scope.
- Final hosting belongs in Microsoft Azure Sponsorship, subscription `ede0939c-80c4-4dfe-bf3d-84521f3f6d1f`.
- Current work is a redesign before migration and deployment.

## Brand Commitments

Keep huuhka.net and Pasi Huuhka as the publication and author identities. The new design should be cleaner than the supplied Ghost screenshots. Existing colors and theme styling are not binding. Use clean sans-serif fonts and a small real portrait of Pasi. The user rejected the first three mockups and supplied Boris Tane home, article, and bespoke-post screenshots as guidance for clarity and directness. Latest direction: return to image-led, squared article cards inspired by the current huuhka.net and Encore blog, while keeping publication dates prominent. Excerpts are not needed in the next exploration. The front page needs a compact top bar with some color. Capitalize names and explore a distinct clean header font. Keep room for individual posts with custom visuals and externally hosted articles.

## Evidence on Hand

- `../huuhka-net-ghost-to-astro-migration-plan.md` defines migration requirements.
- User supplied home page and article screenshots.
- Published articles at https://www.huuhka.net/ provide real titles and subject matter.
- The Astro repository contains a preliminary homepage. Content migration is separate.

## Product Principles

- Make finding and reading articles the primary experience.
- Preserve the author's content and its technical meaning.
- Give diagrams and code enough room to remain legible.
- Keep the author profile secondary to the writing.

## Open decisions

Round-four A is approved as the preliminary homepage composition. Geist Sans is
selected for headings and the wordmark, Geist Mono for navigation and metadata,
and SauceCodePro Nerd Font Mono for code. DNS provider is not yet confirmed.

## Latest design feedback

The pastel navigation bar felt like Bootstrap. Explore an original small logo, clear Encore-like navigation typography, and LinkedIn, GitHub, RSS icons at the far right. Keep the header light with restrained color. Add a popular-articles section and replace tag filters with fuzzy search. Popular selections in mockups are sample content, not verified analytics rankings.

The user selected A and requested more prominent compact rectangular popular
cards, following the Encore reference. Show at least twelve articles before a
loading control. The preliminary implementation uses a Load more button rather
than automatic infinite scrolling.

Subsequent refinements use a compact single-row phone header with a navigation
menu, padded archive cards with topic tags, and smaller, lighter titles.
The user removed the visible sample-selection label, though the three popular
picks are still provisional. Keep section spacing compact without removing
the padding inside article cards. See DESIGN.md for the implemented values.
