// ================================================
//  CHATVOCAL - W&N PRODUCTION
//  Frontend : Socket.io + WebRTC + Audio spatial
// ================================================

const socket = io();

// ---- État global ----
let playerName    = '';
let gameId        = '';
let localStream   = null;
let micEnabled    = true;
const peers       = {};         // { playerName: RTCPeerConnection }
const audioEls    = {};         // { playerName: HTMLAudioElement }
let currentNearby = new Set();

// ---- Config WebRTC (STUN Google public) ----
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// ================================================
//  INITIALISATION
// ================================================

async function loadGames() {
  try {
    const res   = await fetch('/api/games');
    const games = await res.json();
    const sel   = document.getElementById('game-select');

    if (games.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'Aucun jeu configuré';
      opt.disabled = true;
      sel.appendChild(opt);
      return;
    }

    games.forEach(game => {
      const opt    = document.createElement('option');
      opt.value    = game.id;
      opt.textContent = game.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    showError('Impossible de contacter le serveur.');
  }
}

// ================================================
//  CONNEXION / DÉCONNEXION
// ================================================

async function connect() {
  const nameInput = document.getElementById('player-name');
  const gameInput = document.getElementById('game-select');

  playerName = nameInput.value.trim();
  gameId     = gameInput.value;

  clearError();

  if (!playerName) {
    showError('Entre ton nom Roblox.');
    nameInput.focus();
    return;
  }
  if (!gameId) {
    showError('Sélectionne un jeu.');
    return;
  }

  setConnectBtnState('loading');

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    setConnectBtnState('idle');
    if (err.name === 'NotAllowedError') {
      showError('Microphone refusé. Autorise l\'accès dans ton navigateur.');
    } else {
      showError('Impossible d\'accéder au microphone : ' + err.message);
    }
    return;
  }

  socket.emit('join', { playerName, gameId });
}

function disconnect() {
  // Fermer tous les peers
  Object.keys(peers).forEach(removePeer);
  // Couper le micro
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  currentNearby.clear();
  socket.emit('leave');
  showScreen('login');
}

// ================================================
//  INTERFACE
// ================================================

function showScreen(name) {
  document.getElementById('login-screen').style.display = name === 'login' ? 'flex' : 'none';
  document.getElementById('app-screen').style.display   = name === 'app'   ? 'flex' : 'none';
}

function setConnectBtnState(state) {
  const btn = document.getElementById('connect-btn');
  if (state === 'loading') {
    btn.disabled     = true;
    btn.textContent  = 'Connexion…';
  } else {
    btn.disabled     = false;
    btn.textContent  = 'SE CONNECTER';
  }
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
}

function clearError() {
  document.getElementById('error-msg').textContent = '';
}

function toggleMic() {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);

  const btn  = document.getElementById('mic-btn');
  const icon = document.getElementById('mic-icon');
  const txt  = document.getElementById('mic-text');

  btn.classList.toggle('muted', !micEnabled);
  icon.textContent = micEnabled ? '🎙️' : '🔇';
  txt.textContent  = micEnabled ? 'MICRO ACTIF' : 'MICRO COUPÉ';
}

function updateNearbyList(players) {
  const list     = document.getElementById('nearby-list');
  const empty    = document.getElementById('empty-msg');
  const countEl  = document.getElementById('nearby-count');

  countEl.textContent = players.length;
  list.innerHTML = '';

  if (players.length === 0) {
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  players.forEach(p => {
    const pct  = Math.round(p.volume * 100);
    const item = document.createElement('div');
    item.className = 'player-item';
    item.id = `player-${p.name}`;
    item.innerHTML = `
      <div class="player-left">
        <div class="player-avatar">${p.name.charAt(0).toUpperCase()}</div>
        <div class="player-details">
          <span class="player-name-text">${escapeHtml(p.name)}</span>
          <span class="player-dist">${p.distance} unités</span>
        </div>
      </div>
      <div class="player-right">
        <div class="vol-bar-wrap">
          <div class="vol-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="vol-label">${pct}%</span>
      </div>
    `;
    list.appendChild(item);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ================================================
//  WEBRTC
// ================================================

function createPeer(targetPlayer, isInitiator) {
  if (peers[targetPlayer]) return;

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peers[targetPlayer] = pc;

  // Ajouter notre stream audio local
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  // Recevoir le stream audio distant
  pc.ontrack = (event) => {
    if (!audioEls[targetPlayer]) {
      const audio        = new Audio();
      audio.autoplay     = true;
      audio.srcObject    = event.streams[0];
      document.body.appendChild(audio);
      audioEls[targetPlayer] = audio;
    }
  };

  // Envoyer les candidats ICE via socket
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-ice', { targetPlayer, candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] ${targetPlayer} : ${pc.connectionState}`);
  };

  // L'initiateur crée l'offre
  if (isInitiator) {
    pc.createOffer()
      .then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { targetPlayer, offer });
      })
      .catch(err => console.error('[WebRTC] Erreur offre :', err));
  }
}

