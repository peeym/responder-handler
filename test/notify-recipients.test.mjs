// Run: npx tsc && npm test   (reads the committed dist/, like every consuming site does)
import test from 'node:test';
import assert from 'node:assert/strict';
import { notifyRecipients } from '../dist/api/responder.js';

test('no override: registry address plus the tzur@icf.co.il copy (unchanged behaviour)', () => {
  assert.deepEqual(notifyRecipients('efrat@efitzur.co.il'), { to: ['efrat@efitzur.co.il'], cc: ['tzur@icf.co.il'] });
  assert.deepEqual(notifyRecipients('tzur@icf.co.il'), { to: ['tzur@icf.co.il'], cc: undefined });
});

test('notifyTo replaces the registry address and drops the built-in copy', () => {
  assert.deepEqual(notifyRecipients('efrat@efitzur.co.il', { notifyTo: ['info@efitzur.co.il'] }), { to: ['info@efitzur.co.il'], cc: undefined });
});

test('notifyCc is added, never duplicating a recipient', () => {
  assert.deepEqual(
    notifyRecipients('x@y.co', { notifyTo: ['info@efitzur.co.il'], notifyCc: ['a@b.co', 'INFO@efitzur.co.il'] }),
    { to: ['info@efitzur.co.il'], cc: ['a@b.co'] },
  );
});

test('an empty or malformed override falls back to the registry', () => {
  assert.deepEqual(notifyRecipients('efrat@efitzur.co.il', { notifyTo: ['', 'not-an-address'] }), { to: ['efrat@efitzur.co.il'], cc: ['tzur@icf.co.il'] });
});
