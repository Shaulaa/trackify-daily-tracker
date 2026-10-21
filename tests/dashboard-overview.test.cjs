const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/script.js', 'utf8');

function overview(data) {
  const ctx = vm.createContext({ today: () => '2026-10-21' });
  const start = source.indexOf('function getDashboardOverview(');
  assert.ok(start >= 0, 'Dashboard overview must be defined');
  vm.runInContext(source.slice(start, source.indexOf('function renderDashboardFocusBars(', start)), ctx);
  return ctx.getDashboardOverview(data);
}

test('empty dashboards invite a first activity even if a check-in exists', () => {
  assert.equal(overview({ streak: 1, checkins: [{}] }).hasActivity, false);
});

test('only configured activities contribute metrics to the primary summary', () => {
  const result = overview({ todos: [{ text: 'Task' }] });
  assert.equal(result.hasActivity, true);
  assert.equal(result.metrics.todo, true);
  for (const metric of ['habit', 'target', 'focus', 'mood', 'streak']) assert.equal(result.metrics[metric], false);
});

test('zero completed habits remain meaningful when habits have been created', () => {
  const result = overview({ habits: ['Read'], habitData: {}, streak: 2 });
  assert.equal(result.metrics.habit, true);
  assert.equal(result.metrics.streak, true);
});

test('focus and mood summaries use today instead of old records', () => {
  const old = overview({ learnings: [{ date: '2026-10-20', duration: '30' }], emosis: [{ date: '2026-10-20', mood: 'Bahagia' }] });
  assert.equal(old.metrics.focus, false);
  assert.equal(old.metrics.mood, false);
  const current = overview({ learnings: [{ date: '2026-10-21', duration: '30' }], journals: [{ date: '2026-10-21', mood: 'Bahagia' }] });
  assert.equal(current.metrics.focus, true);
  assert.equal(current.metrics.mood, true);
});

test('a week with no focus duration does not render a chart of empty bars', () => {
  const card = { hidden: false };
  const bars = { innerHTML: 'old chart' };
  const ctx = vm.createContext({
    Date, state: { learnings: [] },
    document: { getElementById: () => bars, querySelector: () => card },
  });
  vm.runInContext(source.slice(source.indexOf('function renderDashboardFocusBars('), source.indexOf('function updateDashboard()')), ctx);
  ctx.renderDashboardFocusBars();
  assert.equal(card.hidden, true);
  assert.equal(bars.innerHTML, '');
});