function removePeer(targetPlayer) {
  if (peers[targetPlayer]) {
    peers[targetPlayer].close();
    delete peers[targetPlayer];
  }
  if (audioEls[targetPlayer]) {
    audioEls[targetPlayer].pause();
    audioEls[targetPlayer].remove();
    delete audioEls[targetPlayer];
  }
}

// ================================================
//  SOCKET.IO — ÉVÉNEMENTS
// ================================================

socket.on('joined', ({ gameName }) => {
  document.getElementById('current-player').textContent = playerName;
  document.getElementById('current-game').textContent   = gameName;
  showScreen('app');
  setConnectBtnState('idle');
});

socket.on('nearby-players', ({ players }) => {
  const newNearby = new Set(players.map(p => p.name));

  // Déconnecter les joueurs qui s'éloignent
  currentNearby.forEach(name => {
    if (!newNearby.has(name)) removePeer(name);
  });

  // Connecter les nouveaux joueurs proches
  players.forEach(p => {
    if (!currentNearby.has(p.name)) {
      // Convention : le nom alphabétiquement inférieur initie la connexion
      // → évite que les deux créent une offre simultanément
      const isInitiator = playerName < p.name;
      createPeer(p.name, isInitiator);
    }

    // Ajuster le volume en temps réel
    if (audioEls[p.name]) {
      audioEls[p.name].volume = p.volume;
    }
  });

  currentNearby = newNearby;
  updateNearbyList(players);
});

// Signaling WebRTC reçu
socket.on('webrtc-offer', async ({ fromPlayer, offer }) => {
  if (!peers[fromPlayer]) createPeer(fromPlayer, false);
  const pc = peers[fromPlayer];
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc-answer', { targetPlayer: fromPlayer, answer });
  } catch (e) {
    console.error('[WebRTC] Erreur réponse :', e);
  }
});

socket.on('webrtc-answer', async ({ fromPlayer, answer }) => {
  const pc = peers[fromPlayer];
  if (pc) {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      console.error('[WebRTC] Erreur answer :', e);
    }
  }
});

socket.on('webrtc-ice', async ({ fromPlayer, candidate }) => {
  const pc = peers[fromPlayer];
  if (pc && candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[WebRTC] Erreur ICE :', e);
    }
  }
});

socket.on('player-disconnected', ({ playerName: name }) => {
  removePeer(name);
  currentNearby.delete(name);
  updateNearbyList([...currentNearby].map(n => ({ name: n, distance: 0, volume: 0 })));
});

socket.on('error', ({ message }) => {
  showError(message);
  setConnectBtnState('idle');
});

socket.on('disconnect', () => {
  Object.keys(peers).forEach(removePeer);
  currentNearby.clear();
});

// ================================================
//  TOUCHES CLAVIER
// ================================================

document.addEventListener('keydown', (e) => {
  // Entrée sur l'écran de login
  if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') {
    connect();
  }
  // M pour toggle micro
  if (e.key === 'm' || e.key === 'M') {
    if (document.getElementById('app-screen').style.display !== 'none') {
      toggleMic();
    }
  }
});

// ================================================
//  DÉMARRAGE
// ================================================

loadGames();
