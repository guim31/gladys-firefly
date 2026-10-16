// -----------------------------------------------------------------------------
// Firefly III client: the REST API `/api/v1` with a personal access token
// (Bearer), GET only. One snapshot reads, in this order:
//
//   about                                    version (and a check of the token)
//   accounts?type=asset                      active asset accounts, balance
//   budgets?start=<month>&end=<month>        active budgets, spent this month
//   budget-limits?start=<today>&end=<+1 day> the limits covering today, with
//                                            what was spent in their own period
//   bills?start=<today>&end=<+1 year>        next expected date of each bill
//   piggy-banks                              saved, target, percentage
//   summary/basic?start=<month>&end=<month>  net worth, spent, earned...
//
// Lists are paged (50 per page). Every amount arrives as a string: parsed
// here, and nothing of it is logged (see src/monitor.js).
// Shapes recorded on Firefly III 6.7.9: test/fixtures/firefly.
// -----------------------------------------------------------------------------

import { httpRequest } from './http.js';

const PAGE_SIZE = 50;
// 50 × 20 = 1000 objects of one kind: far beyond a household.
const MAX_PAGES = 20;

export class UnauthorizedError extends Error {}
export class NotFireflyError extends Error {}

/** A request that did not reach Firefly III, with a reason fit for the logs. */
export class UnreachableError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const CERTIFICATE_CODES = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

/** Whether an error is a certificate the user could choose to trust. */
export const isCertificateError = (err) => CERTIFICATE_CODES.has(err?.code);

/** A number of an amount string, null when absent or not a number. */
export function amountOf(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  // `|| 0`: no -0 published for a rounded -0.001.
  return Number.isFinite(number) ? Math.round(number * 100) / 100 || 0 : null;
}

/** The calendar day (YYYY-MM-DD) of a Firefly III date, as written by it. */
export const dayOf = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

/** Today in the time zone of Gladys (TZ), as YYYY-MM-DD. */
export function localDay(ms) {
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A day shifted by whole days (calendar arithmetic, no time zone). */
export function addDays(day, days) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from, to) {
  const ms = (day) => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86400000);
}

/** The first and last day of the month of a day. */
export function monthOf(day) {
  const [y, m] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const month = String(m).padStart(2, '0');
  return { start: `${y}-${month}-01`, end: `${y}-${month}-${String(last).padStart(2, '0')}` };
}

/** The sum of a `spent` array in one currency, as a positive amount. */
function spentIn(spent, currency) {
  if (!Array.isArray(spent)) {
    return 0;
  }
  const total = spent
    .filter((entry) => !currency || entry.currency_code === currency)
    .reduce((sum, entry) => sum + (amountOf(entry.sum) ?? 0), 0);
  return Math.round(Math.abs(total) * 100) / 100;
}

export const parseAccount = ({ id, attributes: a }) => ({
  id: String(id),
  name: String(a.name ?? '').trim() || `#${id}`,
  currency: a.currency_code ?? a.primary_currency_code ?? null,
  balance: amountOf(a.current_balance),
});

/**
 * A budget: what was spent in the period of its limit covering today (the
 * month for most), or this month when it has no limit.
 */
export function parseBudget({ id, attributes: a }, limits) {
  const own = limits.filter((limit) => String(limit.attributes.budget_id) === String(id));
  // A budget may have one limit per currency: the one of the budget wins.
  const chosen =
    own.find((limit) => limit.attributes.currency_code === a.currency_code) ?? own[0] ?? null;
  const currency =
    chosen?.attributes.currency_code ?? a.currency_code ?? a.primary_currency_code ?? null;
  const limit = chosen ? amountOf(chosen.attributes.amount) : null;
  const spent = chosen ? spentIn(chosen.attributes.spent, currency) : spentIn(a.spent, currency);
  return {
    id: String(id),
    name: String(a.name ?? '').trim() || `#${id}`,
    currency,
    spent,
    limit,
    left: limit === null ? null : Math.round((limit - spent) * 100) / 100,
    percent: limit ? Math.round((spent / limit) * 1000) / 10 : null,
    // The period the levels of the trigger are counted in.
    period: chosen ? `${dayOf(chosen.attributes.start)}/${dayOf(chosen.attributes.end)}` : null,
  };
}

/** A bill: its next expected date from `today`, null when none in a year. */
export function parseBill({ id, attributes: a }) {
  const next =
    dayOf(a.next_expected_match) ??
    (Array.isArray(a.pay_dates)
      ? (a.pay_dates.map(dayOf).filter(Boolean).sort()[0] ?? null)
      : null);
  return {
    id: String(id),
    name: String(a.name ?? '').trim() || `#${id}`,
    currency: a.currency_code ?? a.primary_currency_code ?? null,
    amount: amountOf(a.amount_avg) ?? amountOf(a.amount_max) ?? amountOf(a.amount_min),
    nextDue: next,
  };
}

