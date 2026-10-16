// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `overview`.
//
// The accounts added in Gladys as a `status` list (name and balance, red when
// negative), then the budgets added as a `card-list` (8 rows at most, the
// core's cap): the budget as title, spent of budgeted as subtitle, the share
// used as a badge, green under 75 %, orange under 100 %, red beyond. The
// footer gives the time of the reading.
// Budget: 1 status, 1 card-list, 2 texts at most.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { DEVICE_TYPES } from './devices.js';
import { WIDGET_KEY } from './monitor.js';
import { formatAmount, formatDate, formatDay, formatPercent } from './texts.js';

export const MAX_ACCOUNTS = 10;
export const MAX_BUDGETS = 8;
export const TTL_SECONDS = 300;

export const TEXT = {
  waiting: {
    en: 'Waiting for Firefly III…',
    fr: 'En attente de Firefly III…',
    de: 'Warte auf Firefly III…',
    es: 'Esperando a Firefly III…',
  },
  empty: {
    en: 'Add accounts to Gladys',
    fr: 'Ajoutez des comptes à Gladys',
    de: 'Füge Konten zu Gladys hinzu',
    es: 'Añada cuentas a Gladys',
  },
  unreachable: {
    en: 'Firefly III does not answer',
    fr: 'Firefly III ne répond pas',
    de: 'Firefly III antwortet nicht',
    es: 'Firefly III no responde',
  },
  of: { en: 'of', fr: 'sur', de: 'von', es: 'de' },
  spent: { en: 'spent', fr: 'dépensé', de: 'ausgegeben', es: 'gastado' },
  left: { en: 'Left', fr: 'Restant', de: 'Verbleibend', es: 'Restante' },
  period: { en: 'Period', fr: 'Période', de: 'Zeitraum', es: 'Periodo' },
  readAt: { en: 'Read', fr: 'Lu le', de: 'Gelesen', es: 'Leído' },
};

const t = (text, language) => text[language] ?? text.en;
const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

/** The colour of a budget: green under 75 %, orange under 100 %, red beyond. */
export function budgetColor(percent) {
  if (percent === null) {
    return WIDGET_COLORS.NEUTRAL;
  }
  if (percent >= 100) {
    return WIDGET_COLORS.DANGER;
  }
  return percent >= 75 ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS;
}

/** One row of the budgets, and its detail panel. */
export function budgetItem(budget, language) {
  const spent = formatAmount(budget.spent, budget.currency, language);
  const subtitle =
    budget.limit === null
      ? `${spent} ${t(TEXT.spent, language)}`
      : `${spent} ${t(TEXT.of, language)} ${formatAmount(budget.limit, budget.currency, language)}`;
  const colon = language === 'fr' ? ' : ' : ': ';
  const item = { title: clip(budget.name, 60), subtitle: clip(subtitle, 60) };
  if (budget.limit !== null) {
    item.badge = {
      text: formatPercent(budget.percent, language),
      color: budgetColor(budget.percent),
    };
    const [start, end] = (budget.period ?? '').split('/');
    item.description = [
      `${t(TEXT.left, language)}${colon}${formatAmount(budget.left, budget.currency, language)}`,
      /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)
        ? `${t(TEXT.period, language)}${colon}${formatDay(start, language)} → ${formatDay(end, language)}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');
  }
  return item;
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    async get(monitor, { language = 'en' } = {}) {
      const lang = TEXT.of[language] ? language : 'en';
      const components = [];
      if (!monitor.snapshot) {
        const text = monitor.problem ? t(TEXT.unreachable, lang) : t(TEXT.waiting, lang);
        return { ttl_seconds: 60, components: [{ type: 'text', variant: 'heading', text }] };
      }
      const accounts = monitor.created(DEVICE_TYPES.ACCOUNT);
      const budgets = monitor.created(DEVICE_TYPES.BUDGET);
      if (accounts.length === 0 && budgets.length === 0) {
        components.push({ type: 'text', variant: 'heading', text: t(TEXT.empty, lang) });
      }
      if (accounts.length > 0) {
        components.push({
          type: 'status',
          items: accounts.slice(0, MAX_ACCOUNTS).map((account) => ({
            label: clip(account.name, 40),
            value: clip(formatAmount(account.balance, account.currency, lang), 40),
            icon: 'credit-card',
            color: account.balance < 0 ? WIDGET_COLORS.DANGER : WIDGET_COLORS.NEUTRAL,
          })),
        });
      }
      if (budgets.length > 0) {
        components.push({
          type: 'card-list',
          display: 'list',
          items: budgets.slice(0, MAX_BUDGETS).map((budget) => budgetItem(budget, lang)),
        });
      }
      const unreachable = monitor.problem ? ` · ${t(TEXT.unreachable, lang)}` : '';
      components.push({
        type: 'text',
        variant: 'caption',
        text: clip(
          `Firefly III · ${t(TEXT.readAt, lang)} ${formatDate(monitor.lastSuccessAt, lang)}${unreachable}`,
          80,
        ),
      });
      return { ttl_seconds: TTL_SECONDS, components };
    },
  },
};
