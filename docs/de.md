# Firefly III

Deine persönlichen Finanzen in Gladys: die Kontostände deiner Konten, der Stand deiner Monatsbudgets, die
anstehenden Rechnungen und deine Sparschweine, gelesen aus deinem eigenen
[Firefly III](https://www.firefly-iii.org), dem selbst gehosteten Finanzmanager.

Die Integration liest nur, schreibt nie in Firefly III und legt keine Buchung an. Die Verbindung zu deinem Firefly III läuft
direkt in deinem Netzwerk, mit einem persönlichen Zugriffstoken. Nicht mit Firefly III verbunden.

## Was du bekommst

- Ein **Gerät pro Bestandskonto** (Girokonto, Sparkonto, Kreditkarte…): sein Kontostand in der Währung des
  Kontos, mit Verlauf.
- Ein **Gerät pro Budget**: ausgegeben, budgetiert, verbleibend und verbrauchter Anteil im Zeitraum des
  Budgets (meist der Monat).
- Ein **Gerät pro Rechnung** (Abonnement): erwarteter Betrag, Tage bis zur nächsten Fälligkeit und dieses
  Datum.
- Ein **Gerät pro Sparschwein**: gespart, Ziel und Fortschritt.
- Ein **Übersichtsgerät pro Währung**: Vermögen, diesen Monat ausgegeben und verdient, noch verfügbar, noch
  offene Rechnungen.
- Ein **Dashboard-Widget**: die Kontostände deiner Konten und die Budgets des Monats.
- Zwei **Szenenauslöser**: eine Rechnung in wenigen Tagen fällig, ein Budget erreicht 50, 75, 90 oder 100 %.
- Drei **Szenenaktionen**: Kontostände, Budgets oder nächste Rechnungen lesen, als Satz zum Senden per
  Nachricht oder zum Vorlesen.

## Voraussetzungen

- Gladys Assistant 5.1 oder neuer.
- Firefly III 6 oder neuer (getestet mit 6.7.9), vom Gladys-Rechner aus erreichbar (gleiches Netzwerk, VPN
  oder öffentliche Adresse).
- Ein persönliches Zugriffstoken von Firefly III.

## Konfiguration

### Ein persönliches Zugriffstoken erstellen

1. Öffne in Firefly III **Optionen → Profil**, Tab **OAuth**.
2. Klicke unter **Persönliche Zugriffstoken** auf **Neues Token erstellen**, gib ihm einen Namen (`Gladys`)
   und bestätige.
3. Kopiere das angezeigte Token: Firefly III zeigt es nur einmal. Es ist lang, kopiere es vollständig.

Das Token gibt Zugriff auf das ganze Konto seines Benutzers: Halte es so geheim wie dein Passwort. Widerrufe es
auf derselben Seite, um den Zugriff zu sperren.

### Einstellungen

| Einstellung                             | Was sie bewirkt                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Adresse von Firefly III                 | Die Adresse, unter der du Firefly III öffnest, z. B. `http://192.168.1.20:8080` oder `https://geld.zuhause` |
| Persönliches Zugriffstoken              | Das oben erstellte Token                                                                                    |
| Selbstsigniertes Zertifikat akzeptieren | Nur für eine `https`-Adresse, deren Zertifikat du selbst erstellt hast                                      |
| Aktualisierungsintervall                | 5, 10, 15 (Standard), 30 oder 60 Minuten                                                                    |
| Sprache der Texte                       | Namen der Funktionen (bei ihrer Erstellung) und Sätze der Szenen                                            |

Speichere und klicke dann auf **Verbindung testen**: Die Antwort nennt die Version von Firefly III und wie
viele Konten, Budgets, Rechnungen und Sparschweine es enthält. Öffne danach den Tab **Entdecken** und füge die
gewünschten Geräte zu Gladys hinzu. **Nur die hinzugefügten Geräte werden verfolgt**; Zustände, Widget, Auslöser und
Aktionen betreffen nur diese.

## Geräte

| Gerät       | Funktionen                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Konto       | Kontostand (negativ für eine Kreditkarte im Soll)                                                |
| Budget      | Ausgegeben, Budgetiert, Verbleibend (negativ bei Überschreitung), Budget verbraucht (%)          |
| Rechnung    | Erwarteter Betrag (Mittel aus Minimum und Maximum), Tage bis Fälligkeit, Nächste Fälligkeit      |
| Sparschwein | Gespart, Ziel, Fortschritt (%)                                                                   |
| Übersicht   | Vermögen, Diesen Monat ausgegeben, Diesen Monat verdient, Noch verfügbar, Noch offene Rechnungen |

Beträge in Euro, Dollar oder Pfund zeigen ihre Einheit; eine andere Währung wird an den Gerätenamen angehängt
(`Sparkonto (CHF)`). Nur aktive Konten, Budgets und Rechnungen werden angeboten. Ein Budget ohne Betrag für den
laufenden Zeitraum liefert nur, was diesen Monat ausgegeben wurde. Der Zeitraum eines Budgets ist der seines
Betrags in Firefly III (eine Woche, ein Monat…).

Um gewarnt zu werden, wenn ein Kontostand unter eine Schwelle fällt, nutze den Standardauslöser von Gladys
**„Änderung von Gerätestatus“** auf dem **Kontostand** des Kontos, mit der Bedingung „kleiner“: Dafür braucht
es keinen Auslöser der Integration.

## Dashboard-Widget

**Firefly-III-Übersicht** zeigt die zu Gladys hinzugefügten Konten mit ihrem Kontostand (rot, wenn negativ),
dann die hinzugefügten Budgets (höchstens 8) mit dem, was von ihrem Betrag ausgegeben wurde, und dem
verbrauchten Anteil: grün unter 75 %, orange unter 100 %, rot darüber. Tippe auf ein Budget, um den Rest und
seinen Zeitraum zu sehen. Die Fußzeile nennt die Uhrzeit der letzten Abfrage.

## Szenenauslöser

- **Firefly III: Rechnung bald fällig**: Eine zu Gladys hinzugefügte Rechnung wird heute, morgen, in 2, 3
  oder 7 Tagen erwartet (zur Wahl). Löst einmal pro Rechnung und Fälligkeit aus, an diesem Tag. Variablen:
  Name der Rechnung, erwarteter Betrag, Währung, Fälligkeit (JJJJ-MM-TT) und ein fertiger Satz.
- **Firefly III: Budgetschwelle erreicht**: Die Ausgaben eines zu Gladys hinzugefügten Budgets erreichen 50,
  75, 90 oder 100 % seines Betrags (100 %: aufgebraucht oder überschritten). Löst einmal pro Schwelle und
  Zeitraum aus. Die beim ersten Lesen des Budgets schon erreichte Schwelle ist der Ausgangspunkt und löst
  nichts aus. Variablen: Name, ausgegeben, budgetiert, verbrauchter Anteil (%), Währung und ein Satz.

Was ausgelöst wurde, wird in den Daten der Integration gespeichert: Ein Neustart löst nichts doppelt aus.

## Szenenaktionen

- **Firefly III: Kontostände lesen**: der Stand jedes hinzugefügten Kontos, in einem Satz. Ausgaben: `text`,
  `count`.
- **Firefly III: Budgets lesen**: was jedes hinzugefügte Budget von seinem Betrag ausgegeben hat. Ausgaben:
  `text`, `count`, `over_count` (aufgebrauchte oder überschrittene Budgets).
- **Firefly III: nächste Rechnungen lesen**: die hinzugefügten Rechnungen, die innerhalb von 7, 14 oder 31
  Tagen erwartet werden, die nächste zuerst. Ausgaben: `text`, `count`.

Eine Aktion liest Firefly III neu, wenn die letzte Abfrage älter als das Aktualisierungsintervall ist.

## Szenenbeispiele

- **Erinnerung vor einer Rechnung**: Auslöser „Rechnung bald fällig“, 3 Tage, auf die Miete; Aktion: eine
  Nachricht mit `{{triggerEvent.data.text}}` senden.
- **Lebensmittelbudget fast aufgebraucht**: Auslöser „Budgetschwelle erreicht“, 90 %, auf das
  Lebensmittelbudget; Aktion: die Familie über Telegram benachrichtigen.
- **Montagmorgen-Überblick**: jeden Montag um 8 Uhr die Aktion „Budgets lesen“, dann `{{output.text}}` vom
  Lautsprecher in der Küche vorlesen lassen.

## Datenschutz und Daten

- Die Integration liest Firefly III und schreibt nie in Firefly III.
- Das Token wird von Gladys wie jede geheime Einstellung gespeichert und nie in die Protokolle geschrieben.
- Die Protokolle enthalten nie einen Betrag, einen Namen von Konto, Budget oder Rechnung, eine IBAN oder die
  Adresse von Firefly III, auch nicht auf Debug-Stufe: nur Anzahlen, Kennungen und Schwellen.
- Keine IBAN und keine Kontonummer gelangt in Gladys. Die Namen der Konten und Budgets werden zu Gerätenamen,
  die du umbenennen kannst.
- Das Datenvolume der Integration speichert nur die ausgelösten Auslöser (Kennungen, Daten und Schwellen).

## Fehlerbehebung

| Meldung                                                   | Was tun                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Firefly III lehnt das Token ab                            | Das Token wurde widerrufen oder unvollständig kopiert: erstelle ein neues                          |
| Firefly III antwortet nicht                               | Prüfe die Adresse vom Gladys-Rechner aus (Port, `http`/`https`) und ob Firefly III läuft           |
| Das Zertifikat von Firefly III ist nicht vertrauenswürdig | Nutze die `http`-Adresse im lokalen Netz oder aktiviere „Selbstsigniertes Zertifikat akzeptieren“  |
| Diese Adresse antwortet nicht wie die API                 | Die Adresse führt zu einer anderen Seite (Anmeldeportal, Proxy): gib die von Firefly III selbst an |
| Ein Gerät hat keinen Wert                                 | Füge es im Tab „Entdecken“ hinzu: nur hinzugefügte Geräte werden verfolgt                          |

Die Protokolle der Integration (Integrationen → Firefly III → Protokolle) zeigen, was passiert ist; setze
`LOG_LEVEL=debug` für mehr Details.

## Grenzen

- Nur Lesen: Aus Gladys kann keine Buchung angelegt werden.
- Ein Firefly III, ein Benutzer (der des Tokens).
- Überfällige Rechnungen werden nicht gemeldet: nur die nächste erwartete Fälligkeit zählt.
- Beträge anderer Währungen werden nicht umgerechnet; die Übersicht hat ein Gerät pro Währung.
- Die Werte folgen dem Aktualisierungsintervall: Eine Buchung erscheint bei der nächsten Abfrage in Gladys.
- Getestet mit einem echten Firefly III 6.7.9 in Docker, noch nicht auf einer Gladys-Installation mit echten
  Konten: Rückmeldungen sind willkommen.
