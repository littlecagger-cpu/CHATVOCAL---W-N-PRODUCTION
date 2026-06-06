// ================================================
//  CHATVOCAL - W&N PRODUCTION
//  Serveur principal : Express + Socket.io
// ================================================

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const config     = require('./config');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================================================
//  ÉTAT DU SERVEUR
// ================================================

// positions[gameId][playerName] = { x, y, z, lastUpdate }
const positions = {};

// webUsers[gameId][playerName] = { socketId }
const webUsers = {};

// ================================================
//  API ROBLOX
// ================================================

// Réception des positions depuis les scripts Roblox
app.post('/api/positions', (req, res) => {
  const { gameId, apiKey, players } = req.body;

  // Vérification du jeu
  const game = config.games[gameId];
  if (!game) {
    return res.status(404).json({ error: 'Jeu introuvable. Vérifie le gameId dans le script Roblox.' });
  }

  // Vérification de la clé API
  if (game.apiKey && game.apiKey !== apiKey) {
    return res.status(401).json({ error: 'Clé API invalide.' });
  }

  // Validation des données
  if (!Array.isArray(players)) {
    return res.status(400).json({ error: 'Format invalide. "players" doit être un tableau.' });
  }

  if (!positions[gameId]) positions[gameId] = {};

  const now = Date.now();

  // Mise à jour des positions reçues
  players.forEach(({ name, x, y, z }) => {
    if (typeof name === 'string' && typeof x === 'number') {
      positions[gameId][name] = { x, y, z, lastUpdate: now };
    }
  });

  // Supprimer les joueurs Roblox déconnectés (inactifs depuis 5s)
  for (const name in positions[gameId]) {
    if (now - positions[gameId][name].lastUpdate > 5000) {
      delete positions[gameId][name];
    }
  }

  res.json({
    success: true,
    playerCount: Object.keys(positions[gameId]).length
  });
});

// Liste des jeux configurés (pour le menu déroulant du frontend)
app.get('/api/games', (req, res) => {
  const games = Object.entries(config.games).map(([id, game]) => ({
    id,
    name: game.name,
    proximityRadius: game.proximityRadius
  }));
  res.json(games);
});

// Statut du serveur (utile pour vérifier que tout tourne)
app.get('/api/status', (req, res) => {
  const stats = {};
  for (const gameId in webUsers) {
    stats[gameId] = {
      name: config.games[gameId]?.name || gameId,
      webPlayers: Object.keys(webUsers[gameId] || {}).length,
      robloxPlayers: Object.keys(positions[gameId] || {}).length
    };
  }
  res.json({ status: 'ok', games: stats });
});

// ================================================
//  SOCKET.IO — COMMUNICATION AVEC LE FRONTEND
// ================================================

// Distance 3D entre deux joueurs
function getDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
}

// Volume (0.0 → 1.0) selon la distance
function getVolume(distance, radius) {
  if (distance >= radius) return 0;
  // Courbe logarithmique pour un rendu plus naturel
  const ratio = distance / radius;
  return parseFloat(Math.max(0, 1 - Math.pow(ratio, 0.6)).toFixed(2));
}

io.on('connection', (socket) => {
  console.log(`[+] Connexion socket : ${socket.id}`);

  let currentUser = null;
  let currentGame = null;

  // --- Connexion d'un joueur au chat ---
  socket.on('join', ({ playerName, gameId }) => {
    const game = config.games[gameId];
    if (!game) {
      socket.emit('error', { message: 'Jeu introuvable. Vérifie la configuration.' });
      return;
    }

    currentUser = playerName;
    currentGame = gameId;

    if (!webUsers[gameId]) webUsers[gameId] = {};
    webUsers[gameId][playerName] = { socketId: socket.id };

    socket.join(`game_${gameId}`);

    socket.emit('joined', {
      playerName,
      gameName: game.name,
      proximityRadius: game.proximityRadius
    });

    console.log(`[JOIN] ${playerName} → ${game.name}`);
  });

  // --- Signaling WebRTC : Offre ---
  socket.on('webrtc-offer', ({ targetPlayer, offer }) => {
    const target = webUsers[currentGame]?.[targetPlayer];
    if (target) {
      io.to(target.socketId).emit('webrtc-offer', {
        fromPlayer: currentUser,
        offer
      });
    }
  });

  // --- Signaling WebRTC : Réponse ---
  socket.on('webrtc-answer', ({ targetPlayer, answer }) => {
    const target = webUsers[currentGame]?.[targetPlayer];
    if (target) {
      io.to(target.socketId).emit('webrtc-answer', {
        fromPlayer: currentUser,
        answer
      });
    }
  });

  // --- Signaling WebRTC : Candidat ICE ---
  socket.on('webrtc-ice', ({ targetPlayer, candidate }) => {
    const target = webUsers[currentGame]?.[targetPlayer];
    if (target) {
      io.to(target.socketId).emit('webrtc-ice', {
        fromPlayer: currentUser,
        candidate
      });
    }
  });

  // --- Déconnexion ---
  socket.on('disconnect', () => {
    if (currentUser && currentGame) {
      delete webUsers[currentGame]?.[currentUser];
      io.to(`game_${currentGame}`).emit('player-disconnected', {
        playerName: currentUser
      });
      console.log(`[-] ${currentUser} déconnecté`);
    }
  });
});

// ================================================
//  BOUCLE DE PROXIMITÉ (toutes les 500ms)
// ================================================

setInterval(() => {
  for (const gameId in webUsers) {
    const game = config.games[gameId];
    if (!game) continue;

    const gamePos  = positions[gameId] || {};
    const gameWeb  = webUsers[gameId]  || {};
    const players  = Object.keys(gameWeb);

    players.forEach(playerName => {
      const playerPos    = gamePos[playerName];
      const playerSocket = gameWeb[playerName]?.socketId;
      if (!playerPos || !playerSocket) return;

      const nearbyPlayers = [];

      players.forEach(otherName => {
        if (otherName === playerName) return;
        const otherPos = gamePos[otherName];
        if (!otherPos) return;

        const distance = getDistance(playerPos, otherPos);
        if (distance <= game.proximityRadius) {
          nearbyPlayers.push({
            name:     otherName,
            distance: Math.round(distance),
            volume:   getVolume(distance, game.proximityRadius)
          });
        }
      });

      // Trier par distance croissante
      nearbyPlayers.sort((a, b) => a.distance - b.distance);

      io.to(playerSocket).emit('nearby-players', { players: nearbyPlayers });
    });
  }
}, 500);

// ================================================
//  DÉMARRAGE
// ================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎙️  CHATVOCAL — W&N PRODUCTION`);
  console.log(`🚀  Serveur actif sur le port ${PORT}`);
  console.log(`🎮  ${Object.keys(config.games).length} jeu(x) configuré(s)`);
  console.log(`🌐  http://localhost:${PORT}\n`);
});
