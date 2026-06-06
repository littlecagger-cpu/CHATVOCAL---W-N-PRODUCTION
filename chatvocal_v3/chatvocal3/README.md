# 🎙️ CHATVOCAL v3 — W&N PRODUCTION

Proximity Chat Roblox avec **vérification par commande `/verify`**.

---

## Comment ça marche

1. Le joueur va sur le site et entre son nom Roblox
2. Un code à 6 chiffres s'affiche
3. Il tape `/verify 123456` dans le chat Roblox en jeu
4. Le script détecte la commande et confirme au serveur
5. Le site débloque automatiquement → sélection du jeu → chat vocal

---

## 🎮 Roblox Studio

1. **Game Settings → Security → Allow HTTP Requests** ✅
2. Crée un **Script** dans `ServerScriptService`
3. Colle le contenu de `roblox/ProximityChatServer.lua`
4. Modifie les 3 lignes :

```lua
local SERVER_URL = "https://chatvocal-wn-production.onrender.com"
local GAME_ID    = "game_001"
local API_KEY    = "cle_secrete_001"
```

---

## 🚀 Déploiement Render

1. Mets **tous les fichiers à la racine** de ton repo GitHub
   *(index.js, package.json, config.js, public/, roblox/ directement visibles)*
2. Render → New Web Service → connecte le repo
3. **Language**: Node | **Build**: `npm install` | **Start**: `node index.js`
4. **Root Directory**: laisser vide

---

## ⚙️ Ajouter des jeux (`config.js`)

```js
"game_001": {
  name: "Nom du jeu",
  proximityRadius: 50,   // rayon en unités Roblox
  apiKey: "cle_secrete"  // même valeur que dans le script Lua
}
```

---

*CHATVOCAL v3 — W&N PRODUCTION*
