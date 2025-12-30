// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, update, remove, push, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyBJ7tJy_oSH7TPwyMHFP4Tq37_mQkscpHg",
  authDomain: "hack-battle.firebaseapp.com",
  databaseURL: "https://hack-battle-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "hack-battle",
  storageBucket: "hack-battle.firebasestorage.app",
  messagingSenderId: "422575576978",
  appId: "1:422575576978:web:e5ab8d71a270087c98934b",
  measurementId: "G-XGCWLRWT8Q"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Global Variables
let currentUser = '';
let currentRoomCode = '';
let currentStep = 1;
let generatedIP = '';
let startTime = 0;
let selectedAddons = [];
let blockTimer = null;

const PARENTWORKS = {
  googledd: 'google.com',
  vercel: 'vercel.com',
  cloudflare: 'domain',
  ngrok: 'http://',
  rizzglo: 'mismatch'
};

const STEP_INSTRUCTIONS = {
  1: `<strong>TAHAP 1: Kenali Parentwork</strong><br><br>
Taip command berikut di terminal:<br>
<code>Parentwork = [nama_parentwork]<br>
Url = [url_target]<br>
Find.ip.url.parent().</code><br><br>
Gantikan [nama_parentwork] dan [url_target] dengan info target.`,
  
  2: `<strong>TAHAP 2: Pilih Addon (Opsional)</strong><br><br>
Anda boleh pilih addon untuk menyerang lawan:<br>
- 🚫 <strong>Kill Air:</strong> Block lawan 10 saat<br>
- 🔄 <strong>Change PW:</strong> Tukar parentwork lawan<br>
- 💥 <strong>DDOS:</strong> Reset progress lawan<br><br>
Taip di terminal:<br>
<code>Addon = [nama_addon]<br>
Install.addon()</code><br><br>
Atau skip dengan taip: <code>Skip</code>`,
  
  3: `<strong>TAHAP 3: Serang Website</strong><br><br>
Taip command attack di terminal:<br>
<code>Rules = down<br>
Ip = [ip_yang_dijana]<br>
Parentwork = [parentwork_target]<br>
Addon = [addon_terpasang]<br><br>
Choose.rules_in.ip_pw.parentwork()<br>
Start all()<br>
Started addon</code><br><br>
Gantikan nilai dalam [ ] dengan info yang betul.`,
  
  4: `<strong>TAHAP 4: Menang!</strong><br><br>
Anda telah berjaya menembusi website target!<br>
Tunggu keputusan perlumbaan...`
};

// Navigation Functions
window.showHome = function() {
  showScreen('homeScreen');
  currentRoomCode = '';
  currentStep = 1;
};

window.showCreateRoom = function() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) {
    alert('Sila masukkan username!');
    return;
  }
  currentUser = username;
  showScreen('createRoomScreen');
};

window.showJoinRoom = function() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) {
    alert('Sila masukkan username!');
    return;
  }
  currentUser = username;
  showScreen('joinRoomScreen');
};

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// Room Functions
window.createRoom = async function() {
  const targetPw = document.getElementById('targetParentwork').value;
  const targetUrl = document.getElementById('targetUrl').value.trim();
  
  if (!targetUrl) {
    alert('Sila masukkan target URL!');
    return;
  }
  
  const roomCode = generateRoomCode();
  currentRoomCode = roomCode;
  
  const roomData = {
    host: currentUser,
    targetParentwork: targetPw,
    targetUrl: targetUrl,
    status: 'waiting',
    createdAt: Date.now(),
    winner: null,
    players: {
      [currentUser]: {
        name: currentUser,
        step: 1,
        isHost: true,
        completed: false,
        blocked: false,
        addons: [],
        ip: '',
        finishTime: 0
      }
    }
  };
  
  await set(ref(database, `rooms/${roomCode}`), roomData);
  showLobby(roomCode);
};

