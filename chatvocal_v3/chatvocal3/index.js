// ================================================
//  CHATVOCAL - W&N PRODUCTION v3
//  Vérification par code /verify
// ================================================

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const crypto     = require('crypto');
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

const positions = {};
const webUsers  = {};
const sessions  = {};

// pendingVerifications[playerName_lowercase] = { code, originalName, verified, sessionToken, expiresAt }
const pendingVerifications = {};

// Nettoyage toutes les minutes
setInterval(() => {
  const now = Date.now();
  for (const k in sessions)             { if (now - sessions[k].createdAt > 24*60*60*1000) delete sessions[k]; }
  for (const k in pendingVerifications) { if (now > pendingVerifications[k].expiresAt)      delete pendingVerifications[k]; }
}, 60 * 1000);

// ================================================
//  VÉRIFICATION PAR CODE
// ================================================

// 1. Le site demande un code pour un joueur
app.get('/auth/request-code', (req, res) => {
  const { playerName } = req.query;
  if (!playerName || playerName.trim() === '') {
    return res.status(400).json({ error: 'Nom de joueur requis.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const key  = playerName.trim().toLowerCase();

  pendingVerifications[key] = {
    code,
    originalName: playerName.trim(),
    verified:     false,
    sessionToken: null,
    expiresAt:    Date.now() + 5 * 60 * 1000  // expire dans 5 minutes
  };

  console.log(`[CODE] Code généré pour ${playerName} : ${code}`);
  res.json({ code, expiresIn: 300 });
});

// 2. Le site poll ce endpoint pour savoir si le joueur a tapé /verify
app.get('/auth/check-verification', (req, res) => {
  const { playerName, code } = req.query;
  const key     = playerName?.trim().toLowerCase();
  const pending = pendingVerifications[key];

  if (!pending || pending.code !== code) {
    return res.status(404).json({ verified: false });
  }
  if (Date.now() > pending.expiresAt) {
    delete pendingVerifications[key];
    return res.status(410).json({ verified: false, expired: true });
  }
  if (!pending.verified) {
    return res.json({ verified: false });
  }

  // Vérifié !
  res.json({ verified: true, sessionToken: pending.sessionToken });
});

// 3. Roblox envoie la vérification quand le joueur tape /verify CODE
app.post('/api/verify', (req, res) => {
  const { playerName, code, gameId, apiKey } = req.body;

  const game = config.games[gameId];
  if (!game)                                 return res.status(404).json({ error: 'Jeu introuvable.' });
  if (game.apiKey && game.apiKey !== apiKey) return res.status(401).json({ error: 'Clé API invalide.' });

  const key     = playerName?.trim().toLowerCase();
  const pending = pendingVerifications[key];

  if (!pending)                       return res.status(404).json({ error: 'Aucun code en attente pour ce joueur.' });
  if (pending.code !== code)          return res.status(400).json({ error: 'Code incorrect.' });
  if (Date.now() > pending.expiresAt) return res.status(410).json({ error: 'Code expiré.' });

  // Créer la session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  sessions[sessionToken] = { playerName: pending.originalName, createdAt: Date.now() };

  pending.verified     = true;
  pending.sessionToken = sessionToken;

  console.log(`[VERIFY] ✅ ${playerName} vérifié`);
  res.json({ success: true });
});

// Validation d'une session (utilisé par le frontend au chargement)
app.get('/auth/session', (req, res) => {
  const session = sessions[req.query.token];
  if (!session) return res.status(401).json({ error: 'Session invalide ou expirée.' });
  res.json({ playerName: session.playerName });
});

// ================================================
//  API ROBLOX — POSITIONS
// ================================================

app.post('/api/positions', (req, res) => {
  const { gameId, apiKey, players } = req.body;

  const game = config.games[gameId];
  if (!game)                                 return res.status(404).json({ error: 'Jeu introuvable.' });
  if (game.apiKey && game.apiKey !== apiKey) return res.status(401).json({ error: 'Clé API invalide.' });
  if (!Array.isArray(players))               return res.status(400).json({ error: 'Format invalide.' });

  if (!positions[gameId]) positions[gameId] = {};
  const now = Date.now();

  players.forEach(({ name, x, y, z }) => {
    if (typeof name === 'string') positions[gameId][name] = { x, y, z, lastUpdate: now };
  });

  for (const name in positions[gameId]) {
    if (now - positions[gameId][name].lastUpdate > 5000) delete positions[gameId][name];
  }

  res.json({ success: true });
});

app.get('/api/games',  (req, res) => res.json(Object.entries(config.games).map(([id, g]) => ({ id, name: g.name, proximityRadius: g.proximityRadius }))));
app.get('/api/status', (req, res) => res.json({ status: 'ok', players: Object.keys(webUsers).reduce((a, g) => { a[g] = Object.keys(webUsers[g]||{}).length; return a; }, {}) }));

// ================================================
//  SOCKET.IO
// ================================================

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2) + Math.pow(p1.z-p2.z,2));
}
function getVolume(distance, radius) {
  if (distance >= radius) return 0;
  return parseFloat(Math.max(0, 1 - Math.pow(distance / radius, 0.6)).toFixed(2));
}

