// -----------------------------------------------------------------------------
// The monitor: reads Firefly III every `refresh_interval` minutes, publishes
// the devices and their states, fires the scene triggers and serves the
// widget and the actions.
//
// Devices are published with should_poll: false: the container runs its own
// timer (the core only polls up to one minute, and see the 5.2.0 trap in
// CLAUDE.md). Only the devices added in Gladys get states, triggers, and a
// place in the widget and the actions: the Discover tab is where the user
// picks what Gladys shows.
//
// Triggers:
//   - bill_due: a bill is expected in 0, 1, 2, 3 or 7 days; one event per
//     bill, due date and number of days, on that day only (a level already
//     past is not news).
//   - budget_threshold: the spending of a budget reaches 50, 75, 90 or 100 %
//     of its limit; one event per level and per period of the limit. The
//     level already reached when a budget is first seen is the starting
//     point, not news.
// What was fired is kept under /data: a restart fires nothing twice.
//
// Money is private: the logs only ever hold counts, ids and levels, never an
// amount, a name or the address of the server.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { BILL_DAYS, BUDGET_LEVELS } from './config.js';
import { DEVICE_TYPES, buildDevice, deviceIds } from './devices.js';
import {
  FireflyClient,
  NotFireflyError,
  UnauthorizedError,
  daysBetween,
  isCertificateError,
  localDay,
} from './firefly.js';
import { PHRASES, STATUS, formatAmount, formatDay, formatPercent, render, when } from './texts.js';

const logger = createLogger({ name: 'firefly' });

export const WIDGET_KEY = 'overview';
export const TRIGGERS = { BILL: 'bill_due', BUDGET: 'budget_threshold' };

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const DEFAULT_TIMINGS = {
  heartbeatMs: 12 * HOUR,
  // requestWidgetRefresh is rate-limited to one call every 10 s by the core.
  widgetRefreshMs: 10000,
};

const LEVELS = BUDGET_LEVELS.map(Number);
const DAYS = BILL_DAYS.map(Number);

// The objects of a snapshot, by device type.
const LISTS = {
  [DEVICE_TYPES.ACCOUNT]: 'accounts',
  [DEVICE_TYPES.BUDGET]: 'budgets',
  [DEVICE_TYPES.BILL]: 'bills',
  [DEVICE_TYPES.PIGGY_BANK]: 'piggyBanks',
  [DEVICE_TYPES.SUMMARY]: 'summaries',
};

const idOf = (type, item) => (type === DEVICE_TYPES.SUMMARY ? item.currency : item.id);

