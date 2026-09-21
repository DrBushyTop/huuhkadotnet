# Appearance and code readability

The September 21, 2026 update preserves the light design and adds Macchiato.
Palette source: `https://github.com/catppuccin/palette`, `palette.json`, Macchiato.
The site uses explicit values, not a runtime request to that repository.

| Role | Macchiato color | Hex |
| --- | --- | --- |
| Page and code background | Base | #24273a |
| Card background | Mantle | #1e2030 |
| Hover and selected navigation | Surface0 | #363a4f |
| Dividers | Surface1 | #494d64 |
| Main text | Text | #cad3f5 |
| Secondary text | Subtext0 | #a5adcb |
| Focus and logo | Blue | #8aadf4 |
| Links | Sapphire | #7dc4e4 |
| Control border and scrollbar | Overlay1 | #8087a2 |

## Code

The self-hosted family is SauceCodePro Nerd Font Mono. The existing regular,
bold, italic, and bold-italic WOFF2 assets remain unchanged. Code stays at 14px
with 1.65 line height. Top-level blocks share the image width, 800px at 1200px
viewports and 960px at 1440px. Narrow layouts and nested blocks stay within their
parent. Long lines remain horizontally scrollable, with keyboard focus retained.

Astro/Shiki now emits contrast-adjusted Catppuccin Latte and Catppuccin Macchiato token
variables. Latte keeps its #eff1f5 background and hue families;
`scripts/code-themes.mjs` darkens foregrounds that fall below 4.6:1.
CSS changes the colors without rerendering the code. No runtime syntax
highlighter or theme package is downloaded by the browser.

## Contrast checks

The previous GitHub Light orange, #e36209 on white, measured 3.49:1. That was below
the 4.5:1 normal-text threshold in WCAG 2.2 SC 1.4.3.

Checks across all 173 rendered syntax-highlighted blocks found minimum text
contrast of 4.60:1 in light mode and 5.29:1 in Macchiato. Comments are included.
`tests/theme.test.mjs` checks every rendered token against its background, shared
text colors on the site's fills, selection text, and control/focus boundaries.
The light control border is now #7b8995 for clearer field boundaries.

Reference: `https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html`.
These checks cover text/background contrast, not a full accessibility audit,
color-vision simulation, image content, or external embedded services.

## Preference behavior

System is the default and follows device changes. Light or Dark persists in the
single `huuhka-theme` local-storage key. Returning to System removes it. Storage
failures leave the current-page controls usable. Other tabs synchronize when
that key changes. The inline head script avoids waiting for the main bundle to
apply the stored preference. CSS follows the OS without JavaScript.

Desktop has a sun/moon switch after the social links, plus a monitor button to
restore the device theme. The thumb slides and the icon rotates over 220ms;
reduced motion removes transitions. Both buttons have 44px touch targets and
work with Space and Enter. Narrow layouts put them in the mobile menu to keep
the top bar to brand and hamburger. Its Theme label matches the menu
links in Geist Mono. A loaded giscus iframe gets a theme update through
its documented postMessage API; comments remain click-to-load.

## Verification scope

Shared-browser checks covered the PR reviewer article at 390px, 1280px, and
1440px, plus the homepage and mobile menu. Code measured 350px, 800px, and 960px
respectively, with no page-level horizontal overflow. Keyboard ArrowRight scrolled
the focused phone code block. Theme switching, persistence across page
navigation, clearing the preference through System, and a simulated device-theme
change worked. The code font loaded as SauceCodePro Nerd Font Mono.

Giscus configuration and live theme messages have DOM tests, not a new external
comment-posting test. No real Safari or screen-reader certification is claimed.
