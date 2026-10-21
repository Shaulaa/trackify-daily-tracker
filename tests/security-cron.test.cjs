const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('api/send-notifications.js', 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export default async function', 'async function');

async function request({ configured, header, query = {}, method = 'POST', databaseError } = {}) {
  let adminCalls = 0;
  let reads = 0;
  const context = vm.createContext({
    Buffer, Date,
    console: { log() {}, error() {} },
    process: { env: { CRON_SECRET: configured } },
    getApps() { adminCalls++; return [{}]; },
    getFirestore: () => ({ collection: () => ({ get: async () => {
      reads++;
      if (databaseError) throw new Error(databaseError);
      return { empty: true };
    } }) }),
    getMessaging: () => ({}),
  });
  vm.runInContext(source, context);
  const response = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await context.handler({ method, headers: { 'x-cron-secret': header }, query }, response);
  return { response, adminCalls, reads };
}

test('cron denies missing or blank server secrets before touching Firebase Admin', async () => {
  for (const configured of [undefined, '', ' ', '\t']) {
    const result = await request({ configured, header: configured });
    assert.equal(result.response.code, 503);
    assert.equal(result.adminCalls, 0);
    assert.equal(result.reads, 0);
  }
});

test('cron rejects missing, incorrect or non-string credentials before touching Firebase Admin', async () => {
  for (const header of [undefined, '', 'wrong', ['test-secret'], {}]) {
    const result = await request({ configured: 'test-secret', header });
    assert.equal(result.response.code, 403);
    assert.equal(result.adminCalls, 0);
    assert.equal(result.reads, 0);
  }
});

test('cron accepts the valid scheduler header without needing query parameters', async () => {
  const result = await request({ configured: 'test-secret', header: 'test-secret', query: undefined });
  assert.equal(result.response.code, 200);
  assert.equal(result.reads, 1);
});

test('cron preserves the existing query-secret caller and rejects a bad header override', async () => {
  const valid = await request({ configured: 'test-secret', query: { secret: 'test-secret' } });
  assert.equal(valid.response.code, 200);
  const invalid = await request({ configured: 'test-secret', header: 'wrong', query: { secret: 'test-secret' } });
  assert.equal(invalid.response.code, 403);
  assert.equal(invalid.adminCalls, 0);
});

test('cron rejects unsupported HTTP methods before accessing Firebase Admin', async () => {
  const result = await request({ method: 'GET' });
  assert.equal(result.response.code, 405);
  assert.equal(result.adminCalls, 0);
});

test('cron fatal responses do not expose internal errors', async () => {
  const result = await request({ configured: 'test-secret', header: 'test-secret', databaseError: 'private service-account details' });
  assert.equal(result.response.code, 500);
  assert.equal(result.response.body.error, 'Unable to process notifications');
});
