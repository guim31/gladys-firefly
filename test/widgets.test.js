// -----------------------------------------------------------------------------
// The `overview` widget and the scene and configuration actions, on the
// recorded Firefly III answers: what is shown and told is what was added in
// Gladys, in the language asked, within the budget of the core.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createAll, createWorld, cycle } from './helpers/world.js';

const plain = (value) => JSON.parse(JSON.stringify(value).replace(/[\u00a0\u202f]/g, ' '));

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}

const content = async (w, language = 'en') => {
  const { success, data } = await w.fake.widgetGet('overview', { language, settings: {} });
  assert.equal(success, true);
  return data.content;
};

test('the widget shows the accounts and budgets added, within the core budget', async (t) => {
  const w = await world(t);
  await createAll(w);
  for (const language of ['en', 'fr', 'de', 'es']) {
    assert.deepEqual(validateWidgetContent(await content(w, language)), [], language);
  }
  const data = plain(await content(w, 'fr'));
  const status = data.components.find((c) => c.type === 'status');
  assert.deepEqual(
    status.items.map((item) => [item.label, item.value, item.color]),
    [
      ['Compte courant', '3 429,95 €', 'neutral'],
      ['Livret A', '8 000,00 €', 'neutral'],
      ['Carte de crédit', '-45,00 €', 'danger'],
      ['US account', '1 200,00 $', 'neutral'],
    ],
  );
  const list = data.components.find((c) => c.type === 'card-list');
  assert.deepEqual(
    list.items.map((item) => [item.title, item.subtitle, item.badge?.text, item.badge?.color]),
    [
      ['Courses', '382,55 € sur 400,00 €', '96 %', 'warning'],
      ['Loisirs', '160,00 € sur 150,00 €', '107 %', 'danger'],
      ['Transport', '22,50 € sur 50,00 €', '45 %', 'success'],
      ['Divers', '0,00 € dépensé', undefined, undefined],
    ],
  );
  assert.match(list.items[2].description, /12\/10\/2026 → 18\/10\/2026/);
  assert.match(data.components.at(-1).text, /^Firefly III · Lu le 16\/10 14:00/);
});

test('the widget before any device, and before any answer', async (t) => {
  const w = await world(t);
  const data = await content(w, 'en');
  assert.equal(data.components[0].text, 'Add accounts to Gladys');
  const down = await world(t, { config: { url: 'http://192.0.2.10', token: 'wrong' } });
  assert.deepEqual((await content(down, 'de')).components, [
    { type: 'text', variant: 'heading', text: 'Firefly III antwortet nicht' },
  ]);
});

test('read_balances and read_budgets tell the devices added', async (t) => {
  const w = await world(t);
  let { data } = await w.fake.sceneAction('read_balances', {});
  assert.deepEqual(data.outputs, { text: 'Aucun compte ajouté à Gladys.', count: 0 });
  await createAll(w, (device) => /:(account:1|budget:[12])$/.test(device.external_id));
  ({ data } = await w.fake.sceneAction('read_balances', {}));
  assert.deepEqual(plain(data.outputs), { text: 'Compte courant : 3 429,95 €.', count: 1 });
  ({ data } = await w.fake.sceneAction('read_budgets', {}));
  assert.deepEqual(plain(data.outputs), {
    text: 'Courses : 382,55 € dépensés sur 400,00 € (96 %). Loisirs : 160,00 € dépensés sur 150,00 € (107 %).',
    count: 2,
    over_count: 1,
  });
});

test('read_bills: the bills added due within the chosen days, nearest first', async (t) => {
  const w = await world(t, {
    config: { url: 'http://192.0.2.10:8080', token: 'test-token-0000', language: 'en' },
  });
  await createAll(w, (device) => device.external_id.includes(':bill:'));
  let { data } = await w.fake.sceneAction('read_bills', { days: '7' });
  assert.deepEqual(plain(data.outputs), { text: 'Internet: €32.49 in 2 days.', count: 1 });
  ({ data } = await w.fake.sceneAction('read_bills', { days: '31' }));
  assert.deepEqual(plain(data.outputs), {
    text: 'Internet: €32.49 in 2 days. Loyer: €850.00 in 20 days.',
    count: 2,
  });
});

test('a scene action reads Firefly III again when the last reading is old', async (t) => {
  const w = await world(t);
  await createAll(w, (device) => device.external_id.endsWith(':account:1'));
  const requests = w.api.requests.length;
  await w.fake.sceneAction('read_balances', {});
  assert.equal(w.api.requests.length, requests, 'fresh enough');
  w.api.item('accounts', 1).current_balance = '10.00';
  w.clock.advance(16 * 60 * 1000);
  const { data } = await w.fake.sceneAction('read_balances', {});
  assert.equal(plain(data.outputs).text, 'Compte courant : 10,00 €.');
});

test('a scene action fails with the reason when the token is refused', async (t) => {
  const w = await world(t, { config: { url: 'http://192.0.2.10:8080', token: 'wrong' } });
  const { success, error } = await w.fake.sceneAction('read_balances', {});
  assert.equal(success, false);
  assert.match(String(error?.message ?? error), /refuse le jeton/);
});

test('check_now tests the connection and says what Firefly III holds', async (t) => {
  const w = await world(t);
  await cycle(w, 1);
  const { data } = await w.fake.action('check_now', {});
  assert.equal(
    data.message.fr,
    'Connecté à Firefly III 6.7.9 : 4 compte(s), 4 budget(s), 3 facture(s), 3 tirelire(s).',
  );
  w.api.down = 'network';
  const failed = await w.fake.action('check_now', {});
  assert.match(JSON.stringify(failed.data), /does not answer/);
});
