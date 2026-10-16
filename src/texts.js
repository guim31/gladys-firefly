// -----------------------------------------------------------------------------
// Texts produced by the container, in the four languages of Gladys (the
// language of the configuration for the feature names and the scene texts, the
// language of the dashboard for the widget), and the number and date formats.
// -----------------------------------------------------------------------------

export const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };
export const LANGS = Object.keys(LOCALES);

// Feature names, frozen at creation in Gladys. Keyed by device type, then by
// feature key (src/devices.js).
export const NAMES = {
  en: {
    balance: 'Balance',
    spent: 'Spent',
    limit: 'Budgeted',
    left: 'Left',
    percent: 'Budget used',
    amount: 'Expected amount',
    days_left: 'Days until due',
    next_due: 'Next due date',
    saved: 'Saved',
    target: 'Target',
    progress: 'Progress',
    net_worth: 'Net worth',
    spent_month: 'Spent this month',
    earned_month: 'Earned this month',
    left_to_spend: 'Left to spend',
    bills_unpaid: 'Bills still to pay',
  },
  fr: {
    balance: 'Solde',
    spent: 'Dépensé',
    limit: 'Budgété',
    left: 'Restant',
    percent: 'Budget consommé',
    amount: 'Montant prévu',
    days_left: "Jours avant l'échéance",
    next_due: 'Prochaine échéance',
    saved: 'Épargné',
    target: 'Objectif',
    progress: 'Progression',
    net_worth: 'Valeur nette',
    spent_month: 'Dépensé ce mois-ci',
    earned_month: 'Gagné ce mois-ci',
    left_to_spend: 'Reste à dépenser',
    bills_unpaid: 'Factures restant à payer',
  },
  de: {
    balance: 'Kontostand',
    spent: 'Ausgegeben',
    limit: 'Budgetiert',
    left: 'Verbleibend',
    percent: 'Budget verbraucht',
    amount: 'Erwarteter Betrag',
    days_left: 'Tage bis Fälligkeit',
    next_due: 'Nächste Fälligkeit',
    saved: 'Gespart',
    target: 'Ziel',
    progress: 'Fortschritt',
    net_worth: 'Vermögen',
    spent_month: 'Diesen Monat ausgegeben',
    earned_month: 'Diesen Monat verdient',
    left_to_spend: 'Noch verfügbar',
    bills_unpaid: 'Noch offene Rechnungen',
  },
  es: {
    balance: 'Saldo',
    spent: 'Gastado',
    limit: 'Presupuestado',
    left: 'Restante',
    percent: 'Presupuesto consumido',
    amount: 'Importe previsto',
    days_left: 'Días hasta el vencimiento',
    next_due: 'Próximo vencimiento',
    saved: 'Ahorrado',
    target: 'Objetivo',
    progress: 'Progreso',
    net_worth: 'Patrimonio neto',
    spent_month: 'Gastado este mes',
    earned_month: 'Ganado este mes',
    left_to_spend: 'Disponible para gastar',
    bills_unpaid: 'Facturas pendientes',
  },
};

