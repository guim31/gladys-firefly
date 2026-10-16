# Firefly III for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) integration that brings your
[Firefly III](https://www.firefly-iii.org) (the self-hosted personal finance manager) into Gladys:
account balances, budgets of the month, upcoming bills and piggy banks, with scene triggers, scene
actions and a dashboard widget.

It only reads: the integration never writes to Firefly III. Not affiliated with Firefly III.

## Features

- **Devices**: one per active asset account (balance), per budget (spent, budgeted, left, share
  used), per bill (expected amount, days until due, next due date), per piggy bank (saved, target,
  progress), and a summary per currency (net worth, spent and earned this month, left to spend,
  bills still to pay).
- **Dashboard widget** "Firefly III overview": the balances of the accounts and the budgets of the
  month, coloured by how much is used.
- **Scene triggers**: a bill due today, tomorrow, in 2, 3 or 7 days; a budget reaching 50, 75, 90 or
  100 %. A balance under a threshold is the standard "device state change" trigger of Gladys.
- **Scene actions**: read the balances, the budgets, or the bills due in the next 7, 14 or 31 days,
  as a sentence to send or read aloud.
- Texts in English, French, German and Spanish.

## Requirements

- Gladys Assistant 5.1 or later.
- Firefly III 6 or later, reachable from the Gladys host, and a personal access token (Firefly III →
  Options → Profile → OAuth).

## Installation

1. In Gladys, open **Integrations → Install from GitHub** and enter
   `https://github.com/guim31/gladys-firefly` (or install it from the catalog once it is listed).
2. In **Configuration**, enter the address of Firefly III and the personal access token, then save.
   **Test the connection** checks them.
3. Open the **Discover** tab and add the accounts, budgets, bills and piggy banks you want: only the
   devices added are followed.

The user guide is in [`docs/en.md`](docs/en.md) ([français](docs/fr.md), [Deutsch](docs/de.md),
[español](docs/es.md)); Gladys links it from the Configuration screen.

## How it works

Every 15 minutes by default (5 to 60), the container reads the REST API `/api/v1` of Firefly III
with the token: `about`, `accounts?type=asset`, `budgets` and `budget-limits` (spent in the period of
the limit covering today), `bills` (next expected date within a year), `piggy-banks` and
`summary/basic` for the month. It publishes only the values that changed, re-sends them every 12
hours, and fires the scene triggers. Which triggers were fired is kept under `/data` (identifiers,
dates and levels only), so a restart fires nothing twice.

Money is private: the logs never hold an amount, a name, an IBAN, the token or the address of the
server, even at debug level, and no IBAN or account number reaches Gladys.

## Limitations

- Read only; one Firefly III and one user (the one of the token).
- Overdue bills are not reported, amounts are not converted between currencies.
- Developed and tested against a real Firefly III 6.7.9 in Docker (accounts, budgets, bills, piggy
  banks and transactions created through its API), not yet on a Gladys installation with real
  accounts: feedback welcome.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests run against the fake Gladys of the SDK and a fake Firefly III serving answers recorded on
Firefly III 6.7.9 (`test/fixtures/firefly`, anonymized). See [`CLAUDE.md`](CLAUDE.md) for the rules
of the project.

## Credits

- [Firefly III](https://github.com/firefly-iii/firefly-iii) by James Cole and contributors (AGPL-3.0):
  this integration only uses its documented REST API; no code is copied from it.
- The Firefly III community integrations for Home Assistant showed what users expect (balances,
  budgets, bills); no code is copied from them.
- Built on the [Gladys integration SDK](https://github.com/GladysAssistant/integration-sdk-js) and
  the official JavaScript template.

## License

[Apache 2.0](LICENSE).