export class Monitor {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK fake)
   * @param {object} options.store see src/store.js
   * @param {Function} [options.request] httpRequest (the tests pass a fake Firefly III)
   * @param {boolean} [options.timers] false: no background timer (tests drive the cycles)
   * @param {Function} [options.now] clock in ms
   * @param {object} [options.timings] overrides of DEFAULT_TIMINGS
   */
  constructor({ gladys, store, request, timers = true, now, timings }) {
    this.gladys = gladys;
    this.store = store;
    this.request = request;
    this.timers = timers;
    this.now = now ?? (() => Date.now());
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
    this.config = null;
    this.client = null;
    this.data = emptyData();
    this.snapshot = null;
    this.problem = null;
    this.lastSuccessAt = null;
    this.lastCycleAt = -Infinity;
    this.discovered = null;
    this.statusMessage = undefined;
    this.cycleTimer = null;
    this.running = null;
    this.lastRefreshAt = -Infinity;
    this.refreshTimer = null;
    this.signature = null;
    this.stopped = false;
    // Keys of the failures already logged, so a repeated one is not logged again.
    this.failing = new Set();
  }

  /** Log a failure once (warn or error), then at debug until `recovered(key)`. */
  failed(key, level, message) {
    if (this.failing.has(key)) {
      logger.debug(message);
      return;
    }
    this.failing.add(key);
    logger[level](message);
  }

  /** One line when a failure logged by `failed(key)` is over. */
  recovered(key, message) {
    if (this.failing.delete(key)) {
      logger.info(message);
    }
  }

  // --- Lifecycle -------------------------------------------------------------

  async start(config) {
    const saved = await this.store.load();
    if (saved?.version === 1) {
      const valid = (value) => value && typeof value === 'object' && !Array.isArray(value);
      this.data = {
        ...emptyData(),
        bills: valid(saved.bills) ? saved.bills : {},
        budgets: valid(saved.budgets) ? saved.budgets : {},
      };
    }
    this.configure(config);
    logger.info(`Started: Firefly III read every ${config.refreshMinutes} min`);
    this.schedule();
    this.runCycle();
  }

  configure(config) {
    this.config = config;
    this.client =
      config.url && config.token
        ? new FireflyClient({
            url: config.url,
            token: config.token,
            insecure: config.insecure,
            ...(this.request ? { request: this.request } : {}),
          })
        : null;
    if (!this.client) {
      this.problem = config.invalidUrl ? 'invalidUrl' : config.url ? 'noToken' : 'noUrl';
      logger.warn(
        config.invalidUrl
          ? 'The address of Firefly III is not understood'
          : 'Address or token of Firefly III missing',
      );
    }
  }

  /** Reconnection: Gladys may have restarted, publish everything again. */
  async resync(config) {
    this.config = config;
    this.discovered = null;
    await this.publishDiscovered();
    this.statusMessage = undefined;
    await this.updateConnectionStatus();
    this.gladys.forgetPublishedStates?.();
    await this.publishStates();
    this.requestRefresh();
  }

  async reconfigure(config) {
    await this.running;
    this.problem = null;
    this.failing.delete('firefly');
    logger.info('Configuration saved');
    this.configure(config);
    // The language may have changed: the names of the next devices with it.
    this.discovered = null;
    this.schedule();
    await this.runCycle();
    this.requestRefresh();
  }

  async stop() {
    this.stopped = true;
    clearInterval(this.cycleTimer);
    clearTimeout(this.refreshTimer);
    this.cycleTimer = null;
    await this.running?.catch(() => {});
    await this.store.flush();
  }

  schedule() {
    if (!this.timers || this.stopped) {
      return;
    }
    clearInterval(this.cycleTimer);
    this.cycleTimer = setInterval(() => this.runCycle(), this.config.refreshMinutes * MINUTE);
    this.cycleTimer.unref?.();
  }

  // --- Devices ----------------------------------------------------------------

  /** Every object of the last snapshot with its type: [{ type, item, ids }]. */
  entries() {
    if (!this.snapshot) {
      return [];
    }
    return Object.entries(LISTS).flatMap(([type, list]) =>
      this.snapshot[list].map((item) => ({
        type,
        item,
        ids: deviceIds(this.gladys, type, idOf(type, item)),
      })),
    );
  }

  isCreated(externalId) {
    return (this.gladys.devices ?? []).some((device) => device.external_id === externalId);
  }

  /** The objects of one type whose device is added in Gladys. */
  created(type) {
    return this.entries()
      .filter((entry) => entry.type === type && this.isCreated(entry.ids.device))
      .map((entry) => entry.item);
  }

  /** Whether an external id is a device of this integration. */
  owns(externalId) {
    return this.entries().some((entry) => entry.ids.device === externalId);
  }

  // --- Cycles -----------------------------------------------------------------

  runCycle() {
    if (this.running || this.stopped) {
      return this.running;
    }
    this.running = this.cycle()
      .catch((err) => this.failed('cycle', 'error', `Refresh cycle failed: ${err.message}`))
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  async cycle() {
    const now = this.now();
    this.lastCycleAt = now;
    if (!this.client) {
      await this.updateConnectionStatus();
      return;
    }
    try {
      this.snapshot = await this.client.snapshot(localDay(now));
      this.problem = null;
      this.lastSuccessAt = this.now();
      this.recovered('firefly', 'Firefly III answers again');
    } catch (err) {
      this.problem = problemOf(err);
      this.failed('firefly', 'warn', err.message);
      await this.updateConnectionStatus();
      return;
    }
    const counts = Object.values(LISTS)
      .map((list) => `${this.snapshot[list].length} ${list}`)
      .join(', ');
    logger.debug(`Refresh cycle: ${counts}`);
    this.recovered('cycle', 'Refresh cycles work again');
    await this.publishDiscovered();
    await this.publishStates();
    await this.checkTriggers(localDay(now));
    this.store.save(this.data);
    await this.updateConnectionStatus();
    const signature = JSON.stringify(this.snapshot);
    if (signature !== this.signature) {
      this.signature = signature;
      this.requestRefresh();
    }
  }

  async publishDiscovered() {
    if (!this.config || !this.snapshot) {
      return;
    }
    const devices = this.entries().map(({ type, item }) =>
      buildDevice(this.gladys, type, item, this.config.language),
    );
    const signature = JSON.stringify(devices);
    if (signature === this.discovered) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.discovered = signature;
      this.recovered('discovery', 'Publishing the devices works again');
    } catch (err) {
      this.failed('discovery', 'warn', `Publishing the devices failed: ${err.message}`);
    }
  }

  /** The states of one object; absent values are not sent. */
  statesOf(type, item, ids, today) {
    const values = {
      account: () => ({ balance: item.balance }),
      budget: () => ({
        spent: item.spent,
        limit: item.limit,
        left: item.left,
        percent: item.percent,
      }),
      bill: () => ({
        amount: item.amount,
        days_left: item.nextDue === null ? null : daysBetween(today, item.nextDue),
      }),
      piggy_bank: () => ({ saved: item.saved, target: item.target, progress: item.progress }),
      summary: () => ({
        net_worth: item.netWorth,
        spent_month: item.spent,
        earned_month: item.earned,
        left_to_spend: item.leftToSpend,
        bills_unpaid: item.billsUnpaid,
      }),
    }[type]();
    const states = Object.entries(values)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({ device_feature_external_id: ids[key], state: value }));
    if (type === DEVICE_TYPES.BILL && item.nextDue !== null) {
      states.push({
        device_feature_external_id: ids.next_due,
        text: formatDay(item.nextDue, this.config.language),
      });
    }
    return states;
  }

  async publishStates() {
    if (!this.snapshot) {
      return;
    }
    const today = localDay(this.now());
    const states = this.entries()
      .filter(({ ids }) => this.isCreated(ids.device))
      .flatMap(({ type, item, ids }) => this.statesOf(type, item, ids, today));
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: this.timings.heartbeatMs });
      this.recovered('publish', 'Publishing the states works again');
    } catch (err) {
      // Sent again at the next cycle (the SDK forgets what Gladys refused).
      this.failed('publish', 'warn', `Publishing the states failed: ${err.message}`);
    }
  }

  async updateConnectionStatus() {
    const connected = this.problem === null && this.lastSuccessAt !== null;
    const message = this.problem ? render(STATUS, this.problem) : undefined;
    const key = JSON.stringify([connected, message]);
    if (key === this.statusMessage) {
      return;
    }
    this.statusMessage = key;
    await this.gladys.setConnectionStatus(connected, message).catch(() => {});
  }

  // --- Scene triggers -----------------------------------------------------------

  async checkTriggers(today) {
    const language = this.config.language;
    const phrases = PHRASES[language];

    // Bills: on the day of each level, once per due date.
    const bills = this.data.bills;
    for (const [key, due] of Object.entries(bills)) {
      if (due < today) {
        delete bills[key];
      }
    }
    for (const bill of this.created(DEVICE_TYPES.BILL)) {
      if (bill.nextDue === null) {
        continue;
      }
      const days = daysBetween(today, bill.nextDue);
      const key = `${bill.id}|${bill.nextDue}|${days}`;
      if (!DAYS.includes(days) || bills[key]) {
        continue;
      }
      const amount = formatAmount(bill.amount, bill.currency, language);
      const sent = await this.fire(TRIGGERS.BILL, `Bill #${bill.id} due in ${days} day(s)`, {
        device: deviceIds(this.gladys, DEVICE_TYPES.BILL, bill.id).device,
        days: String(days),
        name: bill.name,
        amount: bill.amount ?? 0,
        currency: bill.currency ?? '',
        due_date: bill.nextDue,
        text: phrases.billDue({ name: bill.name, amount, when: when(days, language) }),
      });
      if (sent) {
        bills[key] = bill.nextDue;
      }
    }

    // Budgets: each level once per period; the first reading is the start.
    const records = this.data.budgets;
    const seen = new Set();
    for (const { type, item: budget, ids } of this.entries()) {
      if (type !== DEVICE_TYPES.BUDGET || budget.percent === null) {
        continue;
      }
      seen.add(budget.id);
      const reached = Math.max(0, ...LEVELS.filter((level) => budget.percent >= level));
      const record = records[budget.id];
      if (!record) {
        records[budget.id] = { period: budget.period, level: reached };
        continue;
      }
      if (record.period !== budget.period) {
        Object.assign(record, { period: budget.period, level: 0 });
      }
      if (!this.isCreated(ids.device)) {
        record.level = Math.max(record.level, reached);
        continue;
      }
      for (const level of LEVELS.filter((l) => l > record.level && l <= reached)) {
        const params = {
          name: budget.name,
          spent: formatAmount(budget.spent, budget.currency, language),
          limit: formatAmount(budget.limit, budget.currency, language),
          percent: formatPercent(budget.percent, language),
        };
        const sent = await this.fire(TRIGGERS.BUDGET, `Budget #${budget.id} reached ${level} %`, {
          device: ids.device,
          level: String(level),
          name: budget.name,
          spent: budget.spent,
          limit: budget.limit,
          percent: budget.percent,
          currency: budget.currency ?? '',
          text: phrases.budgetLevel(params),
        });
        if (!sent) {
          break; // tried again at the next cycle
        }
        record.level = level;
      }
    }
    for (const id of Object.keys(records)) {
      if (!seen.has(id)) {
        delete records[id];
      }
    }
  }

  async fire(key, line, data) {
    // Ids and levels only: names and amounts stay out of the logs.
    logger.info(`Scene trigger: ${line}`);
    try {
      await this.gladys.publishSceneEvent(key, data);
      this.recovered('scene', 'Scene triggers work again');
      return true;
    } catch (err) {
      this.failed('scene', 'warn', `Firing the scene trigger failed: ${err.message}`);
      return false;
    }
  }

  // --- Gladys events --------------------------------------------------------------

  async onDeviceCreated(device) {
    if (!this.owns(device?.external_id)) {
      return;
    }
    // The SDK forgot the states of the device: everything is published again.
    await this.publishStates();
    this.requestRefresh();
  }

  /** onPoll fallback: should_poll is false, but a Gladys polling anyway gets an answer. */
  async poll(device) {
    if (!this.owns(device?.external_id)) {
      return;
    }
    if (this.now() - this.lastCycleAt >= (this.config.refreshMinutes * MINUTE) / 2) {
      await this.runCycle();
    } else {
      await this.publishStates();
    }
  }

  /** The snapshot, read again if the last cycle is older than one interval (or `force`). */
  async fresh(force = false) {
    await this.running;
    if (force || this.now() - this.lastCycleAt >= this.config.refreshMinutes * MINUTE) {
      await this.runCycle();
    }
    return this.snapshot;
  }

  // --- Widget -------------------------------------------------------------------

  requestRefresh() {
    if (this.stopped) {
      return;
    }
    const now = this.now();
    const wait = this.lastRefreshAt + this.timings.widgetRefreshMs - now;
    if (wait <= 0) {
      this.lastRefreshAt = now;
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    } else if (this.timers && !this.refreshTimer) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        this.requestRefresh();
      }, wait);
      this.refreshTimer.unref?.();
    }
  }
}

/** The STATUS key of a failed reading. */
export function problemOf(err) {
  if (err instanceof UnauthorizedError) {
    return 'unauthorized';
  }
  if (err instanceof NotFireflyError) {
    return 'notFirefly';
  }
  if (isCertificateError(err)) {
    return 'certificate';
  }
  return 'unreachable';
}

function emptyData() {
  return { version: 1, bills: {}, budgets: {} };
}
