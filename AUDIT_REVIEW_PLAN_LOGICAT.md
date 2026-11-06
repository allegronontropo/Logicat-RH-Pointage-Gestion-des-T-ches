# Audit, Revue & Plan d'implémentation — Test Technique RH LOGICAT

**Cible :** Application RH full-stack (pointage & gestion des tâches) — deux portails : Administrateur RH / Employé  
**Stack imposée :** React.js + React Router · Python + FastAPI (REST) · PostgreSQL ou SQLite · JWT · hachage mots de passe · Swagger · Git/GitHub  
**Format :** projet individuel, 5 jours recommandés, démo finale  
**Livrables attendus :** dépôt GitHub, BDD persistante, 2 interfaces fonctionnelles, 3 comptes démo (2 Admin RH + 1 Employé), documentation API + README

---

## 1. Documents analysés (sources)

| Document | Forme | Contenu exploitable |
|---|---|---|
| `Cahier_des_Charges_Test_Technique_RH_LOGICAT.pdf` | PDF (5 p.) | Exigence officielle complète : périmètre, matrice des permissions, architecture attendue, planning 5 jours, livrables, règles métier (état machine pointage, exemple de calcul) |
| `antigravityplan.pdf` | PDF (8 p.) | **Non extractible** (pages en image / sans couche texte). Connu uniquement par les critiques de DeepSeek et ChatGPT. Matrice des permissions jugée fausse (8 lignes erronées attribuant tout à l'Employé). |
| `README_DEEPSEEK_PLAN.md.txt` | Markdown | Plan complet : critique d'Antigravity, modèle de données, vision design "Chronos", 5 "wow moves", stack recommandé, planning 5 jours, liste de pièges. |
| `chatgpt_pov.md.txt` | Markdown (1 434 lignes) | Revue détaillée : matrice des permissions corrigée (source = cahier p.4), architecture BDD, inventaire d'endpoints API, planning 5 jours, matrice de tests, direction design (identité bleue LOGICAT), tableau keep/change/postpone. |

**Constat :** Les trois plans s'accordent sur le stack imposé (React + FastAPI) et sur le cœur métier. Leurs divergences portent sur (1) la matrice des permissions — Antigravity est à jeter, (2) le niveau de "créatif" / polish visuel — DeepSeek sur-investit (PWA, palette de commandes, dark mode, Day Ring), (3) l'identité visuelle — DeepSeek propose un thème "Chronos" générique, ChatGPT conseille de reprendre l'identité bleue LOGICAT.

---

## 2. Audit d'usage réel chez Logicat (contexte organisationnel)

Au-delà de l'exercice scolaire, cette application sera un véritable outil RH au quotidien dans une entreprise de services (LOGICAT GROUP, Maroc, fuseau Africa/Casablanca). Voici ce que l'usage réel impose et que le cahier ne couvre qu'imparfaitement.

### 2.1 Personas et usage quotidien

| Persona | Fréquence | Actions principales | Contrainte forte |
|---|---|---|---|
| **Employé de terrain / bureau** | Quotidien | Check-in à l'arrivée, 3 pauses, check-out, consulter ses tâches, changer statut, mettre à jour téléphone/mot de passe | Doit pouvoir pointer depuis un mobile (connectivité parfois instable), pas de saisie d'horaires clients (serveur uniquement) |
| **Admin RH** | Quotidien | Créer/désactiver des comptes, réinitialiser mots de passe, déclarer absences, suivre présences de tous, filtrer par date/employé, créer/attribuer/suivre tâches | Doit voir tout le monde mais jamais modifier un pointage historique employé ; ne peut pas se désactiver lui-même ni le dernier admin actif |
| **Direction / RH opérationnelle** | Hebdomadaire | Exporter/suivre heures effectives, absences justifiées vs non, avancement des tâches par employé | Besoin de rapports/export (CSV/Excel) pour la paie et le suivi d'activité — **non demandé par le cahier, mais critique en réel** |

### 2.2 Contraintes opérationnelles réelles (écarts vs. cahier)

1. **Mobilité d'abord pour l'employé.** Le pointage se fait au badgeuse ou au téléphone à l'entrée du bureau. Une interface desktop-only est inutilisable sur le terrain. Le PWA proposé par DeepSeek est pertinent, mais seulement s'il reste léger (15 min, pas de sur-ingénierie).
2. **Fuseau horaire Africa/Casablanca.** "Un check-in par jour" et "présent aujourd'hui" dépendent d'une convention horaire cohérente. Stocker en UTC, calculer en Casablanca. Risque : bascule heure d'été/hiver si le test s'étend sur plusieurs mois — documenter la convention.
3. **Aucune inscription publique.** Le premier compte Admin RH doit être seedé. En vrai, la création du premier admin est un geste d'installation, pas une fonctionnalité UI.
4. **Intégrité juridique (RGPD / loi 09-08 marocaine).** Données de présence = données à caractère personnel. Tout accès par modification d'ID dans l'URL (IDOR) est une faille de conformité, pas seulement un bug. Le cahier le mentionne deux fois : c'est le critère #1 de rejet.
5. **Aucune modification rétroactive par l'employé.** Si un employé oublie de pointer, seul l'admin peut corriger (ou déclarer une absence). Le cahier dit "l'employé ne peut pas modifier directement ses pointages historiques" — il faut prévoir une voie d'administration de correction sans contourner la règle.
6. **Dernier admin actif.** Empêcher la désactivation du dernier Admin RH est une règle de continuité métier : sans admin, l'application est bloquée.
7. **JWT ≠ session valide.** Un compte désactivé doit être rejeté à chaque requête, même avec un token non expiré. Le dependency `get_current_user` doit interroger la BDD à chaque appel (piège classique).

### 2.3 Risques métiers à traiter

| Risque | Conséquence | Atténuation dans ce plan |
|---|---|---|
| IDOR (employé accède aux données d'un autre) | Faille de conformité majeure, rejet du test | Scopes backend par `current_user.id`, tests IDOR explicites |
| Compte désactivé conserve l'accès via JWT | Brèche de sécurité | Vérification `is_active` en BDD à chaque requête protégée |
| Deux admins se désactivent mutuellement / dernier admin désactivé | Application bloquée | Blocage métier + transaction, tests |
| Pointage en double / checkout pendant pause | Données de présence fausses, litige paie | État machine côté service + contraintes BDD + tests d'edge cases |
| Horaires saisis par le client | Manipulation des temps de travail | Timestamps générés côté serveur uniquement |
| Pas d'export / reporting | Outil inutilisable pour la paie en réel | Endpoint d'export CSV des présences (ajout recommandé, jour 5 ou buffer) |

---

## 3. Revue critique des trois plans existants

### 3.1 Antigravity (plan PDF non lisible directement)
- **Ce qu'on en sait :** Via DeepSeek et ChatGPT, Antigravity propose une matrice des permissions où l'Employé a accès à tout (8 lignes fausses : créer des comptes, modifier/désactiver, voir tous les utilisateurs, voir tous les pointages, déclarer absences, CRUD tâches, voir toutes les tâches, effectuer pointage). Suivre cette matrice = échec garanti sur le critère "contrôle des rôles".
- **Valeur résiduelle :** Sketch de BDD (users → employees 1:1, attendances, breaks, tasks) jugé propre par DeepSeek ; liste de 8 règles métier réutilisable comme checklist de tests ; vocabulaire des concepts pour la soutenance.
- **Verdict :** Ne pas utiliser comme source. La matrice des permissions est à écarter totalement.

### 3.2 DeepSeek (README_DEEPSEEK_PLAN.md)
- **Forces :** Bonne identification des pièges (JWT vs compte désactivé, IDOR, last-admin, état machine pauses, mass-assignment, timestamps serveur, pas d'inscription publique) ; stack cohérent (PostgreSQL + SQLAlchemy 2.0 + Alembic + Pydantic v2 + argon2 + PyJWT + Vite + Tailwind + shadcn + TanStack Query + react-hook-form + zod) ; séparation services/routers bien pensée ; 5 jours bien découpés.
- **Faiblesses / risques :** Sur-investissement "créatif" (thème Chronos, Day Ring SVG animé, palette de commandes ⌘K, dark mode, PWA, Framer Motion) qui consomme du temps sur le cœur noté (permissions + calculs) ; identité visuelle déconnectée de LOGICAT (bleu de marque) ; recommande pwdlib (déconseillé par ChatGPT : non maintenu, incompatibilité bcrypt 4.x → utiliser bcrypt ou argon2 directement) ; sous-estime le besoin d'export/reporting RH.
- **Verdict :** Bon plan technique global, mais à recentrer sur les livrables notés et l'identité LOGICAT. Les "wow moves" ne doivent venir qu'après validation du cœur.

### 3.3 ChatGPT (chatgpt_pov.md)
- **Forces :** Respect strict du stack imposé ; matrice des permissions alignée sur le cahier (page 4) — c'est la source de vérité ; architecture BDD claire (5 tables, contraintes, transactions) ; inventaire d'endpoints API complet et cohérent ; planning 5 jours réaliste et centré sur le risque ; matrice de tests d'edge cases utile ; direction design alignée sur l'identité bleue LOGICAT ; recommande de différer les fonctionnalités non essentielles (command palette, dark mode, PWA).
- **Faiblesses :** Moins détaillé sur le polish UI et l'expérience mobile de l'employé ; ne traite pas explicitement l'export/reporting (besoin réel chez Logicat) ; correction de mot de passe / réinitialisation à préciser (sécurité du flux).
- **Verdict :** Le plan le plus solide pour réussir le test. À conserver comme base, enrichi des apports de DeepSeek sur le polish (avec modération) et de l'audit d'usage réel ci-dessus.

---

## 4. Ma revue indépendante (évaluation)

### 4.1 Ce qui est non-négociable (critères de passage)
1. **Permissions backend uniquement** — cacher un bouton en React ne suffit pas ; chaque endpoint doit vérifier rôle + propriété.
2. **JWT + vérification `is_active` en BDD à chaque requête** — un compte désactivé doit être bloqué immédiatement.
3. **État machine des pauses appliqué côté service** : check-in avant pauses/checkout ; 1 check-in et 1 check-out par jour ; 1 pause active à la fois ; checkout interdit pendant pause active ; chaque type de pause 1 fois/jour ; pas de modification de l'historique par l'employé.
4. **Calculs exacts** : présence = check_out − check_in ; pauses = Σ(fin − début) ; effectif = présence − pauses (exemple : 09:00→18:00, pauses 15+60+15 → présence 9h, effectif 7h30).
5. **Dernier admin / auto-désactivation bloqués** ; pas d'inscription publique ; email unique ; mots de passe hachés (argon2 ou bcrypt, jamais en clair).
6. **Données de démo fictives** ; 3 comptes (2 Admin RH + 1 Employé) fonctionnels.
7. **Git/GitHub, Swagger, README d'installation, dépôt avec frontend + backend.**

### 4.2 Ce qui est optionnel (ajouter seulement si temps)
- PWA / installation mobile (15 min, jour 5 ou buffer) — pertinent pour l'usage réel chez Logicat.
- Day Ring / indicateurs visuels — différentiateur en démo, mais jamais avant le cœur fonctionnel.
- Export CSV des présences — fortement recommandé pour l'usage réel, faible effort.
- Dark mode, palette de commandes, animations Framer Motion — à reporter.

### 4.3 Choix de stack (ma recommandation)
Couche | Choix | Justification
---|---|---
Frontend | React + Vite + React Router v6 + TypeScript | Imposé par le cahier ; TypeScript réduit les bugs d'intégration API
UI | Tailwind CSS + shadcn/ui (8 composants hand-rollés) | Cohérent, rapide, pas de bibliothèque lourde qui écrase l'identité LOGICAT
Couleur | Bleu LOGICAT (identité marque) + neutres | Aligné sur les logos fournis, pro, pas de thème "Chronos" générique
Backend | FastAPI + Python 3 + SQLAlchemy 2.0 (sync) + Alembic | Imposé, ORM standard, migrations impressionnent, assez rapide pour ce périmètre
Auth | JWT (PyJWT) + argon2/bcrypt + refresh optionnel | Vérification `is_active` en BDD à chaque requête
Validation | Pydantic v2 + schémas séparés par rôle (anti mass-assignment) | Natif FastAPI
Tests | pytest + httpx + test DB | Permissions + calculs explicitement notés ; tests IDOR inclus
DB | PostgreSQL via Docker Compose (SQLite fallback documenté) | Intégrité relationnelle, pro, démo propre
État client | TanStack Query + axios (intercepteur 401 → déconnexion) | Cache, retry, 401 centralisé
Forms | react-hook-form + zod | Cohérence avec validation backend
Design | 1 accent, 1 police (Inter + JetBrains Mono pour les horaires), pas de dark mode | Budget design ≤ 30 %, jour 5 réservé aux tests/docs

---

## 5. Mon plan d'implémentation (5 jours + jour de buffer optionnel)

### Jour 1 — Fondations, sécurité, authentification
**Objectif :** Backend qui tourne, authentification sécurisée, premier admin seedé.

- Initialiser le dépôt Git (monorepo : `backend/`, `frontend/`, `docker-compose.yml`, `README.md`)
- Docker Compose : PostgreSQL + (optionnel) backend
- SQLAlchemy 2.0 + Alembic ; créer les 5 tables (users, employees, attendances, breaks, tasks) avec contraintes (email unique, user_id unique, UNIQUE(user_id, date), UNIQUE(attendance_id, type), FK)
- Hachage mots de passe (argon2 via `bcrypt` ou `passlib[bcrypt]` — éviter `passlib` non maintenu ; utiliser `bcrypt` directement ou `argon2-cffi`)
- JWT (PyJWT) : access token court + dépendance `get_current_user` qui vérifie `is_active` en BDD à chaque requête
- Routes auth : `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- Seed : 1 Admin RH initial + 2ème Admin RH + 1 Employé (mots de passe forts, fictifs)
- Tests de base : login, token invalide, compte désactivé rejeté

**Critère de sortie Jour 1 :** `docker compose up` → BDD + API opérationnels ; login fonctionne ; compte désactivé bloqué même avec token valide.

### Jour 2 — API REST et règles métier (cœur noté)
**Objectif :** API complète, règles métier protégées, tests de permissions et calculs.

- Utilisateurs (Admin seulement) : créer (rôle Admin RH ou Employé), list/search/filter, modifier, désactiver, réinitialiser mot de passe, consulter fiche employé
- Règle : admin ne peut pas se désactiver lui-même ni le dernier Admin RH actif (transaction)
- Employé : profil limité (téléphone + mot de passe uniquement), anti mass-assignment (schémas séparés)
- Présences : check-in, check-out (timestamps serveur), 3 pauses (start/end), état machine, calculs présence/pauses/effectif
- Absences : déclaration justifiée / non justifiée (Admin seulement)
- Tâches : CRUD + assignation (Admin), voir les siennes + changer statut uniquement (Employé)
- Dashboards : agrégations admin (actifs, présents aujourd'hui, absences, tâches totales/en cours/terminées) et employé (compteurs À faire / En cours / Terminées)
- Tests : permissions (IDOR : employé A tente d'accéder à la tâche/pointage de B → 403/404), état machine (double check-in, deux pauses simultanées, checkout pendant pause, même type de pause deux fois), calculs (exemple 09:00-18:00 → 7h30 effectif), last-admin, auto-désactivation, JWT désactivé

**Critère de sortie Jour 2 :** Tous les endpoints fonctionnels via Swagger ; tests de permissions et calculs verts.

### Jour 3 — Interface Admin RH
**Objectif :** Portail admin complet, desktop-first.

- Page de login (split-screen, boutons rapides pour les 3 comptes démo)
- Layout admin (sidebar + topbar), routes protégées par rôle
- Dashboard admin : KPI (employés actifs, présents aujourd'hui, absences, tâches totales/en cours/terminées), indicateurs de présence live (optionnel simple)
- Gestion utilisateurs : liste avec recherche/filtres, création, édition, désactivation/réactivation, réinitialisation mot de passe, fiche employé
- Suivi présences : tableau tous les employés, 3 pauses avec durées, filtres date + employé, déclaration d'absence
- Gestion tâches : créer/modifier/supprimer/attribuer, filtres employé/priorité/statut

**Critère de sortie Jour 3 :** Un admin peut accomplir tous ses flux sans casser ; UI responsive desktop.

### Jour 4 — Interface Employé
**Objectif :** Portail employé, mobile-first pour le pointage.

- Layout employé, routes protégées
- Dashboard employé : profil, présence du jour, heures de pointage, temps effectif, compteurs tâches
- Widget pointage (une pouce, mobile-friendly) : check-in, 3 pauses start/end, check-out ; affichage en cours de pause ("En pause depuis 04:12")
- Profil : éditer téléphone + mot de passe uniquement (rôle/département/poste bloqués)
- Tâches : liste propres, filtres statut/priorité, changer statut uniquement (À faire / En cours / Terminée)
- Intercepteur axios 401 → déconnexion automatique

**Critère de sortie Jour 4 :** Un employé peut pointer, consulter ses tâches, changer statut, éditer son profil limité ; pas d'accès aux données d'autrui.

### Jour 5 — Tests, polish, documentation, démo
**Objectif :** Application stable, demonstrable, documentée.

- Suite de tests complète (permissions, IDOR, état machine, calculs, last-admin, compte désactivé)
- Corrections des bugs trouvés
- Swagger documenté, README : installation < 5 min, crédos démo, scénarios de démo
- Export CSV des présences (ajout recommandé, usage réel Logicat) — si temps
- Nettoyage de l'historique Git, commits propres
- Préparation des scénarios de démo (deux portails, trois comptes)

**Critère de sortie Jour 5 :** `git clone` → `docker compose up` → démo fonctionnelle en < 5 min ; tous les tests verts ; README complet.

### Jour de buffer (optionnel, fortement recommandé)
- PWA léger (vite-plugin-pwa) pour le pointage mobile
- Day Ring / indicateurs visuels (démo "wow")
- Polishing accessibilité (focus rings, contrastes, aria)
- Export Excel/CSV plus complet

---

## 6. Modèle de données corrigé (source de vérité)

```sql
users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(30),
  role          VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN_RH','EMPLOYEE')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

employees (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department  VARCHAR(100),
  position    VARCHAR(100),
  hire_date   DATE
  -- 1:1 avec users, uniquement pour les comptes EMPLOYEE
);

attendances (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  date           DATE NOT NULL,
  check_in       TIMESTAMPTZ,
  check_out      TIMESTAMPTZ,
  status         VARCHAR(30) NOT NULL CHECK (status IN ('PRESENT','ABSENT_JUSTIFIED','ABSENT_UNJUSTIFIED')) DEFAULT 'PRESENT',
  UNIQUE (user_id, date)  -- un pointage par jour par employé
);

breaks (
  id             SERIAL PRIMARY KEY,
  attendance_id  INTEGER NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
  type           VARCHAR(20) NOT NULL CHECK (type IN ('MORNING','LUNCH','EVENING')),
  start_time     TIMESTAMPTZ,
  end_time       TIMESTAMPTZ,
  UNIQUE (attendance_id, type)  -- chaque type de pause une fois par jour
);

tasks (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  priority    VARCHAR(20) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH')) DEFAULT 'MEDIUM',
  due_date    DATE,
  status      VARCHAR(20) NOT NULL CHECK (status IN ('TODO','IN_PROGRESS','DONE')) DEFAULT 'TODO',
  assigned_to INTEGER NOT NULL REFERENCES users(id),
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Décisions de conception à verrouiller :**
- Absence = ligne `attendances` avec statut `ABSENT_*` et sans heures (interprétation du cahier). Si l'employé a déjà pointé ce jour, rejeter l'absence admin.
- Stocker en UTC, calculer "aujourd'hui" en Africa/Casablanca. Convention documentée dans le README.
- `employees` : infos professionnelles uniquement pour les comptes `EMPLOYEE` ; les Admin RH n'ont pas besoin de département/poste.
- Transactions pour : désactivation d'administrateur (compter les admin actifs), démarrage de pause (éviter l'état concurrent).

---

## 7. Matrice des permissions (source de vérité = cahier, page 4)

| Fonctionnalité | Admin RH | Employé |
|---|---|---|
| Connexion / déconnexion | Oui | Oui |
| Créer un Admin RH ou un Employé | Oui | **Non** |
| Modifier / désactiver les comptes | Oui | **Non** |
| Voir tous les utilisateurs | Oui | **Non** |
| Consulter et mettre à jour son profil | Oui | Oui (limité : téléphone + mot de passe) |
| Voir tous les pointages / pauses | Oui | **Non** |
| Effectuer Check-in, pauses, Check-out | **Non** | Oui (personnel uniquement) |
| Voir ses propres pointages | Selon profil | Oui |
| Consulter les heures travaillées | Tous les employés | Ses heures |
| Déclarer une absence | Oui | **Non** |
| Créer / attribuer / modifier / supprimer une tâche | Oui | **Non** |
| Voir toutes les tâches | Oui | **Non** |
| Voir les tâches qui lui sont attribuées | — | Oui |
| Changer le statut de ses tâches | — | Oui |

**Règles transversales (backend obligatoirement) :**
- Toute vérification de permission côté backend ; modifier un ID dans une requête ne doit jamais exposer les données d'un autre employé (IDOR interdit).
- Un admin ne peut pas se désactiver lui-même ni le dernier Admin RH actif.
- Un employé ne peut modifier ni créer, ni réattribuer, ni supprimer une tâche, ni modifier ses pointages historiques.

---

## 8. Contrat API (endpoints)

### Auth
| Méthode | Endpoint | Rôle | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Email/password → JWT |
| GET | `/api/auth/me` | Tous | Utilisateur courant |
| POST | `/api/auth/logout` | Tous | Invalider côté client |

### Utilisateurs (Admin RH uniquement)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Créer (rôle ADMIN_RH ou EMPLOYEE) |
| GET | `/api/users` | List + recherche + filtres |
| GET | `/api/users/{id}` | Détail + fiche employé |
| PUT | `/api/users/{id}` | Modifier (admin) |
| PATCH | `/api/users/{id}/deactivate` | Désactiver (blocage self + dernier admin) |
| PATCH | `/api/users/{id}/activate` | Réactiver |
| PATCH | `/api/users/{id}/reset-password` | Réinitialiser mot de passe |

### Profil employé (Employé uniquement)
| Méthode | Endpoint | Champs autorisés |
|---|---|---|
| PATCH | `/api/employees/me/profile` | téléphone + mot de passe uniquement |

### Présences & pauses
| Méthode | Endpoint | Rôle | Description |
|---|---|---|---|
| POST | `/api/attendances/check-in` | Employé | Check-in (timestamp serveur) |
| POST | `/api/attendances/check-out` | Employé | Check-out (interdit si pause active) |
| GET | `/api/attendances/me` | Employé | Son historique |
| GET | `/api/attendances/today` | Employé | Statut du jour |
| GET | `/api/attendances` | Admin | Liste tous les employés, filtres date + employé |
| POST | `/api/attendances/absences` | Admin | Déclarer absence justifiée / non justifiée |
| POST | `/api/breaks/start` | Employé | Démarrer une pause (type : matin/déjeuner/soir) |
| POST | `/api/breaks/{id}/end` | Employé | Terminer une pause |

### Tâches
| Méthode | Endpoint | Rôle | Description |
|---|---|---|---|
| POST | `/api/tasks` | Admin | Créer + attribuer |
| GET | `/api/tasks` | Admin | Liste toutes, filtres |
| GET | `/api/tasks/me` | Employé | Ses tâches seulement |
| GET | `/api/tasks/{id}` | Selon droit | Détail (propriétaire ou admin) |
| PUT | `/api/tasks/{id}` | Admin | Modifier complet |
| DELETE | `/api/tasks/{id}` | Admin | Supprimer |
| PATCH | `/api/tasks/{id}/status` | Employé | Statut uniquement (TODO/IN_PROGRESS/DONE) |

### Dashboards
| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/api/dashboard/admin` | Admin (KPI + présence live simplifiée) |
| GET | `/api/dashboard/employee` | Employé (compteurs, présence du jour) |
| GET | `/api/attendances/export` | Admin | Export CSV (ajout recommandé, usage réel) |

**Règle d'identité :** Pour l'employé, l'identité provient toujours du token, jamais d'un `employee_id` fourni par le client.

---

## 9. Matrice de tests (Jour 5, critère de passage)

| # | Scénario | Entrée | Résultat attendu |
|---|---|---|---|
| T1 | Employé accède à un endpoint admin | token employé sur `/api/users` | 403 |
| T2 | Employé accède à la tâche d'un autre | `GET /api/tasks/{id_tâche_B}` avec token A | 403 ou 404 (IDOR) |
| T3 | Employé modifie le titre d'une tâche | `PATCH /api/tasks/{id}/status` avec champ title | 422 ou 403 (champ rejeté) |
| T4 | Employé modifie un pointage historique | `PUT` sur attendance passé | 403 |
| T5 | Compte désactivé utilise un JWT valide | requête protégée après désactivation | 401 |
| T6 | Employé se check-in deux fois | 2× `POST /api/attendances/check-in` même jour | 409 / rejet |
| T7 | Deux pauses simultanées | start pause 2 sans avoir fini la pause 1 | 409 / rejet |
| T8 | Check-out pendant pause active | `check-out` avec pause en cours | 409 |
| T9 | Même type de pause deux fois | 2× `start` pause déjeuner même jour | 409 / rejet |
| T10 | Admin se désactive lui-même | `deactivate` sur son propre id | 403 |
| T11 | Admin désactive le dernier Admin RH actif | `deactivate` sur l'admin unique | 409 |
| T12 | Employé change son propre rôle | `PUT /api/users/{id}` champ role | rejeté |
| T13 | Calcul d'heures | 09:00→18:00, pauses 15+60+15 min | présence 9h, pauses 1h30, effectif 7h30 |
| T14 | Email en double | créer utilisateur avec email existant | 409 / 422 |

---

## 10. Checklist de livraison et démo

- [ ] Dépôt GitHub public/privé avec historique propre (commits significatifs, pas un seul "final")
- [ ] `docker compose up` lance BDD + API + frontend (ou instructions claires)
- [ ] Seed : 2 Admin RH + 1 Employé fonctionnels, mots de passe documentés dans le README
- [ ] Swagger ouvert et documenté (`/docs`)
- [ ] README : installation en < 5 min, prérequis, crédos démo, scénarios de démo, stack, choix techniques justifiés
- [ ] Deux portails fonctionnels (Admin RH + Employé)
- [ ] Authentification JWT + rôle, redirection selon le rôle
- [ ] Pointage : check-in, 3 pauses, check-out, calculs exacts (exemple cahier reproduit)
- [ ] Tâches : CRUD admin, statut employé uniquement
- [ ] Pas d'inscription publique
- [ ] Compte désactivé bloqué immédiatement (même avec token)
- [ ] Tests de permissions et calculs verts
- [ ] Démo préparée : scénario employé (pointage + tâches) + scénario admin (utilisateurs, présences, tâches)

---

## 11. Risques et atténuations

| Risque | Probabilité | Impact | Atténuation |
|---|---|---|---|
| Sur-ingénierie UI (Day Ring, PWA, dark mode) avant le cœur | Haute | Échec sur permissions/calculs (critères notés) | Budget design ≤ 30 % ; jour 5 réservé tests/docs ; "wow moves" seulement si le cœur est vert |
| Matrice des permissions copiée d'Antigravity | Haute (si on s'y réfère) | Rejet direct (contrôle des rôles noté 2×) | Source de vérité = cahier page 4 ; ne jamais implémenter la matrice Antigravity |
| JWT considéré comme session suffisante | Moyenne | Compte désactivé garde l'accès | `get_current_user` interroge `is_active` en BDD à chaque requête ; test T5 |
| Horaires saisis par le client | Basse | Manipulation des temps de travail | Timestamps générés exclusivement côté serveur |
| Fuseau horaire / "aujourd'hui" incohérent | Moyenne | Pointages attribués au mauvais jour | UTC en stockage, Africa/Casablanca pour le calcul jour, convention documentée |
| Oubli du seed / 3 comptes démo non prêts | Moyenne | Démo impossible | Seed script automatisé, crédos dans le README |
| Connexion instable pour le pointage mobile | Moyenne (usage réel) | Employé ne peut pas pointer | PWA léger en buffer ; sinon interface mobile-responsive fonctionnelle |

---

## 12. Questions ouvertes (à valider avant de coder)

1. **Base de données :** PostgreSQL via Docker est-il acceptable, ou attendent-ils une configuration SQLite locale simple ? (Je recommande PostgreSQL + Docker avec fallback SQLite documenté.)
2. **Démo :** Sur machine locale uniquement, ou une URL déployée est-elle attendue ? (Le cahier dit "démonstration" — généralement en présentiel, local suffit.)
3. **Durée :** Les 5 jours sont-ils fixes ou y a-t-il une marge ? (Un jour de buffer est fortement recommandé pour le PWA/export/polish.)
4. **TypeScript front-end :** Recommandé (réduit les bugs d'intégration), acceptable ou JavaScript pur attendu ?
5. **Identité visuelle :** Reprendre le bleu LOGICAT des logos (recommandé) ou thème libre "Chronos" ?
6. **Export reporting :** Un export CSV des présences est-il souhaité pour l'usage réel chez Logicat ? (Ajout faible effort, fortement recommandé.)

---

## Conclusion

Les trois plans s'accordent sur l'essentiel : respectez le stack imposé (React + FastAPI), centrez-vous sur les permissions backend et les règles métier du pointage, et traitez le cahier (page 4, matrice des permissions) comme source de vérité — jamais la matrice d'Antigravity. Mon plan ajoute une couche d'audit d'usage réel (mobilité employé, fuseau Casablanca, conformité RGPD/loi 09-08, export reporting, dernier admin) et recentre le design sur l'identité LOGICAT plutôt que sur un thème générique. Suivez le phasage 5 jours + buffer, validez les tests de permissions et de calculs chaque jour, et vous aurez une application à la fois recevable au test et utilisable en réelle chez Logicat.
