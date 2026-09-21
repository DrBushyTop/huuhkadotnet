import latte from '@shikijs/themes/catppuccin-latte';

// Latte's background and hue families, with low-contrast foregrounds darkened.
// Every replacement clears 4.6:1 on #eff1f5. Tests also check rendered tokens.
const foregrounds = {
  "#7c7f93": "#696b7c",
  "#40a02b": "#317c21",
  "#ea76cb": "#a0508a",
  "#fe640b": "#b94908",
  "#179299": "#13787e",
  "#1e66f5": "#1d62ec",
  "#df8e1d": "#976014",
  "#e64553": "#c33b47",
  "#04a5e5": "#0374a2",
  "#dd7878": "#a15757",
  "#dc8a78": "#965e52",
  "#7287fd": "#5665be",
  "#209fb5": "#187788",
  "#6c6f85": "#696b81"
};

export const lightCodeTheme = {
  ...latte,
  name: 'huuhka-latte',
  tokenColors: latte.tokenColors.map(rule => ({
    ...rule,
    settings: rule.settings.foreground ? {
      ...rule.settings,
      foreground: foregrounds[rule.settings.foreground] ?? rule.settings.foreground,
    } : rule.settings,
  })),
};
