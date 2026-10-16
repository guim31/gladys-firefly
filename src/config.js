// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
//
// Select values are strings in the manifest (stored by Gladys as typed); the
// normalized config holds numbers.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Minutes between two readings. Firefly III computes balances and budgets on
// every request: a household's money does not need more than this.
export const REFRESH_INTERVALS = ['5', '10', '15', '30', '60'];

// Levels of the "budget threshold" trigger, in percent of the budget spent.
// A select of the trigger: the scene filter only compares values, so each
// level reached is its own event.
export const BUDGET_LEVELS = ['50', '75', '90', '100'];

// Days before the due date of the "bill due" trigger. 0 is the day itself.
export const BILL_DAYS = ['0', '1', '2', '3', '7'];

export const DEFAULT_CONFIG = {
  url: '',
  token: '',
  allow_self_signed: false,
  refresh_interval: '15',
  language: 'fr',
};

/**
 * The base URL of Firefly III, from what the user typed: scheme added when
 * missing, `/api/v1` and trailing slashes removed, credentials refused (they
 * would end up in logs). `null` when it cannot be a URL.
 */
export function parseUrl(text) {
  let value = String(text ?? '').trim();
  if (value === '') {
    return null;
  }
  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, '').replace(/\/api(\/v1)?$/i, '');
  return `${url.protocol}//${url.host}${path}`;
}

const pick = (value, allowed, fallback) =>
  allowed.includes(String(value)) ? Number(value) : Number(fallback);

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const typedUrl = String(source.url ?? '').trim();
  return {
    url: parseUrl(typedUrl),
    // A URL typed but not understood, told apart from no URL at all.
    invalidUrl: typedUrl !== '' && parseUrl(typedUrl) === null,
    token: String(source.token ?? '').trim(),
    insecure: source.allow_self_signed === true || source.allow_self_signed === 'true',
    refreshMinutes: pick(
      source.refresh_interval,
      REFRESH_INTERVALS,
      DEFAULT_CONFIG.refresh_interval,
    ),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}