// Sentences of the scene actions and of the scene triggers. Functions take `p`.
export const PHRASES = {
  en: {
    balance: (p) => `${p.name}: ${p.amount}`,
    noAccount: 'No account added to Gladys.',
    budget: (p) => `${p.name}: ${p.spent} spent of ${p.limit} (${p.percent})`,
    budgetNoLimit: (p) => `${p.name}: ${p.spent} spent`,
    noBudget: 'No budget added to Gladys.',
    bill: (p) => `${p.name}: ${p.amount} ${p.when}`,
    noBill: (p) => `No bill due in the next ${p.days} days.`,
    today: 'today',
    tomorrow: 'tomorrow',
    inDays: (p) => `in ${p.days} days`,
    billDue: (p) => `${p.name}: ${p.amount} due ${p.when}.`,
    budgetLevel: (p) => `Budget ${p.name}: ${p.percent} used, ${p.spent} of ${p.limit}.`,
  },
  fr: {
    balance: (p) => `${p.name} : ${p.amount}`,
    noAccount: 'Aucun compte ajouté à Gladys.',
    budget: (p) => `${p.name} : ${p.spent} dépensés sur ${p.limit} (${p.percent})`,
    budgetNoLimit: (p) => `${p.name} : ${p.spent} dépensés`,
    noBudget: 'Aucun budget ajouté à Gladys.',
    bill: (p) => `${p.name} : ${p.amount} ${p.when}`,
    noBill: (p) => `Aucune facture dans les ${p.days} prochains jours.`,
    today: "aujourd'hui",
    tomorrow: 'demain',
    inDays: (p) => `dans ${p.days} jours`,
    billDue: (p) => `${p.name} : ${p.amount} à payer ${p.when}.`,
    budgetLevel: (p) => `Budget ${p.name} : ${p.percent} consommés, ${p.spent} sur ${p.limit}.`,
  },
  de: {
    balance: (p) => `${p.name}: ${p.amount}`,
    noAccount: 'Kein Konto zu Gladys hinzugefügt.',
    budget: (p) => `${p.name}: ${p.spent} von ${p.limit} ausgegeben (${p.percent})`,
    budgetNoLimit: (p) => `${p.name}: ${p.spent} ausgegeben`,
    noBudget: 'Kein Budget zu Gladys hinzugefügt.',
    bill: (p) => `${p.name}: ${p.amount} ${p.when}`,
    noBill: (p) => `Keine Rechnung in den nächsten ${p.days} Tagen fällig.`,
    today: 'heute',
    tomorrow: 'morgen',
    inDays: (p) => `in ${p.days} Tagen`,
    billDue: (p) => `${p.name}: ${p.amount} fällig ${p.when}.`,
    budgetLevel: (p) => `Budget ${p.name}: ${p.percent} verbraucht, ${p.spent} von ${p.limit}.`,
  },
  es: {
    balance: (p) => `${p.name}: ${p.amount}`,
    noAccount: 'Ninguna cuenta añadida a Gladys.',
    budget: (p) => `${p.name}: ${p.spent} gastados de ${p.limit} (${p.percent})`,
    budgetNoLimit: (p) => `${p.name}: ${p.spent} gastados`,
    noBudget: 'Ningún presupuesto añadido a Gladys.',
    bill: (p) => `${p.name}: ${p.amount} ${p.when}`,
    noBill: (p) => `Ninguna factura en los próximos ${p.days} días.`,
    today: 'hoy',
    tomorrow: 'mañana',
    inDays: (p) => `dentro de ${p.days} días`,
    billDue: (p) => `${p.name}: ${p.amount} a pagar ${p.when}.`,
    budgetLevel: (p) => `Presupuesto ${p.name}: ${p.percent} consumido, ${p.spent} de ${p.limit}.`,
  },
};