window.joinRoom = async function() {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  
  if (!roomCode) {
    alert('Sila masukkan room code!');
    return;
  }
  
  const roomRef = ref(database, `rooms/${roomCode}`);
  const snapshot = await get(roomRef);
  
  if (!snapshot.exists()) {
    alert('Room tidak wujud!');
    return;
  }
  
  const roomData = snapshot.val();
  if (roomData.status !== 'waiting') {
    alert('Game sudah bermula!');
    return;
  }
  
  currentRoomCode = roomCode;
  
  await update(ref(database, `rooms/${roomCode}/players/${currentUser}`), {
    name: currentUser,
    step: 1,
    isHost: false,
    completed: false,
    blocked: false,
    addons: [],
    ip: '',
    finishTime: 0
  });
  
  showLobby(roomCode);
};

function showLobby(roomCode) {
  showScreen('lobbyScreen');
  document.getElementById('currentRoomCode').textContent = roomCode;
  
  const roomRef = ref(database, `rooms/${roomCode}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    document.getElementById('lobbyTarget').textContent = data.targetUrl;
    document.getElementById('lobbyParentwork').textContent = data.targetParentwork;
    
    updatePlayersList(data.players);
    
    if (data.host === currentUser) {
      document.getElementById('startGameBtn').style.display = 'block';
    }
    
    if (data.status === 'playing') {
      startGameScreen(data);
    }
    
    if (data.status === 'finished') {
      showWinnerScreen(data);
    }
  });
}

function updatePlayersList(players) {
  const list = document.getElementById('playersList');
  list.innerHTML = '';
  
  Object.values(players).forEach(player => {
    const div = document.createElement('div');
    div.className = `player-item ${player.isHost ? 'host' : ''}`;
    div.innerHTML = `
      <span>${player.isHost ? '👑 ' : ''}${player.name}</span>
      <span>Tahap ${player.step}/4</span>
    `;
    list.appendChild(div);
  });
}

window.startGame = async function() {
  await update(ref(database, `rooms/${currentRoomCode}`), {
    status: 'playing',
    startTime: Date.now()
  });
};

window.leaveRoom = async function() {
  if (currentRoomCode) {
    await remove(ref(database, `rooms/${currentRoomCode}/players/${currentUser}`));
    showHome();
  }
};

// Game Functions
function startGameScreen(roomData) {
  showScreen('gameScreen');
  startTime = roomData.startTime;
  
  document.getElementById('gameRoomCode').textContent = currentRoomCode;
  document.getElementById('gameUsername').textContent = currentUser;
  document.getElementById('gameTargetUrl').textContent = roomData.targetUrl;
  document.getElementById('gameTargetPw').textContent = roomData.targetParentwork;
  
  updateInstructions();
  setupRealtimeListeners();
}

function setupRealtimeListeners() {
  const roomRef = ref(database, `rooms/${currentRoomCode}`);
  
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    updateLeaderboard(data.players);
    
    const myPlayer = data.players[currentUser];
    if (myPlayer) {
      currentStep = myPlayer.step;
      document.getElementById('currentStep').textContent = currentStep;
      
      if (myPlayer.blocked && !blockTimer) {
        startBlockTimer(10);
      }
      
      if (myPlayer.ip) {
        generatedIP = myPlayer.ip;
        document.getElementById('gameIpDisplay').style.display = 'block';
        document.getElementById('gameIp').textContent = generatedIP;
      }
      
      if (myPlayer.addons && myPlayer.addons.length > 0) {
        document.getElementById('addonsPanel').style.display = 'block';
      }
    }
    
    if (data.status === 'finished') {
      showWinnerScreen(data);
    }
  });
}

function updateInstructions() {
  document.getElementById('instructionsPanel').innerHTML = STEP_INSTRUCTIONS[currentStep] || '';
}

function updateLeaderboard(players) {
  const leaderboard = document.getElementById('leaderboard');
  leaderboard.innerHTML = '';
  
  const sortedPlayers = Object.values(players).sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    if (a.completed && b.completed) return a.finishTime - b.finishTime;
    return b.step - a.step;
  });
  
  sortedPlayers.forEach((player, index) => {
    const div = document.createElement('div');
    div.className = `leaderboard-item ${player.completed ? 'winner' : ''}`;
    div.innerHTML = `
      <div>
        <span class="rank">#${index + 1}</span>
        <strong>${player.name}</strong>
      </div>
      <div>Tahap ${player.step}/4</div>
    `;
    leaderboard.appendChild(div);
  });
}

// Terminal Functions
window.executeCommand = async function() {
  const terminalInput = document.getElementById('terminalInput');
  const command = terminalInput.value.trim();
  
  const myPlayerRef = ref(database, `rooms/${currentRoomCode}/players/${currentUser}`);
  const snapshot = await get(myPlayerRef);
  const myPlayer = snapshot.val();
  
  if (myPlayer.blocked) {
    addTerminalOutput('❌ Anda diblock! Tunggu sehingga block tamat.', 'error');
    return;
  }
  
  addTerminalOutput(`> ${command}`, 'info');
  
  if (currentStep === 1) {
    await processStep1(command);
  } else if (currentStep === 2) {
    await processStep2(command);
  } else if (currentStep === 3) {
    await processStep3(command);
  }
  
  terminalInput.value = '';
};

async function processStep1(command) {
  const lines = command.toLowerCase().split('\n').map(l => l.trim());
  
  const pwLine = lines.find(l => l.startsWith('parentwork'));
  const urlLine = lines.find(l => l.startsWith('url'));
  const findLine = lines.find(l => l.includes('find.ip.url.parent()'));
  
  if (pwLine && urlLine && findLine) {
    const roomRef = ref(database, `rooms/${currentRoomCode}`);
    const snapshot = await get(roomRef);
    const roomData = snapshot.val();
    
    generatedIP = generateIP();
    
    addTerminalOutput('✅ Command diterima...', 'success');
    addTerminalOutput('🔍 Menganalisa parentwork...', 'info');
    
    setTimeout(() => {
      addTerminalOutput(`✅ IP Dijumpai: ${generatedIP}`, 'success');
      addTerminalOutput('✅ Tahap 1 selesai! Teruskan ke Tahap 2.', 'success');
    }, 1500);
    
    await update(ref(database, `rooms/${currentRoomCode}/players/${currentUser}`), {
      step: 2,
      ip: generatedIP
    });
    
    currentStep = 2;
    updateInstructions();
  } else {
    addTerminalOutput('❌ Command salah! Rujuk arahan.', 'error');
  }
}

async function processStep2(command) {
  const lower = command.toLowerCase();
  
  if (lower.includes('skip')) {
    addTerminalOutput('⏭️ Skip addon. Teruskan ke Tahap 3.', 'info');
    await update(ref(database, `rooms/${currentRoomCode}/players/${currentUser}`), {
      step: 3
    });
    currentStep = 3;
    updateInstructions();
  } else if (lower.includes('addon') && lower.includes('install.addon()')) {
    const addonMatch = lower.match(/addon\s*=\s*(\w+)/);
    if (addonMatch) {
      const addon = addonMatch[1];
      selectedAddons.push(addon);
      
      addTerminalOutput(`✅ Addon "${addon}" dipasang!`, 'success');
      addTerminalOutput('✅ Tahap 2 selesai! Teruskan ke Tahap 3.', 'success');
      
      await update(ref(database, `rooms/${currentRoomCode}/players/${currentUser}`), {
        step: 3,
        addons: selectedAddons
      });
      
      currentStep = 3;
      updateInstructions();
      document.getElementById('addonsPanel').style.display = 'block';
    } else {
      addTerminalOutput('❌ Format addon salah!', 'error');
    }
  } else {
    addTerminalOutput('❌ Command salah! Taip "Skip" atau install addon.', 'error');
  }
}

async function processStep3(command) {
  const lower = command.toLowerCase();
  
  if (lower.includes('rules = down') && 
      lower.includes('choose.rules_in.ip_pw.parentwork()') && 
      lower.includes('start all()')) {
    
    addTerminalOutput('✅ Command diterima...', 'success');
    addTerminalOutput('⚡ Memulakan serangan...', 'info');
    
    setTimeout(async () => {
      addTerminalOutput('💥 Menembusi firewall...', 'info');
      setTimeout(async () => {
        addTerminalOutput('🎯 Akses dijumpai!', 'success');
        addTerminalOutput('✅✅✅ BERJAYA MENEMBUSI WEBSITE! ✅✅✅', 'success');
        
        const finishTime = Date.now() - startTime;
        
        await update(ref(database, `rooms/${currentRoomCode}/players/${currentUser}`), {
          step: 4,
          completed: true,
          finishTime: finishTime
        });
        
        checkGameEnd();
      }, 2000);
    }, 2000);
  } else {
    addTerminalOutput('❌ Command salah! Rujuk arahan.', 'error');
  }
}

async function checkGameEnd() {
  const roomRef = ref(database, `rooms/${currentRoomCode}`);
  const snapshot = await get(roomRef);
  const roomData = snapshot.val();
  
  const allCompleted = Object.values(roomData.players).every(p => p.completed);
  
  if (allCompleted) {
    const winner = Object.values(roomData.players).sort((a, b) => a.finishTime - b.finishTime)[0];
    
    await update(roomRef, {
      status: 'finished',
      winner: winner.name,
      winnerTime: winner.finishTime
    });
  }
}

// Addon Functions
window.useAddon = async function(addonType) {
  const roomRef = ref(database, `rooms/${currentRoomCode}`);
  const snapshot = await get(roomRef);
  const roomData = snapshot.val();
  const players = Object.keys(roomData.players).filter(p => p !== currentUser);
  
  if (players.length === 0) {
    addTerminalOutput('❌ Tiada lawan untuk diserang!', 'error');
    return;
  }
  
  const target = players[Math.floor(Math.random() * players.length)];
  
  if (addonType === 'kill_air') {
    await update(ref(database, `rooms/${currentRoomCode}/players/${target}`), {
      blocked: true
    });
    addTerminalOutput(`🚫 Kill Air digunakan pada ${target}!`, 'success');
    
    setTimeout(async () => {
      await update(ref(database, `rooms/${currentRoomCode}/players/${target}`), {
        blocked: false
      });
    }, 10000);
    
  } else if (addonType === 'change_pw') {
    addTerminalOutput(`🔄 Parentwork ${target} ditukar!`, 'success');
    
  } else if (addonType === 'ddos') {
    await update(ref(database, `rooms/${currentRoomCode}/players/${target}`), {
      step: 1,
      ip: '',
      addons: []
    });
    addTerminalOutput(`💥 DDOS attack pada ${target}! Progress direset!`, 'success');
  }
};

function startBlockTimer(seconds) {
  const terminalInput = document.getElementById('terminalInput');
  const blockWarning = document.getElementById('blockWarning');
  const blockTimerSpan = document.getElementById('blockTimer');
  
  terminalInput.disabled = true;
  blockWarning.style.display = 'block';
  
  let remaining = seconds;
  blockTimerSpan.textContent = remaining;
  
  blockTimer = setInterval(() => {
    remaining--;
    blockTimerSpan.textContent = remaining;
    
    if (remaining <= 0) {
      clearInterval(blockTimer);
      blockTimer = null;
      terminalInput.disabled = false;
      blockWarning.style.display = 'none';
      addTerminalOutput('✅ Block tamat! Anda boleh meneruskan.', 'success');
    }
  }, 1000);
}

function addTerminalOutput(text, type = 'info') {
  const output = document.getElementById('terminalOutput');
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

// Winner Screen
function showWinnerScreen(roomData) {
  showScreen('winnerScreen');
  
  document.getElementById('winnerName').textContent = roomData.winner;
  document.getElementById('winnerTime').textContent = formatTime(roomData.winnerTime);
  
  const finalLeaderboard = document.getElementById('finalLeaderboard');
  finalLeaderboard.innerHTML = '';
  
  const sortedPlayers = Object.values(roomData.players).sort((a, b) => a.finishTime - b.finishTime);
  
  sortedPlayers.forEach((player, index) => {
    const div = document.createElement('div');
    div.className = `leaderboard-item ${index === 0 ? 'winner' : ''}`;
    div.innerHTML = `
      <div>
        <span class="rank">#${index + 1}</span>
        <strong>${player.name}</strong>
      </div>
      <div>${formatTime(player.finishTime)}</div>
    `;
    finalLeaderboard.appendChild(div);
  });
}

// Helper Functions
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateIP() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Hack Battle Game loaded!');
  console.log('⚠️ Ini hanya game simulasi untuk hiburan!');
});
