const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(mobile = false, saved = 'false') {
  const source = fs.readFileSync('js/script.js', 'utf8');
  const sidebarCode = source.slice(source.indexOf('// Sidebar'), source.indexOf('// Loading overlay'));
  function element() {
    const classes = new Set();
    return { inert: false, attrs: {}, focused: false,
      classList: {
        contains: name => classes.has(name),
        remove: name => classes.delete(name),
        toggle(name, force = !classes.has(name)) {
          if (force) classes.add(name); else classes.delete(name);
          return force;
        },
      },
      setAttribute(name, value) { this.attrs[name] = value; },
      focus() { this.focused = true; },
    };
  }
  const ids = Object.fromEntries(['sidebar', 'hamburger', 'overlay', 'sidebar-desktop-toggle'].map(id => [id, element()]));
  const root = element();
  const media = { matches: mobile, addEventListener(_, callback) { this.change = callback; } };
  const storage = new Map([['Trackify_sidebarCollapsed', saved]]);
  const context = vm.createContext({
    window: { matchMedia: () => media },
    document: { documentElement: root, body: element(), getElementById: id => ids[id] },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  });
  vm.runInContext(sidebarCode, context);
  context.initSidebar();
  return { context, root, ids, media, storage };
}

test('desktop navigation can be hidden, remains hidden on navigation, and can be restored', () => {
  const { context, root, ids, storage } = setup();
  context.toggleSidebar();
  assert.equal(root.classList.contains('sidebar-collapsed'), true);
  assert.equal(ids.sidebar.inert, true);
  assert.equal(ids['sidebar-desktop-toggle'].attrs['aria-expanded'], 'false');
  assert.equal(storage.get('Trackify_sidebarCollapsed'), 'true');
  context.closeSidebar();
  assert.equal(root.classList.contains('sidebar-collapsed'), true);
  context.toggleSidebar();
  assert.equal(ids.sidebar.inert, false);
  assert.equal(ids['sidebar-desktop-toggle'].attrs['aria-expanded'], 'true');
});

test('saved desktop preference does not prevent mobile navigation from opening', () => {
  const { context, ids, media } = setup(false, 'true');
  assert.equal(ids.sidebar.inert, true);
  media.matches = true;
  media.change();
  context.toggleSidebar();
  assert.equal(ids.sidebar.inert, false);
  assert.equal(ids.overlay.classList.contains('show'), true);
  assert.equal(ids.hamburger.attrs['aria-expanded'], 'true');
  context.closeSidebar();
  assert.equal(ids.sidebar.inert, true);
  assert.equal(ids.hamburger.focused, true);
  media.matches = false;
  media.change();
  assert.equal(ids.sidebar.inert, true);
});