// Connection status and configuration action messages, keyed by message.
export const STATUS = {
  en: {
    initFailed: 'The integration could not start: see its logs.',
    noUrl: 'Enter the address of Firefly III and a personal access token.',
    invalidUrl: 'The address of Firefly III is not understood (no user or password in it).',
    noToken: 'Enter a personal access token of Firefly III.',
    unauthorized: 'Firefly III refuses the token: create a new personal access token.',
    unreachable: 'Firefly III does not answer: the last values are kept.',
    certificate:
      'The certificate of Firefly III is not trusted: enable "self-signed certificate" if it is yours.',
    notFirefly: 'This address does not answer like the API of Firefly III.',
    summary: (p) =>
      `Connected to Firefly III ${p.version}: ${p.accounts} account(s), ${p.budgets} budget(s), ${p.bills} bill(s), ${p.piggies} piggy bank(s).`,
  },
  fr: {
    initFailed: "L'intégration n'a pas pu démarrer : voir ses journaux.",
    noUrl: "Indiquez l'adresse de Firefly III et un jeton d'accès personnel.",
    invalidUrl: "L'adresse de Firefly III n'est pas comprise (sans utilisateur ni mot de passe).",
    noToken: "Indiquez un jeton d'accès personnel de Firefly III.",
    unauthorized: "Firefly III refuse le jeton : créez un nouveau jeton d'accès personnel.",
    unreachable: 'Firefly III ne répond pas : les dernières valeurs sont gardées.',
    certificate:
      "Le certificat de Firefly III n'est pas reconnu : activez « certificat auto-signé » s'il est le vôtre.",
    notFirefly: "Cette adresse ne répond pas comme l'API de Firefly III.",
    summary: (p) =>
      `Connecté à Firefly III ${p.version} : ${p.accounts} compte(s), ${p.budgets} budget(s), ${p.bills} facture(s), ${p.piggies} tirelire(s).`,
  },
  de: {
    initFailed: 'Die Integration konnte nicht starten: siehe ihre Protokolle.',
    noUrl: 'Gib die Adresse von Firefly III und ein persönliches Zugriffstoken an.',
    invalidUrl: 'Die Adresse von Firefly III wird nicht verstanden (ohne Benutzer und Passwort).',
    noToken: 'Gib ein persönliches Zugriffstoken von Firefly III an.',
    unauthorized: 'Firefly III lehnt das Token ab: erstelle ein neues persönliches Zugriffstoken.',
    unreachable: 'Firefly III antwortet nicht: die letzten Werte bleiben erhalten.',
    certificate:
      'Das Zertifikat von Firefly III ist nicht vertrauenswürdig: aktiviere „selbstsigniertes Zertifikat“, wenn es deins ist.',
    notFirefly: 'Diese Adresse antwortet nicht wie die API von Firefly III.',
    summary: (p) =>
      `Mit Firefly III ${p.version} verbunden: ${p.accounts} Konto/Konten, ${p.budgets} Budget(s), ${p.bills} Rechnung(en), ${p.piggies} Sparschwein(e).`,
  },
  es: {
    initFailed: 'La integración no pudo iniciarse: consulte sus registros.',
    noUrl: 'Indique la dirección de Firefly III y un token de acceso personal.',
    invalidUrl: 'La dirección de Firefly III no se entiende (sin usuario ni contraseña).',
    noToken: 'Indique un token de acceso personal de Firefly III.',
    unauthorized: 'Firefly III rechaza el token: cree un nuevo token de acceso personal.',
    unreachable: 'Firefly III no responde: se conservan los últimos valores.',
    certificate:
      'El certificado de Firefly III no es de confianza: active «certificado autofirmado» si es el suyo.',
    notFirefly: 'Esta dirección no responde como la API de Firefly III.',
    summary: (p) =>
      `Conectado a Firefly III ${p.version}: ${p.accounts} cuenta(s), ${p.budgets} presupuesto(s), ${p.bills} factura(s), ${p.piggies} hucha(s).`,
  },
};

/** A STATUS (or PHRASES) entry as a multi-language object. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    LANGS.map((language) => {
      const entry = table[language][key];
      return [language, typeof entry === 'function' ? entry(params) : entry];
    }),
  );
}

const locale = (language) => LOCALES[language] ?? LOCALES.en;
const ISO_CURRENCY = /^[A-Z]{3}$/;

/** An amount with its currency: "1 234,56 €", "-12.30 CHF". */
export function formatAmount(value, currency, language, decimals = 2) {
  if (value === null || value === undefined) {
    return '–';
  }
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  if (currency && ISO_CURRENCY.test(currency)) {
    try {
      return new Intl.NumberFormat(locale(language), {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        ...digits,
      }).format(value);
    } catch {
      // An unknown code falls back on the plain number.
    }
  }
  const number = new Intl.NumberFormat(locale(language), digits).format(value);
  return currency ? `${number} ${currency}` : number;
}

/** A percentage without sign: "82 %", "82%". */
export function formatPercent(value, language) {
  if (value === null || value === undefined) {
    return '–';
  }
  return new Intl.NumberFormat(locale(language), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

/** A calendar date (YYYY-MM-DD) in words: "05/11/2026", "11/05/2026" in en-GB too. */
export function formatDay(day, language) {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

/** Date and time in the time zone of Gladys (TZ): "15/10 17:38". */
export function formatDate(ms, language) {
  return new Intl.DateTimeFormat(locale(language), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

/** "today", "tomorrow", "in 5 days". */
export function when(days, language) {
  const phrases = PHRASES[language] ?? PHRASES.en;
  if (days === 0) {
    return phrases.today;
  }
  return days === 1 ? phrases.tomorrow : phrases.inDays({ days });
}
