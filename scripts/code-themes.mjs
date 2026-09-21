import latte from '@shikijs/themes/catppuccin-latte';
import macchiato from '@shikijs/themes/catppuccin-macchiato';

// Latte's background and hue families, with low-contrast foregrounds darkened.
// Every replacement clears 4.6:1 on #e6e9ef. Tests also check rendered tokens.
const foregrounds = {
  "#7c7f93": "#646777",
  "#40a02b": "#2f7620",
  "#ea76cb": "#994d84",
  "#fe640b": "#b14608",
  "#8839ef": "#8538ea",
  "#179299": "#127378",
  "#1e66f5": "#1c5ee2",
  "#df8e1d": "#915c13",
  "#e64553": "#ba3843",
  "#d20f39": "#ce0f38",
  "#04a5e5": "#036f9b",
  "#dd7878": "#9a5353",
  "#dc8a78": "#8f5a4e",
  "#7287fd": "#5261b7",
  "#209fb5": "#177181",
  "#6c6f85": "#64667b"
};

export const lightCodeTheme = {
  ...latte,
  name: 'huuhka-latte',
  colors: {...latte.colors, 'editor.background': '#e6e9ef'},
  tokenColors: latte.tokenColors.map(rule => ({
    ...rule,
    settings: rule.settings.foreground ? {
      ...rule.settings,
      foreground: foregrounds[rule.settings.foreground] ?? rule.settings.foreground,
    } : rule.settings,
  })),
};

// Mantle separates code from the Base page in both flavors.
export const darkCodeTheme = {
  ...macchiato,
  name: 'huuhka-macchiato',
  colors: {...macchiato.colors, 'editor.background': '#1e2030'},
};