io.on('connection', (socket) => {
  let currentUser = null;
  let currentGame = null;

  socket.on('join', ({ sessionToken, gameId }) => {
    const session = sessions[sessionToken];
    if (!session) { socket.emit('error', { message: 'Session invalide. Vérifie à nouveau ton compte.' }); return; }

    const game = config.games[gameId];
    if (!game)    { socket.emit('error', { message: 'Jeu introuvable.' }); return; }

    currentUser = session.playerName;
    currentGame = gameId;

    if (!webUsers[gameId]) webUsers[gameId] = {};
    webUsers[gameId][currentUser] = { socketId: socket.id };

    socket.join(`game_${gameId}`);
    socket.emit('joined', { playerName: currentUser, gameName: game.name });
    console.log(`[JOIN] ${currentUser} → ${game.name}`);
  });

  socket.on('webrtc-offer',  ({ targetPlayer, offer })     => { const t = webUsers[currentGame]?.[targetPlayer]; if (t) io.to(t.socketId).emit('webrtc-offer',  { fromPlayer: currentUser, offer }); });
  socket.on('webrtc-answer', ({ targetPlayer, answer })    => { const t = webUsers[currentGame]?.[targetPlayer]; if (t) io.to(t.socketId).emit('webrtc-answer', { fromPlayer: currentUser, answer }); });
  socket.on('webrtc-ice',    ({ targetPlayer, candidate }) => { const t = webUsers[currentGame]?.[targetPlayer]; if (t) io.to(t.socketId).emit('webrtc-ice',    { fromPlayer: currentUser, candidate }); });

  socket.on('disconnect', () => {
    if (currentUser && currentGame) {
      delete webUsers[currentGame]?.[currentUser];
      io.to(`game_${currentGame}`).emit('player-disconnected', { playerName: currentUser });
    }
  });
});

// ================================================
//  BOUCLE DE PROXIMITÉ (500ms)
// ================================================

setInterval(() => {
  for (const gameId in webUsers) {
    const game    = config.games[gameId]; if (!game) continue;
    const gamePos = positions[gameId] || {};
    const gameWeb = webUsers[gameId]  || {};
    const players = Object.keys(gameWeb);

    players.forEach(playerName => {
      const playerPos    = gamePos[playerName];
      const playerSocket = gameWeb[playerName]?.socketId;
      if (!playerPos || !playerSocket) return;

      const nearby = players
        .filter(n => n !== playerName && gamePos[n])
        .map(n => ({ name: n, distance: getDistance(playerPos, gamePos[n]) }))
        .filter(p => p.distance <= game.proximityRadius)
        .map(p => ({ name: p.name, distance: Math.round(p.distance), volume: getVolume(p.distance, game.proximityRadius) }))
        .sort((a, b) => a.distance - b.distance);

      io.to(playerSocket).emit('nearby-players', { players: nearby });
    });
  }
}, 500);

// ================================================
//  DÉMARRAGE
// ================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎙️  CHATVOCAL — W&N PRODUCTION v3`);
  console.log(`🚀  Port ${PORT}`);
  console.log(`🔐  Vérification par code /verify`);
  console.log(`🎮  ${Object.keys(config.games).length} jeu(x)\n`);
});
