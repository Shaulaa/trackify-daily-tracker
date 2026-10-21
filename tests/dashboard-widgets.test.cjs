const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/script.js', 'utf8');

function setup() {
  const ctx = vm.createContext({
    state: {}, habitRows: [],
    isPlainObject: value => !!value && typeof value === 'object' && !Array.isArray(value),
    document: { getElementById: () => null, querySelector: () => null },
    today: () => '2026-10-21',
  });
  vm.runInContext(source.slice(source.indexOf('function normalizeDateList('), source.indexOf('const DASHBOARD_QUICK_ACTION_OPTIONS')), ctx);
  vm.runInContext(source.slice(source.indexOf('function normalizeQuickActions('), source.indexOf('function normalizeState(')), ctx);
  vm.runInContext(source.slice(source.indexOf('function createDefaultState('), source.indexOf('let state ')), ctx);
  vm.runInContext(source.slice(source.indexOf('function normalizeState('), source.indexOf('function createDefaultState(')), ctx);
  return ctx;
}

test('new users do not get an unused menstrual dashboard widget', () => {
  const ctx = setup();
  assert.equal(ctx.isDashboardMenstruasiEnabled(ctx.createDefaultState()), false);
});

test('existing cycle data remains visible unless the user explicitly opts out', () => {
  const ctx = setup();
  assert.equal(ctx.isDashboardMenstruasiEnabled({ menstruasis: [{}] }), true);
  assert.equal(ctx.isDashboardMenstruasiEnabled({ menstruasis: [{}], dashboardWidgets: { menstruasi: false } }), false);
  assert.equal(ctx.isDashboardMenstruasiEnabled({ menstruasis: [], dashboardWidgets: { menstruasi: true } }), true);
});

test('widget preference survives normalization, including explicit false', () => {
  const ctx = setup();
  for (const enabled of [false, true]) {
    const normalized = ctx.normalizeState({ dashboardWidgets: { menstruasi: enabled } });
    assert.equal(normalized.dashboardWidgets.menstruasi, enabled);
  }
  assert.equal(ctx.normalizeState({ dashboardWidgets: { menstruasi: 'true' } }).dashboardWidgets.menstruasi, null);
});

test('widget choice is included in the existing cloud preference payload', () => {
  const ctx = setup();
  ctx.state = ctx.createDefaultState();
  ctx.state.dashboardWidgets = { menstruasi: false };
  vm.runInContext(source.slice(source.indexOf('function buildSyncPayload('), source.indexOf('function getSyncHash(')), ctx);
  assert.equal(ctx.buildSyncPayload().streak.dashboardWidgets.menstruasi, false);
});

test('disabled widget leaves no visible card or unused grid column', () => {
  const ctx = setup();
  const card = { hidden: false };
  const classes = new Set();
  ctx.state = ctx.createDefaultState();
  ctx.document.querySelector = selector => selector === '.dashboard-menstruasi-card' ? card : { classList: { toggle(name, enabled) { if (enabled) classes.add(name); } } };
  ctx.getMensStats = () => { throw new Error('Disabled widget should not render cycle statistics'); };
  vm.runInContext(source.slice(source.indexOf('function renderDashboardMenstruasi('), source.indexOf('function renderDashboardHeatmap(')), ctx);
  ctx.renderDashboardMenstruasi();
  assert.equal(card.hidden, true);
  assert.ok(classes.has('dashboard-top-grid--without-menstruasi'));
});

test('finishing or skipping onboarding saves the optional widget choice', () => {
  for (const enabled of [false, true]) {
    const ctx = setup();
    let saved = 0;
    ctx.state = ctx.createDefaultState();
    ctx._onboardMenstruasi = enabled;
    ctx.ONBOARD_KEY = 'test-onboarded';
    ctx.saveAndSync = () => saved++;
    ctx.renderDashboardMenstruasi = () => {};
    ctx.document.body = { classList: { remove() {} } };
    ctx.localStorage = { setItem() {} };
    vm.runInContext(source.slice(source.indexOf('function onboardDone('), source.indexOf('function escapeHTML(')), ctx);
    ctx.onboardDone({ silent: true });
    assert.equal(ctx.state.dashboardWidgets.menstruasi, enabled);
    assert.equal(saved, 1);
  }
});
