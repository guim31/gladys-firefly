// -----------------------------------------------------------------------------
// The refresh cycle against the recorded Firefly III answers: devices, states
// of the devices added in Gladys, connection status, scene triggers, the
// container's own timer, and what is kept under /data.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG,
  createAll,
  createApi,
  createWorld,
  cycle,
  deviceOf,
  featureId,
} from './helpers/world.js';
import { registerHandlers } from '../src/app.js';
import { Store } from '../src/store.js';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}

const last = (w, type, id, key) => w.fake.lastState(featureId(deviceOf(w, type, id), key));
// Intl separates thousands and currencies with narrow no-break spaces.
const plain = (value) => JSON.parse(JSON.stringify(value).replace(/[\u00a0\u202f]/g, ' '));
const events = (w, key) => plain(w.fake.sceneEvents.filter((event) => event.key === key));

test('the requests carry the token, read only, with the day of Gladys', async (t) => {
  const w = await world(t);
  assert.deepEqual(w.api.routes(), [
    'about',
    'accounts',
    'budgets',
    'budget-limits',
    'bills',
    'piggy-banks',
    'summary/basic',
  ]);
  for (const { headers } of w.api.requests) {
    assert.equal(headers.authorization, `Bearer ${CONFIG.token}`);
  }
  const query = (route) => w.api.requests.find(({ url }) => url.pathname.endsWith(route)).url;
  assert.equal(query('/accounts').searchParams.get('type'), 'asset');
  assert.equal(query('/budgets').searchParams.get('start'), '2026-10-01');
  assert.equal(query('/budgets').searchParams.get('end'), '2026-10-31');
  assert.equal(query('/budget-limits').searchParams.get('start'), '2026-10-16');
  assert.equal(query('/bills').searchParams.get('end'), '2027-10-17');
  assert.deepEqual(w.fake.connectionStatus.connected, true);
});

test('inactive accounts and bills are left out, no IBAN anywhere in the devices', async (t) => {
  const w = await world(t);
  const json = JSON.stringify(w.fake.discoveredDevices);
  assert.equal(deviceOf(w, 'account', 8), undefined, 'inactive account');
  assert.equal(deviceOf(w, 'bill', 4), undefined, 'inactive bill');
  assert.ok(!json.includes('FR00'), 'IBAN');
  assert.equal(deviceOf(w, 'account', 6).name, 'US account');
  assert.equal(featureId(deviceOf(w, 'account', 6), 'balance').endsWith(':balance'), true);
  assert.equal(deviceOf(w, 'account', 6).features[0].unit, 'dollar');
});

test('only the devices added in Gladys get states, with the values of Firefly III', async (t) => {
  const w = await world(t);
  assert.equal(w.fake.states.length, 0);
  await createAll(w);
  assert.equal(last(w, 'account', 1, 'balance'), 3429.95);
  assert.equal(last(w, 'account', 5, 'balance'), -45);
  assert.equal(last(w, 'budget', 1, 'spent'), 382.55);
  assert.equal(last(w, 'budget', 1, 'limit'), 400);
  assert.equal(last(w, 'budget', 1, 'left'), 17.45);
  assert.equal(last(w, 'budget', 1, 'percent'), 95.6);
  // The weekly limit of Transport counts its own week.
  assert.equal(last(w, 'budget', 3, 'percent'), 45);
  // No limit: spent this month only.
  assert.equal(last(w, 'budget', 4, 'spent'), 0);
  assert.equal(last(w, 'budget', 4, 'limit'), undefined);
  assert.equal(last(w, 'bill', 2, 'amount'), 32.49);
  assert.equal(last(w, 'bill', 2, 'days_left'), 2);
  assert.equal(last(w, 'bill', 2, 'next_due'), '18/10/2026');
  assert.equal(last(w, 'bill', 3, 'days_left'), 136);
  assert.equal(last(w, 'piggy_bank', 1, 'progress'), 40);
  assert.equal(last(w, 'piggy_bank', 3, 'target'), undefined);
  assert.equal(last(w, 'summary', 'EUR', 'net_worth'), 11384.95);
  assert.equal(last(w, 'summary', 'EUR', 'spent_month'), 1415.05);
  assert.equal(last(w, 'summary', 'EUR', 'bills_unpaid'), 32.49);
  assert.equal(last(w, 'summary', 'USD', 'net_worth'), 1200);
});