export function parsePiggyBank({ id, attributes: a }) {
  const saved = amountOf(a.current_amount);
  const target = amountOf(a.target_amount);
  let progress = typeof a.percentage === 'number' ? a.percentage : null;
  if (progress === null && saved !== null && target) {
    progress = Math.round((saved / target) * 1000) / 10;
  }
  return {
    id: String(id),
    name: String(a.name ?? '').trim() || `#${id}`,
    currency: a.currency_code ?? a.primary_currency_code ?? null,
    saved,
    // 0 is "no target" in Firefly III.
    target: target || null,
    progress: progress === null ? null : Math.min(100, Math.max(0, progress)),
  };
}

const SUMMARY_KEYS = {
  'net-worth': 'netWorth',
  spent: 'spent',
  earned: 'earned',
  'left-to-spend': 'leftToSpend',
  'bills-unpaid': 'billsUnpaid',
};

/** The summary per currency: { EUR: { netWorth, spent, ... } }, amounts spent as positive. */
export function parseSummary(body) {
  const result = {};
  for (const [key, entry] of Object.entries(body ?? {})) {
    const match = /^(.+)-in-([A-Za-z0-9]+)$/.exec(key);
    const field = match && SUMMARY_KEYS[match[1]];
    if (!field || !entry || typeof entry !== 'object') {
      continue;
    }
    const currency = entry.currency_code ?? match[2];
    let value = amountOf(entry.monetary_value);
    if (value !== null && ['spent', 'billsUnpaid'].includes(field)) {
      value = Math.abs(value);
    }
    result[currency] ??= { currency };
    result[currency][field] = value;
  }
  return result;
}

export class FireflyClient {
  /**
   * @param {object} options
   * @param {string} options.url base URL, without /api/v1
   * @param {string} options.token personal access token
   * @param {boolean} [options.insecure] accept a self-signed certificate
   * @param {Function} [options.request] httpRequest (the tests pass a fake)
   */
  constructor({ url, token, insecure = false, request = httpRequest }) {
    this.url = url;
    this.token = token;
    this.insecure = insecure;
    this.request = request;
  }

  async get(path, query = {}) {
    const target = new URL(`${this.url}/api/v1/${path}`);
    for (const [key, value] of Object.entries(query)) {
      target.searchParams.set(key, String(value));
    }
    let response;
    try {
      response = await this.request(target.toString(), {
        headers: {
          authorization: `Bearer ${this.token}`,
          accept: 'application/vnd.api+json, application/json',
        },
        insecure: this.insecure,
      });
    } catch (err) {
      const code = err?.code ?? err?.cause?.code;
      // Never the URL: it is the address of the user's server.
      throw new UnreachableError(`Firefly III unreachable (${code ?? err.message})`, code);
    }
    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedError(`Firefly III refused the token (HTTP ${response.status})`);
    }
    if (response.status !== 200) {
      throw new UnreachableError(`Firefly III answered HTTP ${response.status}`, response.status);
    }
    try {
      return JSON.parse(response.body);
    } catch {
      throw new NotFireflyError('The answer is not JSON: not the API of Firefly III');
    }
  }

  async list(path, query = {}) {
    const items = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const body = await this.get(path, { ...query, limit: PAGE_SIZE, page });
      if (!Array.isArray(body?.data)) {
        throw new NotFireflyError(`Unexpected answer for ${path}`);
      }
      items.push(...body.data);
      const pages = body.meta?.pagination?.total_pages ?? 1;
      if (page >= pages) {
        break;
      }
    }
    return items;
  }

  async about() {
    const body = await this.get('about');
    if (typeof body?.data?.version !== 'string') {
      throw new NotFireflyError('No version in the answer of /about');
    }
    return { version: body.data.version };
  }

  /**
   * Everything the integration shows, read now.
   * @param {string} today YYYY-MM-DD in the time zone of Gladys
   */
  async snapshot(today) {
    const { version } = await this.about();
    const month = monthOf(today);
    const accounts = await this.list('accounts', { type: 'asset' });
    const budgets = await this.list('budgets', { start: month.start, end: month.end });
    const limits = await this.list('budget-limits', { start: today, end: addDays(today, 1) });
    const bills = await this.list('bills', { start: today, end: addDays(today, 366) });
    const piggyBanks = await this.list('piggy-banks');
    const summary = await this.get('summary/basic', { start: month.start, end: month.end });
    const active = (item) => item?.attributes?.active !== false;
    return {
      version,
      accounts: accounts.filter(active).map(parseAccount),
      budgets: budgets.filter(active).map((budget) => parseBudget(budget, limits)),
      bills: bills.filter(active).map(parseBill),
      piggyBanks: piggyBanks.filter(active).map(parsePiggyBank),
      summaries: Object.values(parseSummary(summary)),
    };
  }
}
