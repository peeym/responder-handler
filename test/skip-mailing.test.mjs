// Run: npx tsc && npm test   (reads the committed dist/, like every consuming site does)
// skipMailing: an inquiry without marketing consent reaches the CRM and the notification email,
// and is NOT subscribed to the mailing list. Without the option nothing changes.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MAKE_WEBHOOK_URL = 'https://make.test/hook';
process.env.CRM_LEAD_ENDPOINT = 'https://crm.test/api/lead-capture';
process.env.RESEND_API_KEY = 'test-key-not-real';
delete process.env.RESPONDER_CLIENT_ID;
delete process.env.RESPONDER_CLIENT_SECRET;
delete process.env.RESPONDER_USER_TOKEN;

const { dispatchLead, createResponderHandler } = await import('../dist/api/responder.js');

function stubFetch() {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response('{}', { status: 200 });
  };
  return calls;
}
const hosts = (calls) => calls.map((u) => new URL(u).host).sort();

test('dispatchLead without skipMailing subscribes, records and notifies (unchanged)', async () => {
  const calls = stubFetch();
  const r = await dispatchLead({ list_id: 'efitzur-counseling', email: 'a@example.com' });
  assert.deepEqual(hosts(calls), ['api.resend.com', 'crm.test', 'make.test']);
  assert.equal(r.mailing, true);
  assert.equal(r.mailingSkipped, undefined);
});

test('dispatchLead with skipMailing: CRM and email only, never the mailing provider', async () => {
  const calls = stubFetch();
  const r = await dispatchLead({ list_id: 'efitzur-counseling', email: 'a@example.com' }, { skipMailing: true });
  assert.deepEqual(hosts(calls), ['api.resend.com', 'crm.test']);
  assert.equal(r.ok, true);
  assert.equal(r.crm, true);
  assert.equal(r.email, true);
  assert.equal(r.mailing, false);
  assert.equal(r.mailingSkipped, true);
});

function fakeRes() {
  const res = { statusCode: 200, body: undefined, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

test('createResponderHandler: skipMailing decides per request from the submitted fields', async () => {
  const handler = createResponderHandler({ skipMailing: (d) => d.consent_mode === 'checkbox' && !d.marketing_consent });

  let calls = stubFetch();
  let res = fakeRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '10.0.0.1' }, body: { list_id: 'efitzur-counseling', email: 'a@example.com', consent_mode: 'checkbox' } }, res);
  assert.deepEqual(hosts(calls), ['api.resend.com', 'crm.test']);
  assert.equal(res.body.mailing_skipped, true);
  assert.equal(res.body.ok, true);

  calls = stubFetch();
  res = fakeRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '10.0.0.2' }, body: { list_id: 'efitzur-counseling', email: 'a@example.com', consent_mode: 'checkbox', marketing_consent: '1' } }, res);
  assert.deepEqual(hosts(calls), ['api.resend.com', 'crm.test', 'make.test']);
  assert.equal(res.body.mailing_skipped, undefined);
});
