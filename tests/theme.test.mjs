import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseHTML} from 'linkedom';

const init = readFileSync(new URL('../src/lib/theme-init.js', import.meta.url), 'utf8');
function browser({stored, dark = false, blocked = false} = {}) {
  const values = new Map(stored ? [['huuhka-theme', stored]] : []);
  const handlers = new Map();
  const system = {matches: dark, addEventListener: (_name, handler) => { system.change = handler; }};
  const controls = [{hidden: true}, {hidden: true}];
  const buttons = () => [0, 1].map(() => ({
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(_name, handler) { this.click = handler; },
  }));
  const toggles = buttons(), resets = buttons();
  const document = {
    documentElement: {dataset: {}}, readyState: 'complete',
    querySelector: () => ({setAttribute: (_name, value) => { document.meta = value; }}),
    querySelectorAll: selector => ({
      '[data-theme-toggle]': toggles,
      '[data-theme-system]': resets,
      '[data-theme-control]': controls,
    })[selector],
  };
  const window = {
    matchMedia: () => system,
    localStorage: {
      getItem: key => { if (blocked) throw Error('blocked'); return values.get(key); },
      setItem: (key, value) => { if (blocked) throw Error('blocked'); values.set(key, value); },
      removeItem: key => { if (blocked) throw Error('blocked'); values.delete(key); },
    },
    addEventListener: (name, handler) => handlers.set(name, handler),
    dispatchEvent: event => { window.lastEvent = event; },
  };
  runInNewContext(init, {window, document, CustomEvent: class {constructor(type, args) {this.type = type;this.detail = args.detail;}}});
  return {document, window, system, values, handlers, toggles, resets, controls};
}

test('theme defaults to system without storage writes and follows device changes', () => {
  const b = browser({dark: true});
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  assert.equal(b.document.meta, '#24273a');
  assert.equal(b.values.size, 0);
  assert.ok(b.controls.every(c => !c.hidden));
  assert.ok(b.toggles.every(c => c.attributes['aria-checked'] === 'true'));
  assert.ok(b.resets.every(c => c.attributes['aria-pressed'] === 'true'));
  b.system.matches = false;
  b.system.change();
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  assert.ok(b.toggles.every(c => c.attributes['aria-checked'] === 'false'));
});

test('theme selection persists, synchronizes both controls, and System clears the override', () => {
  const b = browser({stored: 'light', dark: true});
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  b.toggles[0].click();
  assert.equal(b.values.get('huuhka-theme'), 'dark');
  assert.equal(b.toggles[1].attributes['aria-checked'], 'true');
  assert.ok(b.resets.every(c => c.attributes['aria-pressed'] === 'false'));
  b.system.matches = false; b.system.change();
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  b.resets[1].click();
  assert.equal(b.values.size, 0);
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  assert.ok(b.resets.every(c => c.attributes['aria-pressed'] === 'true'));
  b.handlers.get('storage')({key: 'huuhka-theme', newValue: 'dark'});
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  assert.equal(b.window.lastEvent.detail.theme, 'dark');
  b.toggles[1].click();
  assert.equal(b.values.get('huuhka-theme'), 'light');
  assert.ok(b.toggles.every(c => c.attributes['aria-checked'] === 'false'));
  b.handlers.get('storage')({key: null, newValue: null});
  assert.ok(b.resets.every(c => c.attributes['aria-pressed'] === 'true'));
});

test('blocked storage and invalid saved preferences do not break theme controls', () => {
  for (const options of [{blocked: true}, {stored: 'invalid'}]) {
    const b = browser(options);
    assert.equal(b.document.documentElement.dataset.theme, 'light');
    b.toggles[0].click();
    assert.equal(b.document.documentElement.dataset.theme, 'dark');
    b.resets[0].click();
    assert.equal(b.document.documentElement.dataset.theme, 'light');
  }
});

function luminance(hex) {
  const channels = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
    .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('all rendered syntax colors meet 4.5:1 in light and Macchiato themes', () => {
  let blocks = 0;
  for (const file of readdirSync(new URL('../dist/', import.meta.url), {recursive: true}).filter(f => f.endsWith('.html'))) {
    const {document} = parseHTML(readFileSync(new URL(`../dist/${file}`, import.meta.url), 'utf8'));
    for (const pre of document.querySelectorAll('pre.astro-code')) {
      blocks++;
      assert.equal(pre.getAttribute('tabindex'), '0');
      for (const mode of ['light', 'dark']) {
        const background = pre.style.getPropertyValue(`--shiki-${mode}-bg`);
        assert.match(background, /^#[\da-f]{6}$/i);
        for (const token of [pre, ...pre.querySelectorAll('span[style]')]) {
          const foreground = token.style.getPropertyValue(`--shiki-${mode}`);
          if (!foreground) continue;
          const tokenBackground = token.style.getPropertyValue(`--shiki-${mode}-bg`) || background;
          assert.ok(contrast(foreground, tokenBackground) >= 4.5, `${file}: ${mode} ${foreground} on ${tokenBackground}`);
        }
      }
    }
  }
  assert.ok(blocks >= 173);
});

test('shared theme text, focus, and control colors meet contrast requirements', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const colors = Object.fromEntries([...css.matchAll(/--([\w-]+): light-dark\((#[\da-f]{6}), (#[\da-f]{6})\)/gi)].map(m => [m[1], [m[2], m[3]]]));
  for (const mode of [0, 1]) {
    for (const foreground of ['ink', 'muted', 'link']) {
      for (const background of ['paper', 'article-ground', 'popular-ground', 'popular-hover', 'nav-highlight']) {
        assert.ok(contrast(colors[foreground][mode], colors[background][mode]) >= 4.5, `${mode} ${foreground}/${background}`);
      }
    }
    for (const foreground of ['blue', 'control-border']) {
      assert.ok(contrast(colors[foreground][mode], colors.paper[mode]) >= 3, `${mode} ${foreground}/paper`);
    }
    assert.ok(contrast(colors['selection-ink'][mode], colors['selection-ground'][mode]) >= 4.5);
  }
});

test('theme initialization is inline in the head and mobile controls stay inside the menu', () => {
  const {document} = parseHTML(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'));
  assert.ok([...document.head.querySelectorAll('script')].some(script => script.textContent.includes("const key = 'huuhka-theme'")));
  assert.equal(document.querySelector('.mobile-header-actions [data-theme-control]'), null);
  assert.ok(document.querySelector('dialog [data-theme-control]'));
  assert.equal(document.querySelector('[data-theme-select]'), null);
  for (const toggle of document.querySelectorAll('[data-theme-toggle]')) {
    assert.equal(toggle.tagName, 'BUTTON');
    assert.equal(toggle.getAttribute('role'), 'switch');
    assert.equal(toggle.getAttribute('aria-label'), 'Dark mode');
  }
  assert.equal(document.querySelectorAll('[data-theme-system][aria-label="Use device theme"]').length, 2);
});

test('toggle motion has a reduced-motion override', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none !important/);
  assert.match(css, /\.theme-toggle-thumb[\s\S]*?transition: transform 220ms/);
});
