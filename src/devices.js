// -----------------------------------------------------------------------------
// The Gladys devices built from what Firefly III answers (src/firefly.js):
//
//   account     one per active asset account: balance;
//   budget      one per active budget: spent, budgeted, left and percent used
//               in the period of its current limit (the month, usually);
//   bill        one per active bill: expected amount, days until the next due
//               date, and that date in words;
//   piggy_bank  one per piggy bank: saved, target and progress;
//   summary     one per currency of the summary: net worth, spent and earned
//               this month, left to spend, bills still to pay.
//
// The platform id is the id Firefly III gives the object (the currency code
// for the summary): renaming an account in Firefly III keeps its device. Names
// of accounts and budgets are the device names; no IBAN, no account number is
// ever published. Every feature is read-only, with should_poll: false: the
// readings run in the container (src/monitor.js).
//
// Couples checked against the Gladys front in test/gladys-rules.test.js.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';
import { NAMES } from './texts.js';

export const DEVICE_TYPES = {
  ACCOUNT: 'account',
  BUDGET: 'budget',
  BILL: 'bill',
  PIGGY_BANK: 'piggy_bank',
  SUMMARY: 'summary',
};

export const FEATURE_KEYS = {
  account: ['balance'],
  budget: ['spent', 'limit', 'left', 'percent'],
  bill: ['amount', 'days_left', 'next_due'],
  piggy_bank: ['saved', 'target', 'progress'],
  summary: ['net_worth', 'spent_month', 'earned_month', 'left_to_spend', 'bills_unpaid'],
};

// Display bounds only (the core never applies them), symmetric for the
// amounts that can be negative (a credit card, an overspent budget).
const MAX_AMOUNT = 1e12;
const MAX_DAYS = 3660;

const CURRENCY_UNITS = { EUR: UNITS.EURO, USD: UNITS.DOLLAR, GBP: UNITS.POUND_STERLING };

/** The unit of an amount in this currency, or undefined. */
export const unitOf = (currency) => CURRENCY_UNITS[currency];

/** The platform id of an object: its Firefly III id, kept to safe characters. */
export const platformIdOf = (id) => String(id).replace(/[^A-Za-z0-9-]/g, '_');

/** External ids of the device of an object and of its features. */
export function deviceIds(gladys, type, id) {
  const ids = gladys.externalIds(type, platformIdOf(id));
  return {
    device: ids.device,
    ...Object.fromEntries(FEATURE_KEYS[type].map((key) => [key, ids.feature(key)])),
  };
}

const feature = (name, externalId, category, type, extra) => ({
  name,
  external_id: externalId,
  category,
  type,
  read_only: true,
  has_feedback: false,
  ...extra,
});

/** The name of a device: the name in Firefly III, with the currency when no unit says it. */
const nameOf = (name, currency) => (currency && !unitOf(currency) ? `${name} (${currency})` : name);

const MODELS = {
  account: 'Firefly III account',
  budget: 'Firefly III budget',
  bill: 'Firefly III bill',
  piggy_bank: 'Firefly III piggy bank',
  summary: 'Firefly III',
};

/**
 * The discovery payload of an object.
 * @param {object} gladys
 * @param {string} type one of DEVICE_TYPES
 * @param {object} item the normalized object (src/firefly.js)
 * @param {string} language of the feature names
 */
export function buildDevice(gladys, type, item, language = 'fr') {
  const ids = deviceIds(gladys, type, type === DEVICE_TYPES.SUMMARY ? item.currency : item.id);
  const names = NAMES[language] ?? NAMES.fr;
  const unit = unitOf(item.currency);
  const money = (key, min = -MAX_AMOUNT) =>
    feature(names[key], ids[key], CATEGORIES.CURRENCY, TYPES.CURRENCY.DECIMAL, {
      keep_history: true,
      min,
      max: MAX_AMOUNT,
      ...(unit ? { unit } : {}),
    });
  const percent = (key, max) =>
    feature(names[key], ids[key], CATEGORIES.CURRENCY, TYPES.CURRENCY.DECIMAL, {
      unit: UNITS.PERCENT,
      keep_history: true,
      min: 0,
      max,
    });
  const features = {
    account: () => [money('balance')],
    budget: () => [money('spent', 0), money('limit', 0), money('left'), percent('percent', 1000)],
    bill: () => [
      money('amount', 0),
      feature(names.days_left, ids.days_left, CATEGORIES.DURATION, TYPES.DURATION.INTEGER, {
        unit: UNITS.DAYS,
        keep_history: false,
        min: 0,
        max: MAX_DAYS,
      }),
      feature(names.next_due, ids.next_due, CATEGORIES.TEXT, TYPES.TEXT.TEXT, {
        keep_history: false,
        min: 0,
        max: 0,
      }),
    ],
    piggy_bank: () => [money('saved', 0), money('target', 0), percent('progress', 100)],
    summary: () => [
      money('net_worth'),
      money('spent_month', 0),
      money('earned_month', 0),
      money('left_to_spend'),
      money('bills_unpaid', 0),
    ],
  }[type]();
  return {
    name:
      type === DEVICE_TYPES.SUMMARY
        ? `Firefly III (${item.currency})`
        : nameOf(item.name, item.currency),
    external_id: ids.device,
    model: MODELS[type],
    should_poll: false,
    params: [],
    features,
  };
}
