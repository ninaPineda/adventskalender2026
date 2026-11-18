const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const tokens = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8');
assert(!/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i.test(css), 'Colors must be declared in tokens.css');
for (const [, value] of css.matchAll(/(?:box-shadow|text-shadow)\s*:\s*([^;]+);/g)) {
  assert(/^var\(--[\w-]+\)$/.test(value), `Shadow must use a central token: ${value}`);
}
const all = css + tokens;
const defined = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
for (const [, name] of all.matchAll(/var\((--[\w-]+)/g)) assert(defined.has(name), `Undefined token: ${name}`);
for (const page of ['index.html', 'highscores.html', 'profile.html', 'help.html']) {
 const html = fs.readFileSync(path.join(root, page), 'utf8');
 assert.equal((html.match(/aria-current="page"/g) || []).length, 1, page);
 for (const href of ['index.html', 'highscores.html', 'profile.html', 'help.html']) assert(html.includes(`href="${href}"`));
}
assert(fs.statSync(path.join(root, 'assets/fonts/AdventPro.ttf')).size > 10000);
console.log('OK: central colors and shadows, defined design tokens, navigation and local font.');
