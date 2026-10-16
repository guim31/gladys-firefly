// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake Firefly III serving the
// answers recorded on Firefly III 6.7.9 (test/fixtures/firefly), a manual
// clock, a temporary /data, and the integration wired on top through
// registerHandlers. Nothing touches the network.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { Store } from '../../src/store.js';

process.env.LOG_LEVEL ??= 'silent';
process.env.TZ = 'Europe/Paris';

export const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));

export const TOKEN = 'test-token-0000';
export const URL_BASE = 'http://192.0.2.10:8080';
export const CONFIG = { url: URL_BASE, token: TOKEN };

// The answers were recorded on 16/10/2026 in the afternoon, Paris time.
export const START = Date.parse('2026-10-16T14:00:00+02:00');

const ROUTES = {
  about: 'about.json',
  accounts: 'accounts.json',
  budgets: 'budgets.json',
  'budget-limits': 'budget-limits.json',
  bills: 'bills.json',
  'piggy-banks': 'piggy-banks.json',
  'summary/basic': 'summary.json',
};

/**
 * Fake Firefly III. `api.down`: 'network' (connection refused), 'certificate',
 * a status (500, 502) or false. `api.body(route)` gives the answer to change.
 */
export function createApi() {
  const bodies = new Map();
  const api = {
    down: false,
    requests: [],

    body(route) {
      if (!bodies.has(route)) {
        bodies.set(route, fixture(`firefly/${ROUTES[route]}`));
      }
      return bodies.get(route);
    },

    /** The attributes of one object of a list. */
    item(route, id) {
      return api.body(route).data.find((entry) => entry.id === String(id)).attributes;
    },

    async request(input, options = {}) {
      const url = new URL(input);
      api.requests.push({ url, headers: options.headers ?? {}, insecure: options.insecure });
      if (api.down === 'network') {
        throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
      }
      if (api.down === 'certificate') {
        throw Object.assign(new Error('self-signed certificate'), {
          code: 'DEPTH_ZERO_SELF_SIGNED_CERT',
        });
      }
      if (api.down) {
        return { status: api.down, headers: {}, body: '<html>Bad gateway</html>' };
      }
      if (options.headers?.authorization !== `Bearer ${TOKEN}`) {
        return {
          status: 401,
          headers: {},
          body: '{"message":"Unauthenticated.","exception":"AuthenticationException"}',
        };
      }
      const route = url.pathname.replace(/^\/api\/v1\//, '');
      if (!ROUTES[route]) {
        return { status: 404, headers: {}, body: '{"message":"Resource not found"}' };
      }
      return { status: 200, headers: {}, body: JSON.stringify(api.body(route)) };
    },

    /** Routes requested so far, in order. */
    routes() {
      return api.requests.map(({ url }) => url.pathname.replace(/^\/api\/v1\//, ''));
    },
  };
  return api;
}

/** A manual clock. */
export function createClock(start = START) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {object} [options.api] from createApi
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = CONFIG,
  devices = [],
  api = createApi(),
  connect = true,
  clock = createClock(),
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-firefly-')),
} = {}) {
  const gladys = createFakeGladys({ config, devices });
  const store = new Store(dataDir);
  const app = registerHandlers(gladys, {
    store,
    request: api.request,
    timers: false,
    now: clock.now,
  });
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.monitor.running;
  }
  return { gladys, fake: gladys.fake, app, monitor: app.monitor, api, clock, store, dataDir };
}

/** Create discovered devices in Gladys, as the user would (all, or those matching). */
export async function createAll(world, filter = () => true) {
  const devices = world.fake.discoveredDevices.filter(filter);
  for (const device of devices) {
    await world.fake.deviceCreated(device);
  }
  return devices;
}

/** The discovered device of a Firefly III object: type and id. */
export const deviceOf = (world, type, id) =>
  world.fake.discoveredDevices.find((device) => device.external_id.endsWith(`:${type}:${id}`));

/** External id of one feature of a device. */
export const featureId = (device, key) =>
  device.features.find((feature) => feature.external_id.endsWith(`:${key}`))?.external_id;

/** Run one refresh cycle, `minutes` later. */
export async function cycle(world, minutes = 15) {
  world.clock.advance(minutes * 60 * 1000);
  await world.monitor.runCycle();
}

/**
 * Capture the integration's log lines at `level` and above (LOG_LEVEL is read
 * at every call). Returns the lines as `{ level, text }`.
 */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