test('an unchanged cycle publishes nothing, a new balance publishes only it', async (t) => {
  const w = await world(t);
  await createAll(w);
  const before = w.fake.states.length;
  await cycle(w);
  assert.equal(w.fake.states.length, before);
  w.api.item('accounts', 1).current_balance = '3400.00';
  await cycle(w);
  assert.deepEqual(
    w.fake.states.slice(before).map((s) => [s.device_feature_external_id, s.state]),
    [[featureId(deviceOf(w, 'account', 1), 'balance'), 3400]],
  );
});

test('the container reads Firefly III on its own timer, without onPoll', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const api = createApi();
  const gladys = createFakeGladys({ config: { ...CONFIG, refresh_interval: '30' } });
  const app = registerHandlers(gladys, { store: new Store(t.name), request: api.request });
  t.after(() => app.stop());
  await gladys.connect();
  await app.ready;
  await app.monitor.running;
  const first = api.requests.length;
  t.mock.timers.tick(30 * 60 * 1000);
  await app.monitor.running;
  assert.equal(api.requests.length, first * 2);
  assert.equal(
    gladys.fake.discoveredDevices.every((device) => device.should_poll === false),
    true,
  );
});

test('onDeviceCreated publishes the states of the new device and refreshes the widget', async (t) => {
  const w = await world(t);
  const refreshes = w.fake.widgetRefreshes.length;
  w.clock.advance(20000);
  await w.fake.deviceCreated(deviceOf(w, 'account', 3));
  assert.equal(last(w, 'account', 3, 'balance'), 8000);
  assert.equal(w.fake.widgetRefreshes.length, refreshes + 1);
});

test('bill due: on the day of each level, once, for the bills added only', async (t) => {
  const w = await world(t);
  await createAll(w, (device) => device.external_id.endsWith(':bill:2'));
  await cycle(w);
  // Internet is due on 18/10: two days from the 16th.
  assert.deepEqual(
    events(w, 'bill_due').map((e) => e.data),
    [
      {
        device: deviceOf(w, 'bill', 2).external_id,
        days: '2',
        name: 'Internet',
        amount: 32.49,
        currency: 'EUR',
        due_date: '2026-10-18',
        text: 'Internet : 32,49 € à payer dans 2 jours.',
      },
    ],
  );
  await cycle(w);
  assert.equal(events(w, 'bill_due').length, 1, 'once');
  await cycle(w, 24 * 60);
  await cycle(w, 24 * 60);
  assert.deepEqual(
    events(w, 'bill_due').map((e) => [e.data.days, e.data.text]),
    [
      ['2', 'Internet : 32,49 € à payer dans 2 jours.'],
      ['1', 'Internet : 32,49 € à payer demain.'],
      ['0', "Internet : 32,49 € à payer aujourd'hui."],
    ],
  );
});

test('budget threshold: the level already reached is the start, each new one fires once', async (t) => {
  const w = await world(t);
  await createAll(w, (device) => device.external_id.includes(':budget:'));
  await cycle(w);
  assert.equal(events(w, 'budget_threshold').length, 0, 'Courses at 95.6 %: the start');
  w.api.body('budget-limits').data[0].attributes.spent[0].sum = '-401.00';
  w.api.body('budget-limits').data[2].attributes.spent[0].sum = '-48.00';
  await cycle(w);
  await cycle(w);
  assert.deepEqual(
    events(w, 'budget_threshold').map((e) => [e.data.name, e.data.level, e.data.percent]),
    [
      ['Courses', '100', 100.3],
      ['Transport', '50', 96],
      ['Transport', '75', 96],
      ['Transport', '90', 96],
    ],
  );
  assert.equal(
    events(w, 'budget_threshold')[0].data.text,
    'Budget Courses : 100 % consommés, 401,00 € sur 400,00 €.',
  );
});

