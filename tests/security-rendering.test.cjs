const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('js/script.js', 'utf8');
function slice(start, end) { return script.slice(script.indexOf(start), script.indexOf(end, script.indexOf(start))); }
const helpers = slice('function escapeHTML(', '/* ── Daily quotes');
function renderContext(state, ids) {
  const nodes = Object.fromEntries(ids.map(id => [id, { innerHTML: '', setAttribute() {} }]));
  const ctx = vm.createContext({state, document:{getElementById:id=>nodes[id]||null,querySelector:()=>null}, setTimeout(){}, today:()=> '2026-10-21', registerAllLongPress(){}});
  vm.runInContext(helpers, ctx);
  vm.runInContext(slice('function normalizeDashboardWidgets(', 'function normalizeState('), ctx);
  return {ctx,nodes};
}
const payload = '\"><img src=x onerror=alert(1)>';

test('cloud todo IDs and deadlines cannot create markup or event attributes', () => {
  const {ctx,nodes}=renderContext({todos:[{id:payload,text:'Task',dueDate:payload,dueTime:payload,done:false}]}, ['todo-list']);
  vm.runInContext(slice('function renderTodo()', 'function toggleTodoById('),ctx);
  ctx.renderTodo();
  assert.ok(!nodes['todo-list'].innerHTML.includes('<img'));
  assert.ok(nodes['todo-list'].innerHTML.includes('&lt;img'));
});

test('malformed imported dates are never returned as HTML', () => {
  const ctx=vm.createContext({});
  vm.runInContext(slice('function fmtDateID(', 'function getMensStats('),ctx);
  assert.equal(ctx.fmtDateID('<img src=x onerror=alert(1)>-01-01'), '—');
  assert.equal(ctx.fmtDateID('2026-10-21'), '21 Okt 2026');
});

test('cloud notification settings are escaped in text and attribute contexts', () => {
  const source=fs.readFileSync('js/notifications.js','utf8');
  const container={innerHTML:''};
  const ctx=vm.createContext({document:{getElementById:()=>container},getPermissionStatus:()=> 'granted',getPrefs:()=>({enabled:true,deadlines:{todo:{advanceDays:payload}},types:{habit:{enabled:true,label:payload,body:payload,time:payload}}})});
  vm.runInContext(source.slice(source.indexOf('export function renderNotifSettings()'),source.indexOf('/** Dipanggil dari script.js saat tombol')).replace('export function','function'),ctx);
  ctx.renderNotifSettings();
  assert.ok(!container.innerHTML.includes('<img'));
  assert.ok(container.innerHTML.includes('&lt;img'));
});

test('menstrual flow, mood and symptom labels from imports cannot create markup', () => {
  const {ctx,nodes}=renderContext({menstruasis:[{start:'2026-10-01',end:'',flow:payload,mood:payload,symptoms:[payload]}]},['mens-table','mens-symptom-analysis']);
  Object.assign(ctx,{getMensStats:()=>null,setText(){},renderMensCalendar(){},updateSettingsCountMens(){},diffDays:()=>0,fmtDateID:()=> '1 Okt 2026',FLOW_LABEL:{},MOOD_LABEL:{},SYMPTOM_LABEL:{}});
  vm.runInContext(slice('function renderMenstruasi()', 'function renderMensCalendar('),ctx);
  ctx.renderMenstruasi();
  assert.ok(!nodes['mens-table'].innerHTML.includes('<img'));
  assert.ok(!nodes['mens-symptom-analysis'].innerHTML.includes('<img'));
});

test('context-menu labels containing user habit names cannot create markup', () => {
  const nodes=[];
  const element=()=>{const e={innerHTML:'',style:{},setAttribute(){},addEventListener(){},appendChild(){}};nodes.push(e);return e;};
  const ctx=vm.createContext({document:{createElement:element,body:{appendChild(){}}},window:{innerWidth:1000,innerHeight:800},requestAnimationFrame(){},closeContextMenu(){}});
  vm.runInContext(helpers+slice('function showContextMenu(', 'function closeContextMenu('),ctx);
  ctx.showContextMenu(20,20,[{icon:'trash',label:'Hapus '+payload,action(){}}]);
  assert.ok(nodes.every(e=>!e.innerHTML.includes('<img')));
});
