# Firefly III

Vos finances personnelles dans Gladys : le solde de vos comptes, l'état de vos budgets du mois, les factures à
venir et vos tirelires, lus dans votre propre [Firefly III](https://www.firefly-iii.org), le gestionnaire de
finances personnelles auto-hébergé.

L'intégration ne fait que lire : elle n'écrit jamais dans Firefly III, ne crée aucune opération. Elle parle
directement à votre Firefly III sur votre réseau, avec un jeton d'accès personnel. Non affiliée à Firefly III.

## Ce que vous obtenez

- Un **appareil par compte d'actif** (compte courant, épargne, carte de crédit…) : son solde, dans la devise
  du compte, avec son historique.
- Un **appareil par budget** : dépensé, budgété, restant et part consommée sur la période du budget (le mois,
  le plus souvent).
- Un **appareil par facture** (abonnement) : montant prévu, jours avant la prochaine échéance, et cette date.
- Un **appareil par tirelire** : épargné, objectif et progression.
- Un **appareil de synthèse par devise** : valeur nette, dépensé et gagné ce mois-ci, reste à dépenser,
  factures restant à payer.
- Un **widget de tableau de bord** : le solde de vos comptes et les budgets du mois.
- Deux **déclencheurs de scène** : une facture à échéance dans quelques jours, un budget qui atteint 50, 75, 90
  ou 100 %.
- Trois **actions de scène** : lire les soldes, les budgets ou les prochaines factures, en une phrase à
  envoyer par message ou à faire lire à voix haute.

## Prérequis

- Gladys Assistant 5.1 ou plus récent.
- Firefly III 6 ou plus récent (testé avec la 6.7.9), joignable depuis la machine de Gladys (même réseau, VPN
  ou adresse publique).
- Un jeton d'accès personnel de Firefly III.

## Configuration

### Créer un jeton d'accès personnel

1. Dans Firefly III, ouvrez **Options → Profil**, onglet **OAuth**.
2. Sous **Jetons d'accès personnels**, cliquez sur **Créer un nouveau jeton**, donnez-lui un nom (`Gladys`) et
   validez.
3. Copiez le jeton affiché : Firefly III ne le montre qu'une fois. Il est long, copiez-le en entier.

Le jeton donne accès à tout le compte de son utilisateur : gardez-le aussi secret que votre mot de passe.
Révoquez-le depuis la même page pour couper l'accès.

### Réglages

| Réglage                           | Ce qu'il fait                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Adresse de Firefly III            | L'adresse à laquelle vous ouvrez Firefly III, par ex. `http://192.168.1.20:8080` ou `https://budget.ma.maison` |
| Jeton d'accès personnel           | Le jeton créé ci-dessus                                                                                        |
| Accepter un certificat auto-signé | Seulement pour une adresse `https` dont vous avez fait le certificat vous-même                                 |
| Fréquence de mise à jour          | 5, 10, 15 (par défaut), 30 ou 60 minutes                                                                       |
| Langue des textes                 | Noms des fonctionnalités (à leur création) et phrases des scènes                                               |

Enregistrez, puis cliquez sur **Tester la connexion** : la réponse donne la version de Firefly III et le
nombre de comptes, budgets, factures et tirelires qu'il contient. Ouvrez ensuite l'onglet **Découverte** et
ajoutez les appareils voulus dans Gladys. **Seuls les appareils ajoutés sont suivis** : leurs états, le widget,
les déclencheurs et les actions ne portent que sur eux.

## Appareils

| Appareil | Fonctionnalités                                                                                |
| -------- | ---------------------------------------------------------------------------------------------- |
| Compte   | Solde (négatif pour une carte de crédit débitrice)                                             |
| Budget   | Dépensé, Budgété, Restant (négatif en cas de dépassement), Budget consommé (%)                 |
| Facture  | Montant prévu (moyenne du minimum et du maximum), Jours avant l'échéance, Prochaine échéance   |
| Tirelire | Épargné, Objectif, Progression (%)                                                             |
| Synthèse | Valeur nette, Dépensé ce mois-ci, Gagné ce mois-ci, Reste à dépenser, Factures restant à payer |

Les montants en euros, dollars ou livres affichent leur unité ; une autre devise s'ajoute au nom de l'appareil
(`Épargne (CHF)`). Seuls les comptes, budgets et factures actifs sont proposés. Un budget sans montant pour la
période en cours ne donne que ce qui a été dépensé ce mois-ci. La période d'un budget est celle de son montant
dans Firefly III (une semaine, un mois…).

Pour être prévenu quand un solde passe sous un seuil, utilisez le déclencheur standard de Gladys
**« Changement d'état de l'appareil »** sur le **Solde** du compte, avec la condition « inférieur » : pas besoin
d'un déclencheur de l'intégration.

## Widget de tableau de bord

**Aperçu Firefly III** montre les comptes ajoutés dans Gladys avec leur solde (en rouge s'il est négatif), puis
les budgets ajoutés (8 au plus) avec ce qui a été dépensé de leur montant et la part consommée : vert sous
75 %, orange sous 100 %, rouge au-delà. Touchez un budget pour voir ce qu'il reste et sa période. Le pied
donne l'heure de la dernière lecture.

## Déclencheurs de scène

- **Firefly III : facture à échéance** : une facture ajoutée dans Gladys est attendue aujourd'hui, demain,
  dans 2, 3 ou 7 jours (au choix). Il se déclenche une fois par facture et par échéance, ce jour-là.
  Variables : nom de la facture, montant prévu, devise, échéance (AAAA-MM-JJ) et une phrase toute faite.
- **Firefly III : seuil de budget atteint** : les dépenses d'un budget ajouté dans Gladys atteignent 50, 75, 90
  ou 100 % de son montant (100 % : épuisé ou dépassé). Il se déclenche une fois par seuil et par période. Le
  seuil déjà atteint à la première lecture du budget sert de point de départ et ne déclenche rien. Variables :
  nom, dépensé, budgété, part consommée (%), devise et une phrase.

Ce qui a été déclenché est gardé dans les données de l'intégration : un redémarrage ne déclenche rien deux
fois.

## Actions de scène

- **Firefly III : lire les soldes** : le solde de chaque compte ajouté, en une phrase. Sorties : `text`,
  `count`.
- **Firefly III : lire les budgets** : ce que chaque budget ajouté a dépensé de son montant. Sorties : `text`,
  `count`, `over_count` (budgets épuisés ou dépassés).
- **Firefly III : lire les prochaines factures** : les factures ajoutées attendues dans les 7, 14 ou 31 jours,
  la plus proche d'abord. Sorties : `text`, `count`.

Une action relit Firefly III quand la dernière lecture date de plus que la fréquence de mise à jour.

## Exemples de scènes

- **Rappel avant une facture** : déclencheur « facture à échéance », 3 jours, sur le loyer ; action : envoyer
  un message avec `{{triggerEvent.data.text}}`.
- **Budget courses presque épuisé** : déclencheur « seuil de budget atteint », 90 %, sur le budget courses ;
  action : prévenir la famille sur Telegram.
- **Point du lundi matin** : chaque lundi à 8 h, action « lire les budgets », puis faire lire
  `{{output.text}}` par l'enceinte de la cuisine.

## Confidentialité et données

- L'intégration lit Firefly III et n'y écrit jamais.
- Le jeton est gardé par Gladys comme tout réglage secret, et jamais écrit dans les journaux.
- Les journaux ne contiennent jamais de montant, de nom de compte, de budget ou de facture, d'IBAN ni
  l'adresse de Firefly III, même en debug : seulement des nombres, des identifiants et des seuils.
- Aucun IBAN ni numéro de compte n'est mis dans Gladys. Les noms des comptes et des budgets deviennent les noms
  des appareils, que vous pouvez renommer.
- Le volume de données de l'intégration ne garde que les déclencheurs envoyés (identifiants, dates et
  seuils).

## Dépannage

| Message                                        | Que faire                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Firefly III refuse le jeton                    | Le jeton a été révoqué ou copié en partie : créez-en un nouveau                                      |
| Firefly III ne répond pas                      | Vérifiez l'adresse depuis la machine de Gladys (port, `http`/`https`), et que Firefly III tourne     |
| Le certificat de Firefly III n'est pas reconnu | Utilisez l'adresse `http` du réseau local, ou activez « Accepter un certificat auto-signé »          |
| Cette adresse ne répond pas comme l'API        | L'adresse mène à une autre page (portail de connexion, proxy) : donnez celle de Firefly III lui-même |
| Un appareil n'a pas de valeur                  | Ajoutez-le dans l'onglet Découverte : seuls les appareils ajoutés sont suivis                        |

Les journaux de l'intégration (Intégrations → Firefly III → journaux) disent ce qui s'est passé ; réglez
`LOG_LEVEL=debug` pour plus de détails.

## Limites

- Lecture seule : aucune opération ne peut être créée depuis Gladys.
- Un seul Firefly III, un seul utilisateur (celui du jeton).
- Les factures en retard ne sont pas signalées : seule compte la prochaine échéance attendue.
- Les montants des autres devises ne sont pas convertis ; la synthèse a un appareil par devise.
- Les valeurs suivent la fréquence de mise à jour : une opération apparaît dans Gladys à la lecture suivante.
- Testée contre un vrai Firefly III 6.7.9 en Docker, pas encore sur une installation de Gladys avec de vrais
  comptes : vos retours sont les bienvenus.
