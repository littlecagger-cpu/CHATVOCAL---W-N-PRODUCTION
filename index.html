// ================================================
//  CHATVOCAL - W&N PRODUCTION v3
//  Frontend : Vérification code + Socket.io + WebRTC
// ================================================

const socket = io();

// ---- État global ----
let playerName    = '';
let sessionToken  = '';
let gameId        = '';
let localStream   = null;
let micEnabled    = true;
let pollInterval  = null;
let currentCode   = '';
const peers       = {};
const audioEls    = {};
let currentNearby = new Set();

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// ================================================
//  INITIALISATION
// ================================================

async function init() {
  await loadGames();

  // Vérifier session sauvegardée
  const savedToken = localStorage.getItem('chatvocal_session');
  const savedName  = localStorage.getItem('chatvocal_name');
  if (savedToken && savedName) {
    try {
      const res = await fetch(`/auth/session?token=${savedToken}`);
      if (res.ok) {
        const data = await res.json();
        sessionToken = savedToken;
        playerName   = data.playerName;
        showVerifiedState(playerName);
        return;
      }
    } catch (e) {}
    localStorage.removeItem('chatvocal_session');
    localStorage.removeItem('chatvocal_name');
  }
}

// ================================================
//  ÉCRANS DE CONNEXION
// ================================================

// Écran 1 : Saisie du nom
function showNameScreen() {
  document.getElementById('screen-name').style.display    = 'block';
  document.getElementById('screen-code').style.display    = 'none';
  document.getElementById('screen-verified').style.display = 'none';
  stopPolling();
}

// Écran 2 : Affichage du code
function showCodeScreen(code) {
  document.getElementById('screen-name').style.display    = 'none';
  document.getElementById('screen-code').style.display    = 'block';
  document.getElementById('screen-verified').style.display = 'none';
  document.getElementById('code-display').textContent     = code;
  document.getElementById('code-player-name').textContent = playerName;
  startCodeTimer(300);
  startPolling(code);
}

// Écran 3 : Vérifié
function showVerifiedState(name) {
  document.getElementById('screen-name').style.display    = 'none';
  document.getElementById('screen-code').style.display    = 'none';
  document.getElementById('screen-verified').style.display = 'block';
  document.getElementById('verified-name').textContent    = name;
  document.getElementById('verified-avatar').textContent  = name.charAt(0).toUpperCase();
  playerName = name;
  stopPolling();
}

// ================================================
//  DEMANDE DE CODE
// ================================================

async function requestCode() {
  const input = document.getElementById('player-name');
  playerName  = input.value.trim();
  clearError();

  if (!playerName) { showError('Entre ton nom Roblox exact.'); return; }

  const btn = document.getElementById('code-btn');
  btn.disabled    = true;
  btn.textContent = 'Génération…';

  try {
    const res  = await fetch(`/auth/request-code?playerName=${encodeURIComponent(playerName)}`);
    const data = await res.json();
    if (data.code) {
      currentCode = data.code;
      showCodeScreen(data.code);
    } else {
      showError(data.error || 'Erreur serveur.');
    }
  } catch (e) {
    showError('Impossible de contacter le serveur.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'OBTENIR MON CODE';
  }
}

// ================================================
//  POLLING — ATTENTE DE VÉRIFICATION
// ================================================

function startPolling(code) {
  stopPolling();
  pollInterval = setInterval(async () => {
    try {
      const res  = await fetch(`/auth/check-verification?playerName=${encodeURIComponent(playerName)}&code=${code}`);
      const data = await res.json();

      if (data.expired) {
        stopPolling();
        showCodeExpired();
        return;
      }

      if (data.verified && data.sessionToken) {
        stopPolling();
        sessionToken = data.sessionToken;
        localStorage.setItem('chatvocal_session', sessionToken);
        localStorage.setItem('chatvocal_name', playerName);
        showVerifiedState(playerName);
      }
    } catch (e) {}
  }, 2000);
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

// ================================================
//  TIMER DU CODE
// ================================================

let timerInterval = null;

function startCodeTimer(seconds) {
  if (timerInterval) clearInterval(timerInterval);
  let remaining = seconds;
  updateTimer(remaining);
  timerInterval = setInterval(() => {
    remaining--;
    updateTimer(remaining);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      showCodeExpired();
    }
  }, 1000);
}

function updateTimer(s) {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  const el  = document.getElementById('code-timer');
  if (el) el.textContent = `Expire dans ${min}:${sec.toString().padStart(2,'0')}`;
}

function showCodeExpired() {
  const el = document.getElementById('code-timer');
  if (el) el.textContent = '❌ Code expiré';
  const btn = document.getElementById('retry-btn');
  if (btn) btn.style.display = 'block';
  stopPolling();
}

// ================================================
//  CONNEXION AU CHAT
// ================================================

async function connect() {
  gameId = document.getElementById('game-select').value;
  clearError();

  if (!sessionToken) { showError('Vérifie d\'abord ton compte.'); return; }
  if (!gameId)       { showError('Sélectionne un jeu.'); return; }

  setConnectBtn(true);

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    setConnectBtn(false);
    showError(err.name === 'NotAllowedError'
      ? 'Micro refusé. Autorise l\'accès dans le navigateur.'
      : 'Impossible d\'accéder au microphone.');
    return;
  }

  socket.emit('join', { sessionToken, gameId });
}

