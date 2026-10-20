const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function checkIn(state) {
  const source = fs.readFileSync('js/script.js', 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  let popup;
  const context = vm.createContext({
    state, Date, today: () => today,
    saveAndSync() {}, updateRewardPage() {}, updateDashboard() {}, showToast() {},
    showRewardModal: (...args) => { popup = args; },
  });
  vm.runInContext(source.slice(source.indexOf('function claimDailyStreak()'), source.indexOf('function updateRewardPage()')), context);
  context.claimDailyStreak();
  return popup;
}

test('first check-in provides a complete milestone title and description', () => {
  const state = { streak: 0, lastCheckin: '', checkins: [] };
  const [icon, title, description] = checkIn(state);
  assert.equal(icon, 'ms-icon-1');
  assert.equal(title, 'Perjalanan Dimulai!');
  assert.equal(description, 'Selamat melakukan check-in pertamamu!');
  assert.equal(state.streak, 1);
});

test('seventh consecutive check-in displays the seven-day milestone', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const state = { streak: 6, lastCheckin: yesterday.toISOString().slice(0, 10), checkins: [{}] };
  const [icon, title, description] = checkIn(state);
  assert.equal(icon, 'ms-icon-7');
  assert.equal(title, 'Consistency Starter!');
  assert.equal(description, 'LUAR BIASA! 7 hari berturut-turut!');
  assert.equal(state.streak, 7);
});

test('repeated check-in on the same day does not increase the streak or reopen the milestone', () => {
  const state = { streak: 1, lastCheckin: new Date().toISOString().slice(0, 10), checkins: [{}] };
  assert.equal(checkIn(state), undefined);
  assert.equal(state.streak, 1);
  assert.equal(state.checkins.length, 1);
});
