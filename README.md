# Suivi — Habitudes

**Suivi** est une PWA statique permettant de créer des trackers personnels et d'enregistrer rapidement des événements horodatés.

L'application utilise :

- HTML, CSS et JavaScript vanilla
- Supabase Auth avec connexion par lien magique
- Supabase pour les tables `trackers` et `events`
- Service Worker pour les fichiers statiques locaux
- Aucune étape de build

## Fichiers

Dépose les fichiers suivants à la racine du site :

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `icon-180.png`
- `icon-192.png`
- `icon-512.png`

Les icônes doivent être de véritables fichiers PNG de 180×180, 192×192 et 512×512 pixels.

## 1. Configurer Supabase

Dans `app.js`, remplace au moment du déploiement :

```javascript
const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";
```

par l'URL publique du projet Supabase et sa clé publique `anon`.

Ne mets jamais de clé `service_role` dans cette application.

Le Row Level Security doit rester activé sur les tables `trackers` et `events`.

## 2. Configurer Supabase Auth

Dans le tableau de bord Supabase :

1. Ouvre **Authentication**.
2. Ouvre les paramètres d'URL.
3. Configure **Site URL** avec l'URL publique exacte de l'application.

Exemple pour GitHub Pages :

```
https://UTILISATEUR.github.io/NOM-DU-REPO/
```

Ajoute également cette même URL dans les URLs de redirection autorisées.

L'application utilise :

```javascript
supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: pageActuelleSansQueryNiHash
  }
});
```

Le lien reçu par courriel ramène donc directement vers la page actuellement déployée.

## 3. Déployer sur GitHub Pages

1. Crée un dépôt GitHub.
2. Ajoute tous les fichiers de l'application à la racine du dépôt.
3. Remplace les deux valeurs Supabase dans `app.js`.
4. Envoie les fichiers sur la branche `main`.
5. Dans GitHub, ouvre **Settings → Pages**.
6. Dans **Build and deployment**, choisis **Deploy from a branch**.
7. Sélectionne :
   - branche : `main`
   - dossier : `/` (root)
8. Enregistre.

GitHub fournira une URL semblable à :

```
https://UTILISATEUR.github.io/NOM-DU-REPO/
```

Utilise exactement cette URL comme **Site URL** dans Supabase Auth.

## Service Worker

Le service worker utilise une stratégie **cache-first uniquement** pour :

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `icon-180.png`
- `icon-192.png`
- `icon-512.png`

Tous les autres appels restent sur le réseau.

Les requêtes vers `supabase.co`, les sous-domaines `*.supabase.co` et les CDN externes comme `jsDelivr` ne sont jamais interceptées ni stockées dans le cache du service worker.
