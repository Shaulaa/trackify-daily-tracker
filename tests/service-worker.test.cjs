const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function requestAsset(offline) {
  const listeners = {};
  const cached = { status: 200, version: 'cached' };
  const fresh = { status: 200, version: 'fresh', clone() { return this; } };
  const cache = { match: async () => cached, put: async () => {} };
  const context = vm.createContext({
    self: { location: { origin: 'https://trackify.test' }, addEventListener: (name, handler) => listeners[name] = handler },
    URL, console,
    caches: { match: cache.match, open: async () => cache },
    fetch: async () => { if (offline) throw new Error('offline'); return fresh; },
  });
  vm.runInContext(fs.readFileSync('sw.js', 'utf8'), context);
  let response;
  listeners.fetch({
    request: { method: 'GET', url: 'https://trackify.test/css/style.css', destination: 'style' },
    respondWith(promise) { response = promise; },
  });
  return response;
}

test('online clients receive the latest stylesheet instead of a stale cached version', async () => {
  assert.equal((await requestAsset(false)).version, 'fresh');
});

test('offline clients can still load a cached stylesheet', async () => {
  assert.equal((await requestAsset(true)).version, 'cached');
});
