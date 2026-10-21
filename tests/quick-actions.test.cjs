const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/script.js', 'utf8');
const ctx = vm.createContext({
  isPlainObject: value => !!value && typeof value === 'object' && !Array.isArray(value),
});
vm.runInContext(source.slice(source.indexOf('const DASHBOARD_QUICK_ACTION_OPTIONS'), source.indexOf('function normalizeDashboardWidgets(')), ctx);
const normalize = value => JSON.parse(JSON.stringify(ctx.normalizeQuickActions(value)));

test('saved default shortcuts receive Indonesian labels after an upgrade', () => {
  assert.deepEqual(normalize([
    { id: 'habit', label: 'Check Habit' },
    { id: 'mood', label: 'Catat Mood' },
    { id: 'reward', label: 'Lihat Reward' },
    { id: 'feedback', label: 'Feedback' },
  ]), [
    { id: 'habit', label: 'Tandai Habit' },
    { id: 'mood', label: 'Catat Suasana Hati' },
    { id: 'reward', label: 'Lihat Hadiah' },
    { id: 'feedback', label: 'Masukan' },
  ]);
});

test('translation preserves custom labels and rejects unknown shortcut IDs', () => {
  assert.deepEqual(normalize([
    { id: 'habit', label: 'Rutinitas pagiku' },
    { id: 'todo', label: 'Check Habit' },
    { id: 'unknown', label: 'Custom' },
    { id: 'mood', label: ' ' },
  ]), [
    { id: 'habit', label: 'Rutinitas pagiku' },
    { id: 'todo', label: 'Check Habit' },
    { id: 'mood', label: 'Catat Suasana Hati' },
  ]);
});
