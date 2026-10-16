# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Firefly III in Gladys, read only, with a personal access token: one device per active asset
  account (balance), budget (spent, budgeted, left, share used), bill (expected amount, days until
  due, next due date) and piggy bank (saved, target, progress), and a summary per currency (net
  worth, spent and earned this month, left to spend, bills still to pay).
- Dashboard widget "Firefly III overview": balances of the accounts and budgets of the month.
- Scene triggers "bill due soon" (today, tomorrow, 2, 3 or 7 days) and "budget level reached" (50,
  75, 90 or 100 %), fired once, even across restarts.
- Scene actions reading the balances, the budgets and the next bills as a sentence.
- "Test the connection" action, refresh interval from 5 to 60 minutes, self-signed certificates
  accepted on demand.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-firefly/commits/main
