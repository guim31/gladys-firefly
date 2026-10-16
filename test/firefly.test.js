// -----------------------------------------------------------------------------
// The pure pieces: the address typed by the user, amounts, calendar days, and
// the parsing of the recorded Firefly III answers.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, parseUrl } from '../src/config.js';
import {
  addDays,
  amountOf,
  daysBetween,
  monthOf,
  parseBill,
  parsePiggyBank,
  parseSummary,
} from '../src/firefly.js';
import { fixture } from './helpers/world.js';

test('the address: scheme added, /api/v1 and slashes removed, credentials refused', () => {
  assert.equal(parseUrl('192.0.2.10:8080'), 'http://192.0.2.10:8080');
  assert.equal(parseUrl(' https://firefly.example.org/ '), 'https://firefly.example.org');
  assert.equal(parseUrl('http://192.0.2.10/firefly/api/v1/'), 'http://192.0.2.10/firefly');
  assert.equal(parseUrl('http://user:pass@192.0.2.10'), null);
  assert.equal(parseUrl('http://192.0.2.10/?token=x'), null);
  assert.equal(parseUrl('not a url at all'), null);
  assert.equal(parseUrl(''), null);
});

test('the configuration is normalized', () => {
  assert.deepEqual(normalizeConfig({}), {
    url: null,
    invalidUrl: false,
    token: '',
    insecure: false,
    refreshMinutes: 15,
    language: 'fr',
  });
  const config = normalizeConfig({
    url: 'http://u:p@host',
    token: ' abc ',
    allow_self_signed: true,
    refresh_interval: '60',
    language: 'de',
  });
  assert.equal(config.invalidUrl, true);
  assert.equal(config.token, 'abc');
  assert.equal(config.insecure, true);
  assert.equal(config.refreshMinutes, 60);
  assert.equal(normalizeConfig({ refresh_interval: '2' }).refreshMinutes, 15);
});

test('amounts and calendar days', () => {
  assert.equal(amountOf('884.950000000000'), 884.95);
  assert.equal(amountOf('-12.3456'), -12.35);
  assert.ok(Object.is(amountOf('-0.001'), 0));
  assert.equal(amountOf(null), null);
  assert.equal(amountOf('n/a'), null);
  // Across the change to winter time (25/10/2026) a day is still a day.
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.deepEqual(monthOf('2028-02-10'), { start: '2028-02-01', end: '2028-02-29' });
});

test('bills: the next expected date, or the first pay date', () => {
  const [rent] = fixture('firefly/bills.json').data;
  assert.deepEqual(parseBill(rent), {
    id: '1',
    name: 'Loyer',
    currency: 'EUR',
    amount: 850,
    nextDue: '2026-11-05',
  });
  rent.attributes.next_expected_match = null;
  rent.attributes.pay_dates = ['2026-12-05T00:00:00+01:00', '2026-11-05T00:00:00+01:00'];
  assert.equal(parseBill(rent).nextDue, '2026-11-05');
  rent.attributes.pay_dates = [];
  assert.equal(parseBill(rent).nextDue, null);
});

test('piggy banks: no target is no progress', () => {
  const [, bike, emergency] = fixture('firefly/piggy-banks.json').data;
  assert.deepEqual(
    [parsePiggyBank(bike).progress, parsePiggyBank(emergency).progress],
    [100, null],
  );
  assert.equal(parsePiggyBank(emergency).target, null);
});

test('the summary, per currency, spent as a positive amount', () => {
  assert.deepEqual(parseSummary(fixture('firefly/summary.json')), {
    EUR: {
      currency: 'EUR',
      spent: 1415.05,
      earned: 2300,
      billsUnpaid: 32.49,
      leftToSpend: 34.95,
      netWorth: 11384.95,
    },
    USD: { currency: 'USD', netWorth: 1200 },
  });
});
