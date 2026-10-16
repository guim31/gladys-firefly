// -----------------------------------------------------------------------------
// The scene actions `read_balances`, `read_budgets` and `read_bills`, and the
// configuration action `check_now`. They read Firefly III again when the last
// cycle is older than one interval, and answer with a sentence a scene can
// send by message or read aloud. Only the devices added in Gladys are told.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { DEVICE_TYPES } from './devices.js';
import { daysBetween, localDay } from './firefly.js';
import { PHRASES, STATUS, formatAmount, formatPercent, render, when } from './texts.js';

const logger = createLogger({ name: 'firefly-actions' });

export const SCENE_ACTIONS = {
  BALANCES: 'read_balances',
  BUDGETS: 'read_budgets',
  BILLS: 'read_bills',
};
export const CONFIG_ACTION = 'check_now';
export const BILL_WINDOWS = ['7', '14', '31'];

/** The snapshot, or the reason there is none, thrown in the language of the configuration. */
async function snapshotOf(monitor) {
  const snapshot = await monitor.fresh();
  if (!snapshot || monitor.problem) {
    const problem = monitor.problem ?? 'unreachable';
    // The last values are better than nothing for a reading, but not a refused token.
    if (!snapshot || problem !== 'unreachable') {
      throw new Error(STATUS[monitor.config.language][problem]);
    }
  }
  return snapshot;
}

const sentence = (parts, none) => (parts.length === 0 ? none : `${parts.join('. ')}.`);

/** Scene action: the balance of every account added. Outputs `text`, `count`. */
export async function readBalances(monitor) {
  await snapshotOf(monitor);
  const language = monitor.config.language;
  const phrases = PHRASES[language];
  const accounts = monitor.created(DEVICE_TYPES.ACCOUNT);
  const parts = accounts.map((account) =>
    phrases.balance({
      name: account.name,
      amount: formatAmount(account.balance, account.currency, language),
    }),
  );
  return { text: sentence(parts, phrases.noAccount), count: accounts.length };
}

/** Scene action: every budget added. Outputs `text`, `count`, `over_count`. */
export async function readBudgets(monitor) {
  await snapshotOf(monitor);
  const language = monitor.config.language;
  const phrases = PHRASES[language];
  const budgets = monitor.created(DEVICE_TYPES.BUDGET);
  const parts = budgets.map((budget) => {
    const params = {
      name: budget.name,
      spent: formatAmount(budget.spent, budget.currency, language),
      limit: formatAmount(budget.limit, budget.currency, language),
      percent: formatPercent(budget.percent, language),
    };
    return budget.limit === null ? phrases.budgetNoLimit(params) : phrases.budget(params);
  });
  return {
    text: sentence(parts, phrases.noBudget),
    count: budgets.length,
    over_count: budgets.filter((budget) => budget.percent !== null && budget.percent >= 100).length,
  };
}

/** Scene action: the bills added, due within `days`. Outputs `text`, `count`. */
export async function readBills(monitor, fields = {}) {
  await snapshotOf(monitor);
  const language = monitor.config.language;
  const phrases = PHRASES[language];
  const window = BILL_WINDOWS.includes(String(fields.days)) ? Number(fields.days) : 7;
  const today = localDay(monitor.now());
  const bills = monitor
    .created(DEVICE_TYPES.BILL)
    .filter((bill) => bill.nextDue !== null)
    .map((bill) => ({ ...bill, days: daysBetween(today, bill.nextDue) }))
    .filter((bill) => bill.days >= 0 && bill.days <= window)
    .sort((a, b) => a.days - b.days);
  const parts = bills.map((bill) =>
    phrases.bill({
      name: bill.name,
      amount: formatAmount(bill.amount, bill.currency, language),
      when: when(bill.days, language),
    }),
  );
  return { text: sentence(parts, phrases.noBill({ days: window })), count: bills.length };
}

/** Configuration action: a reading now, and what Firefly III holds, in every language. */
export async function checkNow(monitor) {
  const snapshot = await monitor.fresh(true);
  if (monitor.problem || !snapshot) {
    logger.info(`Connection test: failed (${monitor.problem ?? 'unreachable'})`);
    return render(STATUS, monitor.problem ?? 'unreachable');
  }
  logger.info('Connection test: Firefly III answers');
  return render(STATUS, 'summary', {
    version: snapshot.version,
    accounts: snapshot.accounts.length,
    budgets: snapshot.budgets.length,
    bills: snapshot.bills.length,
    piggies: snapshot.piggyBanks.length,
  });
}
