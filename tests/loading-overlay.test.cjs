const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const elements = new Map();
  const document = {
    getElementById: id => elements.get(id) || null,
    createElement: () => ({ style: {}, remove() { elements.delete(this.id); } }),
    body: { appendChild(el) { elements.set(el.id, el); } },
  };
  const source = fs.readFileSync('js/script.js', 'utf8');
  const code = source.slice(source.indexOf('function setLoadingOverlay('), source.indexOf('// Toast', source.indexOf('function setLoadingOverlay(')));
  const context = vm.createContext({ document });
  vm.runInContext(code, context);
  return { context, elements };
}

test('finished cloud loading removes the overlay from hit testing and accessibility', () => {
  const { context, elements } = setup();
  context.setLoadingOverlay(true);
  assert.ok(elements.has('trackify-loading-overlay'));
  context.setLoadingOverlay(false);
  assert.equal(elements.has('trackify-loading-overlay'), false);
});

test('cleanup before loading does not create an invisible full-screen overlay', () => {
  const { context, elements } = setup();
  context.setLoadingOverlay(false);
  assert.equal(elements.size, 0);
});

test('repeated loading and cleanup leave no overlay after success or failure', () => {
  const { context, elements } = setup();
  for (let i = 0; i < 3; i++) {
    context.setLoadingOverlay(true);
    context.setLoadingOverlay(true);
    assert.equal(elements.size, 1);
    context.setLoadingOverlay(false);
    context.setLoadingOverlay(false);
    assert.equal(elements.size, 0);
  }
});
