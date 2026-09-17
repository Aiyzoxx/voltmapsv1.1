# Privacy Policy — Volt Extension

**Last updated:** 2026-05-10
**Version:** 20.0.0
**Contact:** volt@webtvmedia.net

---

## Version française

### 1. Qui sommes-nous

Volt Extension est une extension de navigateur Chrome / Edge (Manifest V3) qui ajoute des overlays de performance (FPS, timer), un chat in-game, un classement et un mode duel 1v1 sur quatre jeux WebGL pris en charge.

Responsable du traitement : **y.benyedder06@gmail.com**.

### 2. Quand l'extension fonctionne-t-elle ?

L'extension n'est active **que** sur les quatre domaines suivants :

- `https://yell0wsuit.page/*`

Sur toute autre page, l'extension ne lit ni n'écrit aucune donnée.

### 3. Données collectées et finalité

| Donnée | Finalité | Où elle est stockée |
|---|---|---|
| Pseudo, avatar, grade | Affichage du profil, chat, classement | Supabase (api.webtvmedia.net) |
| Email Google (si vous vous connectez) | Authentification | Supabase Auth (api.webtvmedia.net) |
| Scores de run, temps, statistiques | Classement et historique personnel | Supabase |
| Messages de chat global, DM, chat d'équipe | Fonctionnalité de chat | Supabase |
| Statistiques de duels (ELO, victoires, défaites) | Matchmaking 1v1 | Supabase |
| Empreinte matérielle légère (HWID) | Détection de tricherie multi-comptes | Supabase |
| Préférences d'overlay (couleurs, position) | Personnalisation locale | `chrome.storage.local` (votre appareil) |

Nous **ne collectons pas** : votre historique de navigation, vos mots de passe, votre géolocalisation, votre liste de contacts, vos saisies clavier hors des champs de chat de l'extension.

### 4. Anti-cheat client

L'extension injecte un script léger (`securityInjected.js`) qui surveille `Date.now()`, `performance.now()` et `requestAnimationFrame()` afin de détecter les modifications de vitesse de jeu (speedhack). Les anomalies sont signalées au serveur en tant que score de suspicion, sans envoi d'informations supplémentaires.

### 5. Sous-traitants

- **Supabase Inc.** — hébergement de la base de données et de l'API temps réel (domaine : `api.webtvmedia.net`).
- **Google LLC** — authentification OAuth (uniquement si vous choisissez le bouton « Se connecter avec Google »).

Aucune donnée n'est vendue, partagée ni transmise à des annonceurs ou des courtiers de données.

### 6. Cookies / suivi tiers

L'extension n'utilise aucun cookie tiers, aucun pixel de tracking, aucun service d'analytics (Google Analytics, Mixpanel, etc.).

### 7. Vos droits (RGPD)

Vous disposez des droits suivants :

- **Accès** : recevoir une copie de toutes vos données.
- **Rectification** : corriger un pseudo, un avatar, etc.
- **Effacement** (« droit à l'oubli ») : suppression complète de votre compte et de vos données.
- **Portabilité** : export JSON de vos données.
- **Opposition** : refuser certains traitements (anti-cheat, classement public).

Pour exercer ces droits, écrivez à **y.benyedder06@gmail.com**. Délai de réponse : 30 jours maximum.

La suppression est mise en œuvre via le mécanisme de soft-delete documenté dans `supabase/migrations/001_rgpd_soft_delete_export.sql`, suivi d'une purge définitive sous 30 jours.

### 8. Mineurs

L'extension n'est pas destinée aux enfants de moins de 13 ans et nous ne collectons pas intentionnellement leurs données. Si vous découvrez qu'un mineur a créé un compte, contactez-nous pour suppression immédiate.

### 9. Sécurité

- Toutes les communications avec le backend sont chiffrées (HTTPS / WSS).
- L'accès aux données est protégé par les politiques RLS (Row Level Security) de Supabase.
- La clé `anon` Supabase intégrée dans le code est **publique par conception** ; la sécurité repose sur RLS côté serveur.

### 10. Modifications de cette politique

Toute modification matérielle de cette politique sera publiée dans ce fichier (`PRIVACY.md`) avec la date de mise à jour. Continuer à utiliser l'extension après modification vaut acceptation.

---

## English version

### 1. Who we are

Volt Extension is a Chrome / Edge browser extension (Manifest V3) that adds performance overlays (FPS, timer), in-game chat, leaderboards and 1v1 duel features on four supported WebGL game pages.

Data controller: **y.benyedder06@gmail.com**.

### 2. When does the extension run?

The extension is active **only** on these four domains:

- `https://ss.randomkzn.com/*`
- `https://yell0wsuit.page/*`
- `http://localhost:8512/*`
- `http://localhost:3007/*`

On any other page, the extension reads no data and writes no data.

### 3. Data we collect

| Data | Purpose | Storage |
|---|---|---|
| Username, avatar, grade | Profile display, chat, leaderboard | Supabase (api.webtvmedia.net) |
| Google email (if you sign in) | Authentication | Supabase Auth |
| Run scores, times, statistics | Leaderboard, personal history | Supabase |
| Global / DM / team chat messages | Chat feature | Supabase |
| Duel statistics (ELO, wins, losses) | 1v1 matchmaking | Supabase |
| Lightweight hardware fingerprint (HWID) | Multi-account cheat detection | Supabase |
| Overlay preferences (colours, position) | Local customisation | `chrome.storage.local` (your device) |

We **do not collect**: browsing history, passwords, geolocation, contacts, keystrokes outside the extension's chat inputs.

### 4. Client-side anti-cheat

The extension injects a small script (`securityInjected.js`) that monitors `Date.now()`, `performance.now()` and `requestAnimationFrame()` to detect speed-hacks. Anomalies are reported to the server as a suspicion score, with no other information.

### 5. Sub-processors

- **Supabase Inc.** — database hosting and realtime API (`api.webtvmedia.net`).
- **Google LLC** — OAuth authentication (only if you choose "Sign in with Google").

No data is sold or shared with advertisers or data brokers.

### 6. Cookies / third-party tracking

The extension uses no third-party cookies, tracking pixels, or analytics services.

### 7. Your rights (GDPR / similar laws)

You have the right to access, rectify, erase, export and object. Write to **y.benyedder06@gmail.com**. We respond within 30 days. Deletion uses the soft-delete mechanism in `supabase/migrations/001_rgpd_soft_delete_export.sql`, followed by hard purge within 30 days.

### 8. Minors

Not intended for children under 13. We do not knowingly collect their data.

### 9. Security

- All backend traffic is encrypted (HTTPS / WSS).
- Access is enforced server-side by Supabase Row Level Security policies.
- The Supabase `anon` key shipped with the extension is **public by design**; security is enforced by RLS.

### 10. Changes

Material changes will be published in this file with an updated date. Continued use constitutes acceptance.