test('budget threshold: a new period starts from zero', async (t) => {
  const w = await world(t);
  await createAll(w, (device) => device.external_id.endsWith(':budget:3'));
  const limit = w.api.body('budget-limits').data[2].attributes;
  limit.start = '2026-10-19T00:00:00+02:00';
  limit.end = '2026-10-25T23:59:59+02:00';
  limit.spent[0].sum = '-26.00';
  await cycle(w, 3 * 24 * 60);
  assert.deepEqual(
    events(w, 'budget_threshold').map((e) => e.data.level),
    ['50'],
  );
});

test('what was fired survives a restart', async (t) => {
  const first = await createWorld();
  await createAll(first, (device) => device.external_id.endsWith(':bill:2'));
  await cycle(first);
  await first.app.stop();
  assert.equal(events(first, 'bill_due').length, 1);
  const devices = first.fake.devices;
  const again = await world(t, { dataDir: first.dataDir, devices });
  await cycle(again);
  assert.equal(events(again, 'bill_due').length, 0);
});

test('a failed scene event is sent again at the next cycle', async (t) => {
  const w = await world(t);
  await createAll(w, (device) => device.external_id.endsWith(':bill:2'));
  const original = w.gladys.publishSceneEvent.bind(w.gladys);
  let fail = true;
  t.mock.method(w.gladys, 'publishSceneEvent', async (...args) => {
    if (fail) {
      throw new Error('HTTP 429');
    }
    return original(...args);
  });
  await cycle(w);
  assert.equal(events(w, 'bill_due').length, 0);
  fail = false;
  await cycle(w);
  assert.equal(events(w, 'bill_due').length, 1);
});

test('connection status: token refused, unreachable, certificate, then back', async (t) => {
  const w = await world(t, { config: { ...CONFIG, token: 'wrong' } });
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.match(w.fake.connectionStatus.message.fr, /refuse le jeton/);
  assert.deepEqual(w.fake.discoveredDevices, []);

  await w.fake.configUpdated(CONFIG);
  assert.equal(w.fake.connectionStatus.connected, true);
  const devices = w.fake.discoveredDevices.length;

  w.api.down = 'network';
  await cycle(w);
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.match(w.fake.connectionStatus.message.en, /does not answer/);
  assert.equal(w.fake.discoveredDevices.length, devices, 'the devices stay');

  w.api.down = 'certificate';
  await cycle(w);
  assert.match(w.fake.connectionStatus.message.en, /self-signed certificate/);

  w.api.down = false;
  await cycle(w);
  assert.equal(w.fake.connectionStatus.connected, true);
});

test('no address: the status says so, nothing is requested', async (t) => {
  const w = await world(t, { config: {} });
  assert.equal(w.api.requests.length, 0);
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.match(w.fake.connectionStatus.message.en, /Enter the address/);
});

test('a reconnection publishes the devices and the states again', async (t) => {
  const w = await world(t);
  await createAll(w);
  const before = w.fake.states.length;
  await w.gladys.disconnect();
  await w.gladys.connect();
  assert.ok(w.fake.states.length > before);
});

test('a page beyond the first is read', async (t) => {
  const api = createApi();
  const accounts = api.body('accounts');
  const [first, ...rest] = accounts.data;
  const pages = { 1: [first], 2: rest };
  const request = api.request;
  api.request = async (input, options) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/accounts')) {
      const page = Number(url.searchParams.get('page'));
      const body = { ...accounts, data: pages[page], meta: { pagination: { total_pages: 2 } } };
      return { status: 200, headers: {}, body: JSON.stringify(body) };
    }
    return request(input, options);
  };
  const w = await world(t, { api });
  assert.equal(
    w.fake.discoveredDevices.filter((d) => d.external_id.includes(':account:')).length,
    4,
  );
});
