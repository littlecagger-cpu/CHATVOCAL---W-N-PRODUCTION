# 🎙️ CHATVOCAL — W&N PRODUCTION

Système de chat vocal de proximité pour Roblox.
Les joueurs s'entendent uniquement s'ils sont proches les uns des autres en jeu.
Compatible avec **plusieurs jeux Roblox simultanément**.

---

## Comment ça marche

```
[Roblox] → envoie positions (HTTP POST) → [Serveur] → calcule proximité
                                                    ↕ Socket.io
                                              [Site Web] → WebRTC audio entre joueurs
```

---

## 📁 Structure des fichiers

```
chatvocal/
├── index.js          ← Serveur principal (Express + Socket.io)
├── config.js         ← Configuration des jeux ⭐ À MODIFIER
├── package.json
├── .env.example
├── public/
│   ├── index.html    ← Site web (frontend)
│   ├── style.css
│   └── app.js        ← Logique WebRTC + Socket.io
└── roblox/
    └── ProximityChatServer.lua  ← Script à mettre dans Studio ⭐
```

---

## 🚀 Déploiement (Railway — recommandé, gratuit)

### Étape 1 — Préparer le projet

1. Crée un compte sur [railway.app](https://railway.app)
2. Installe [Git](https://git-scm.com) si ce n'est pas déjà fait
3. Dans le dossier `chatvocal/`, ouvre un terminal et tape :

```bash
git init
git add .
git commit -m "CHATVOCAL initial"
```

### Étape 2 — Déployer sur Railway

1. Sur Railway, clique **New Project → Deploy from GitHub Repo**
2. Connecte ton GitHub et push le dossier `chatvocal/`
3. Railway détecte automatiquement Node.js et lance `npm start`
4. Note l'URL générée (ex: `https://chatvocal-production.railway.app`)

> 💡 Alternative : utilise **Render.com** (même procédé, gratuit aussi)

---

## ⚙️ Configuration des jeux

Ouvre `config.js` et modifie les jeux :

```js
module.exports = {
  games: {
    "game_001": {
      name: "Nom de ton jeu",      // Affiché sur le site
      proximityRadius: 50,          // Rayon en unités Roblox (1 = 1 stud)
      apiKey: "cle_secrete_001"     // Mot de passe entre Roblox et le serveur
    }
  }
};
```

**Pour ajouter un 2e jeu**, copie-colle simplement un bloc et change les valeurs.

---

## 🎮 Configuration Roblox Studio

### 1. Activer HttpService

Dans Studio : **Game Settings → Security → Allow HTTP Requests** → ✅ Activé

### 2. Installer le script

1. Ouvre ton jeu dans Roblox Studio
2. Dans l'**Explorer**, va dans `ServerScriptService`
3. Crée un nouveau `Script` (pas LocalScript !)
4. Copie-colle le contenu de `roblox/ProximityChatServer.lua`
5. Modifie les 3 lignes de configuration :

```lua
local SERVER_URL = "https://TON-SERVEUR.railway.app/api/positions"
local GAME_ID    = "game_001"   -- Doit correspondre à config.js
local API_KEY    = "cle_secrete_001"   -- Doit correspondre à config.js
```

---

## 🔧 Test en local (développement)

```bash
# Installer les dépendances
npm install

# Lancer le serveur
npm run dev   # avec auto-reload (nodemon)
# ou
npm start     # version production

# Le site est accessible sur http://localhost:3000
```

> ⚠️ Pour tester depuis Roblox Studio en local, il faut que Studio
> puisse atteindre ton PC (tunnel ngrok ou déploiement direct).

---

## 📡 Endpoints API

| Méthode | URL | Description |
|---------|-----|-------------|
| `POST` | `/api/positions` | Réception des positions Roblox |
| `GET` | `/api/games` | Liste des jeux configurés |
| `GET` | `/api/status` | Statut du serveur |

---

## 🔊 Comment fonctionne l'audio

- Le navigateur utilise **WebRTC** pour établir des connexions audio peer-to-peer
- Le **volume** est automatiquement ajusté selon la distance (0% à 100%)
- Deux joueurs à portée s'entendent, au-delà ils ne s'entendent plus
- Le serveur ne transmet **jamais** l'audio, seulement les signaux de connexion

---

## ❓ FAQ

**Le script Roblox plante avec une erreur HTTP ?**
→ Vérifie que HttpService est activé dans les paramètres du jeu.
→ Vérifie que l'URL du serveur est correcte (avec https://).

**Les joueurs ne se connectent pas entre eux ?**
→ Assure-toi que le nom Roblox entré sur le site correspond **exactement** au nom en jeu (respecte la casse).

**Le site ne charge pas les jeux ?**
→ Vérifie que le serveur tourne (Railway logs) et que `config.js` contient au moins un jeu.

**Ajouter un nouveau jeu sans redémarrer ?**
→ Pas encore possible en temps réel, il faut redéployer. C'est une évolution possible.

---

## 🛠️ Technologies utilisées

- **Node.js** + **Express** — Serveur HTTP
- **Socket.io** — Temps réel (signaling + proximité)
- **WebRTC** — Audio peer-to-peer natif navigateur
- **Roblox HttpService** — Envoi des positions depuis le jeu

---

*CHATVOCAL — W&N PRODUCTION*
