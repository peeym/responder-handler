import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createResponderHandler, __test } from '../dist/api/responder.js';

const ENV_KEYS = [
  'RESPONDER_CLIENT_ID',
  'RESPONDER_CLIENT_SECRET',
  'RESPONDER_USER_TOKEN',
  'RESEND_API_KEY',
  'MAKE_WEBHOOK_URL',
];

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

async function postLead(handler, { ip, body }) {
  const req = {
    method: 'POST',
    headers: {
      ...(ip !== undefined ? { 'x-forwarded-for': ip } : {}),
    },
    body: {
      list_id: 'efitzur-newsletter',
      name: 'Test Lead',
      ...body,
    },
  };
  const res = createMockRes();
  await handler(req, res);
  return res;
}

describe('createResponderHandler rate limit key (IP + contact)', () => {
  let originalFetch;
  let savedEnv;

  beforeEach(() => {
    __test.resetRateLimit();

    originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    delete process.env.RESPONDER_CLIENT_ID;
    delete process.env.RESPONDER_CLIENT_SECRET;
    delete process.env.RESPONDER_USER_TOKEN;
    delete process.env.RESEND_API_KEY;
    process.env.MAKE_WEBHOOK_URL = 'https://make.invalid/hook';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it('allows two different emails from the same IP within 10s', async () => {
    const handler = createResponderHandler();

    const first = await postLead(handler, {
      ip: '203.0.113.10',
      body: { email: 'alice@example.com' },
    });
    const second = await postLead(handler, {
      ip: '203.0.113.10',
      body: { email: 'bob@example.com' },
    });

    assert.equal(first.body.ok, true);
    assert.equal(second.body.ok, true);
  });

  it('allows two different phones (no email) from the same IP within 10s', async () => {
    const handler = createResponderHandler();

    const first = await postLead(handler, {
      ip: '203.0.113.10',
      body: { phone: '0501111111' },
    });
    const second = await postLead(handler, {
      ip: '203.0.113.10',
      body: { phone: '0502222222' },
    });

    assert.equal(first.body.ok, true);
    assert.equal(second.body.ok, true);
  });

  it('blocks the same email with different casing from the same IP within 10s', async () => {
    const handler = createResponderHandler();

    const first = await postLead(handler, {
      ip: '203.0.113.10',
      body: { email: 'Alice@Example.com' },
    });
    const second = await postLead(handler, {
      ip: '203.0.113.10',
      body: { email: 'alice@example.com' },
    });

    assert.equal(first.body.ok, true);
    assert.deepEqual(second.body, { ok: false, error: 'נסו שוב בעוד כמה שניות' });
  });

  it('blocks the same phone from the same IP within 10s', async () => {
    const handler = createResponderHandler();

    const first = await postLead(handler, {
      ip: '203.0.113.10',
      body: { phone: '0501234567' },
    });
    const second = await postLead(handler, {
      ip: '203.0.113.10',
      body: { phone: '0501234567' },
    });

    assert.equal(first.body.ok, true);
    assert.deepEqual(second.body, { ok: false, error: 'נסו שוב בעוד כמה שניות' });
  });

  it('allows the same email from different IPs within 10s', async () => {
    const handler = createResponderHandler();

    const first = await postLead(handler, {
      ip: '203.0.113.10',
      body: { email: 'alice@example.com' },
    });
    const second = await postLead(handler, {
      ip: '203.0.113.11',
      body: { email: 'alice@example.com' },
    });

    assert.equal(first.body.ok, true);
    assert.equal(second.body.ok, true);
  });
});