function disconnect() {
  Object.keys(peers).forEach(removePeer);
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  currentNearby.clear();
  showScreen('login');
}

function changeAccount() {
  localStorage.removeItem('chatvocal_session');
  localStorage.removeItem('chatvocal_name');
  sessionToken = '';
  playerName   = '';
  showNameScreen();
}

// ================================================
//  INTERFACE
// ================================================

function showScreen(name) {
  document.getElementById('login-screen').style.display = name === 'login' ? 'flex' : 'none';
  document.getElementById('app-screen').style.display   = name === 'app'   ? 'flex' : 'none';
}

function setConnectBtn(loading) {
  const btn = document.getElementById('connect-btn');
  btn.disabled    = loading;
  btn.textContent = loading ? 'Connexion…' : 'ENTRER DANS LE CHAT';
}

function showError(msg) { document.getElementById('error-msg').textContent = msg; }
function clearError()   { document.getElementById('error-msg').textContent = ''; }

function toggleMic() {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
  const btn = document.getElementById('mic-btn');
  btn.classList.toggle('muted', !micEnabled);
  document.getElementById('mic-icon').textContent = micEnabled ? '🎙️' : '🔇';
  document.getElementById('mic-text').textContent = micEnabled ? 'MICRO ACTIF' : 'MICRO COUPÉ';
}

function updateNearbyList(players) {
  document.getElementById('nearby-count').textContent = players.length;
  const list  = document.getElementById('nearby-list');
  const empty = document.getElementById('empty-msg');
  list.innerHTML = '';

  if (players.length === 0) { empty.style.display = 'flex'; return; }
  empty.style.display = 'none';

  players.forEach(p => {
    const pct  = Math.round(p.volume * 100);
    const item = document.createElement('div');
    item.className = 'player-item';
    item.innerHTML = `
      <div class="player-left">
        <div class="player-avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</div>
        <div class="player-details">
          <span class="player-name-text">${escapeHtml(p.name)}</span>
          <span class="player-dist">${p.distance} unités</span>
        </div>
      </div>
      <div class="player-right">
        <div class="vol-bar-wrap"><div class="vol-bar-fill" style="width:${pct}%"></div></div>
        <span class="vol-label">${pct}%</span>
      </div>`;
    list.appendChild(item);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadGames() {
  try {
    const games = await (await fetch('/api/games')).json();
    const sel   = document.getElementById('game-select');
    games.forEach(g => {
      const o = document.createElement('option');
      o.value = g.id; o.textContent = g.name;
      sel.appendChild(o);
    });
  } catch (e) {}
}

// ================================================
//  WEBRTC
// ================================================

function createPeer(targetPlayer, isInitiator) {
  if (peers[targetPlayer]) return;
  const pc = new RTCPeerConnection(RTC_CONFIG);
  peers[targetPlayer] = pc;

  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = (e) => {
    if (!audioEls[targetPlayer]) {
      const a = new Audio();
      a.autoplay = true; a.srcObject = e.streams[0];
      document.body.appendChild(a);
      audioEls[targetPlayer] = a;
    }
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit('webrtc-ice', { targetPlayer, candidate: e.candidate });
  };

  if (isInitiator) {
    pc.createOffer().then(o => { pc.setLocalDescription(o); socket.emit('webrtc-offer', { targetPlayer, offer: o }); });
  }
}

function removePeer(n) {
  if (peers[n])   { peers[n].close(); delete peers[n]; }
  if (audioEls[n]) { audioEls[n].remove(); delete audioEls[n]; }
}

// ================================================
//  SOCKET.IO
// ================================================

socket.on('joined', ({ playerName: name, gameName }) => {
  document.getElementById('current-player').textContent = name;
  document.getElementById('current-game').textContent   = gameName;
  showScreen('app');
  setConnectBtn(false);
});

socket.on('nearby-players', ({ players }) => {
  const newNearby = new Set(players.map(p => p.name));
  currentNearby.forEach(n => { if (!newNearby.has(n)) removePeer(n); });
  players.forEach(p => {
    if (!currentNearby.has(p.name)) createPeer(p.name, playerName < p.name);
    if (audioEls[p.name]) audioEls[p.name].volume = p.volume;
  });
  currentNearby = newNearby;
  updateNearbyList(players);
});

socket.on('webrtc-offer', async ({ fromPlayer, offer }) => {
  if (!peers[fromPlayer]) createPeer(fromPlayer, false);
  const pc = peers[fromPlayer];
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('webrtc-answer', { targetPlayer: fromPlayer, answer });
});

socket.on('webrtc-answer', async ({ fromPlayer, answer }) => {
  if (peers[fromPlayer]) await peers[fromPlayer].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('webrtc-ice', async ({ fromPlayer, candidate }) => {
  if (peers[fromPlayer] && candidate) await peers[fromPlayer].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('player-disconnected', ({ playerName: n }) => { removePeer(n); currentNearby.delete(n); });
socket.on('error', ({ message }) => { showError(message); setConnectBtn(false); });

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const nameScreen = document.getElementById('screen-name');
    if (nameScreen?.style.display !== 'none') requestCode();
  }
  if ((e.key==='m'||e.key==='M') && document.getElementById('app-screen').style.display !== 'none') toggleMic();
});

init();
