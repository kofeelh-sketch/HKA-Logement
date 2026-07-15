# HKA Logement — App (Phase B)

Projet **Vite + React** issu de la maquette. Base de la mise en ligne (Supabase + GitHub Pages + PWA).

## Démarrer en local

```bash
npm install        # installe les dépendances (crée node_modules/)
npm run dev        # lance le serveur de dev → http://localhost:5173
npm run build      # génère le dossier dist/ (déployable)
npm run preview    # prévisualise le build
```

## Variables d'environnement

Le fichier `.env` contient déjà tes valeurs Supabase :
- `VITE_SUPABASE_URL` — URL du projet
- `VITE_SUPABASE_ANON_KEY` — clé publique (publishable) — sans danger côté front
- `VITE_ADMIN_EMAIL` — email du compte admin

`.env` est ignoré par git (`.gitignore`). `.env.example` est le modèle à versionner.

## Structure

```
app/
├─ index.html            entrée HTML
├─ vite.config.js        config Vite (base "./" pour GitHub Pages)
├─ .env / .env.example   variables Supabase
├─ src/
│  ├─ main.jsx           point d'entrée React
│  ├─ App.jsx            la maquette (inchangée pour l'instant)
│  └─ lib/supabase.js    client Supabase (lit le .env)
```

## État (Phase B — avancement)

- [x] Étape 1 — Scaffolding Vite + React, deps, .env
- [x] Étape 2 — Migration maquette (App.jsx) + entrée
- [x] Client Supabase configuré (src/lib/supabase.js)
- [x] Étape 3 — Schéma SQL prêt (table + RLS + colonne video)
- [x] Lecture des chambres depuis Supabase (src/lib/chambres.js ; fallback démo si hors-ligne)
- [x] Étape 4 — Supabase Auth : la porte admin utilise email + mot de passe (fini le code "hka2026")
- [x] Admin CRUD (ajout / modif / suppression / statut) branché sur Supabase (protégé par RLS)
- [ ] À faire côté Supabase : lancer l'ALTER video + créer l'utilisateur admin (voir plus bas)
- [ ] Étape 5 — Numéros réels WhatsApp / Wave / Orange dans Paramètres
- [x] Étape 6 — Storage branché : upload photos + vidéo dans l'admin, affichage réel (repli dégradé si vide)
      → à lancer une fois : `schema_storage.sql` dans Supabase (crée le bucket `media` + colonnes)
      → les vrais fichiers seront ajoutés plus tard, à la configuration des chambres
- [x] Étape 7 — PWA activée : manifeste + icônes (logo HKA), installable Android/iPhone

## Tester la PWA (installation)

L'installation se teste sur la version **construite** (pas `npm run dev`) :

```bash
npm run build
npm run preview
```

Ouvre l'URL affichée (ex. http://localhost:4173/) :
- **Chrome ordinateur** : une icône « Installer » apparaît dans la barre d'adresse.
- **Téléphone** (après déploiement, étape 8) : menu du navigateur → « Ajouter à l'écran d'accueil ».

Icônes générées dans `public/` : `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`, `favicon-32`.
Note : après un `git`/déploiement, la vraie expérience d'install (HTTPS) sera au top à l'étape 8.
- [x] Étape 8 — GitHub Action de déploiement prête (.github/workflows/deploy.yml)
      → reste : envoyer le code sur GitHub + activer Pages (voir ci-dessous)

## Mettre en ligne (étape 8)

Le dépôt = ce dossier `app/`. Dans un terminal ouvert dans `app/` :

```bash
git init
git add .
git commit -m "HKA Logement — mise en ligne"
git branch -M main
git remote add origin <URL-DE-TON-DEPOT>
git push -u origin main
```

Puis sur GitHub : dépôt → **Settings → Pages → Build and deployment → Source = GitHub Actions**.

À chaque `git push`, l'app se reconstruit et se redéploie toute seule. L'adresse en ligne
apparaît dans Settings → Pages (ex. `https://ton-user.github.io/ton-depot/`).

Le nom de domaine perso se branchera après (ajout d'un fichier CNAME + DNS).

## Créer le compte admin (obligatoire pour l'espace admin)

L'espace admin est réservé au compte `kofeel.h@gmail.com` (règle RLS). Pour l'activer :

1. Supabase → **Authentication → Users → Add user**
2. Email : `kofeel.h@gmail.com` · choisis un **mot de passe** · coche **Auto Confirm User**
3. Dans l'app : triple-tap sur le logo → écran admin → connecte-toi avec cet email + mot de passe.

Sans ce compte, la lecture publique des chambres fonctionne, mais l'ajout/modif en admin
sera refusé par la sécurité (RLS) — c'est voulu.

## Note OneDrive

Ce dossier est synchronisé OneDrive. Après `npm install`, `node_modules/` sera lourd :
pense à l'exclure de la synchro (clic droit dossier → « Libérer de l'espace » /
paramètres OneDrive) pour éviter de ralentir la synchro.
