const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const stateTitle = document.getElementById('stateTitle');
const stateSubtitle = document.getElementById('stateSubtitle');

// Game constants
const WORLD = { width: canvas.width, height: canvas.height, groundY: 420 };
const GRAVITY = 0.9;
const JUMP_VELOCITY = -16.5;
const MOVE_SPEED = 6.5;

const COLORS = {
  bgTop: '#0b1020',
  bgBottom: '#0b1020',
  moon: '#f1f5f9',
  moonGlow: 'rgba(241,245,249,.15)',
  hillDark: '#0b1325',
  hillMid: '#0e1a33',
  hillLight: '#132542',
  ground: '#0b1220',
  groundEdge: '#141e30',
  pumpkin: '#f97316',
  pumpkinDark: '#ea580c',
  eye: '#111827',
  white: '#e5e7eb',
  bone: '#e5e7eb',
  purple: '#8b5cf6',
  bat: '#7c3aed',
  candy: '#22c55e',
  hud: 'rgba(2,6,23,.55)'
};

const GAME_STATE = { Idle: 'idle', Playing: 'playing', GameOver: 'over' };
let gameState = GAME_STATE.Idle;

// Input handling
const keys = { left: false, right: false, jump: false };
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') keys.left = true;
  if (e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'ArrowUp' || e.code === 'Space') keys.jump = true;
  if (gameState !== GAME_STATE.Playing && (e.code === 'Space' || e.code === 'Enter')) startGame();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'ArrowUp' || e.code === 'Space') keys.jump = false;
});

// Entities
function createPlayer() {
  return {
    x: 120,
    y: WORLD.groundY - 48,
    w: 36,
    h: 48,
    vx: 0,
    vy: 0,
    onGround: true,
    invulnTimer: 0,
    draw() {
      // Pumpkin head with stem and face
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      const r = 22;
      // glow
      ctx.fillStyle = 'rgba(249,115,22,.08)';
      ctx.beginPath(); ctx.arc(cx, cy + 6, r + 16, 0, Math.PI * 2); ctx.fill();
      // body
      const flicker = Math.sin(Date.now() / 120) * 0.5;
      ctx.fillStyle = COLORS.pumpkin;
      ctx.beginPath(); ctx.ellipse(cx, cy, r + 2 + flicker, r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.pumpkinDark;
      ctx.beginPath(); ctx.ellipse(cx, cy, r - 4, r - 6, 0, 0, Math.PI * 2); ctx.fill();
      // stem
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(cx - 4, cy - r - 8, 8, 12);
      // face
      ctx.fillStyle = COLORS.eye;
      // eyes
      ctx.beginPath(); ctx.moveTo(cx - 9, cy - 2); ctx.lineTo(cx - 1, cy - 8); ctx.lineTo(cx - 1, cy + 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 9, cy - 2); ctx.lineTo(cx + 1, cy - 8); ctx.lineTo(cx + 1, cy + 2); ctx.closePath(); ctx.fill();
      // mouth
      ctx.beginPath(); ctx.moveTo(cx - 10, cy + 8); ctx.lineTo(cx - 4, cy + 14); ctx.lineTo(cx + 4, cy + 14); ctx.lineTo(cx + 10, cy + 8); ctx.lineTo(cx + 2, cy + 12); ctx.lineTo(cx - 2, cy + 12); ctx.closePath(); ctx.fill();
    }
  };
}

function createSkeleton(x) {
  return {
    type: 'skeleton',
    x,
    y: WORLD.groundY - 24,
    w: 28,
    h: 28,
    vx: -4.5,
    hitboxYOffset: 6,
    draw() {
      const cx = this.x + this.w / 2; const cy = this.y + this.h / 2;
      ctx.fillStyle = COLORS.white;
      // skull
      ctx.fillRect(cx - 10, cy - 12, 20, 18);
      ctx.fillStyle = COLORS.eye; ctx.fillRect(cx - 7, cy - 6, 5, 6); ctx.fillRect(cx + 2, cy - 6, 5, 6);
      // teeth
      ctx.fillStyle = COLORS.white; ctx.fillRect(cx - 6, cy + 3, 12, 3);
      // body & legs
      ctx.fillRect(cx - 2, cy + 6, 4, 12);
      const step = Math.sin(Date.now()/120 + x*0.1) * 3;
      ctx.fillRect(cx - 8, cy + 12, 6, 4 + step);
      ctx.fillRect(cx + 2, cy + 12, 6, 4 - step);
    }
  };
}

function createBat(x) {
  const baseY = 240 + Math.sin(x * 0.02) * 40;
  return {
    type: 'bat',
    x,
    y: baseY,
    w: 32,
    h: 18,
    vx: -6,
    draw() {
      const cx = this.x + this.w / 2; const cy = this.y + this.h / 2;
      const flap = Math.sin(Date.now() / 90) * 6 + 8;
      ctx.fillStyle = COLORS.bat;
      // body
      ctx.beginPath(); ctx.ellipse(cx, cy, 10, 8, 0, 0, Math.PI*2); ctx.fill();
      // wings
      ctx.beginPath(); ctx.moveTo(cx-10, cy); ctx.quadraticCurveTo(cx-20, cy-flap, cx-30, cy); ctx.quadraticCurveTo(cx-20, cy+flap, cx-10, cy); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx+10, cy); ctx.quadraticCurveTo(cx+20, cy-flap, cx+30, cy); ctx.quadraticCurveTo(cx+20, cy+flap, cx+10, cy); ctx.fill();
      // eyes
      ctx.fillStyle = COLORS.white; ctx.fillRect(cx-3, cy-2, 2, 2); ctx.fillRect(cx+1, cy-2, 2, 2);
    }
  };
}

function createCandy(x) {
  return {
    type: 'candy',
    x,
    y: WORLD.groundY - 40,
    w: 16,
    h: 16,
    vx: -4.5,
    draw() {
      const cx = this.x + this.w/2; const cy = this.y + this.h/2;
      ctx.fillStyle = COLORS.candy;
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx-10, cy); ctx.lineTo(cx-5, cy); ctx.moveTo(cx+10, cy); ctx.lineTo(cx+5, cy); ctx.stroke();
    }
  };
}

// World decoration
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  g.addColorStop(0, COLORS.bgTop);
  g.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // moon
  ctx.fillStyle = COLORS.moonGlow; ctx.beginPath(); ctx.arc(760, 80, 46, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = COLORS.moon; ctx.beginPath(); ctx.arc(760, 80, 36, 0, Math.PI*2); ctx.fill();
}
function drawHills() {
  ctx.fillStyle = COLORS.hillLight;
  ctx.beginPath(); ctx.moveTo(0, 340); ctx.quadraticCurveTo(160, 300, 320, 340); ctx.quadraticCurveTo(480, 380, 640, 340); ctx.quadraticCurveTo(800, 300, 900, 340); ctx.lineTo(900, 520); ctx.lineTo(0, 520); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COLORS.hillMid;
  ctx.beginPath(); ctx.moveTo(0, 370); ctx.quadraticCurveTo(200, 330, 400, 370); ctx.quadraticCurveTo(600, 410, 900, 370); ctx.lineTo(900, 520); ctx.lineTo(0, 520); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COLORS.hillDark;
  ctx.beginPath(); ctx.moveTo(0, 400); ctx.quadraticCurveTo(220, 360, 460, 400); ctx.quadraticCurveTo(680, 440, 900, 400); ctx.lineTo(900, 520); ctx.lineTo(0, 520); ctx.closePath(); ctx.fill();
}
function drawGround() {
  ctx.fillStyle = COLORS.ground; ctx.fillRect(0, WORLD.groundY, WORLD.width, WORLD.height - WORLD.groundY);
  ctx.strokeStyle = COLORS.groundEdge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, WORLD.groundY + 0.5); ctx.lineTo(WORLD.width, WORLD.groundY + 0.5); ctx.stroke();
  // gravestones
  ctx.fillStyle = '#1f2937';
  for (let i = 0; i < 9; i++) {
    const x = (i*120 + 40 + (Date.now()/50 % 120)) % WORLD.width;
    ctx.fillRect(x, WORLD.groundY - 22, 18, 22);
    ctx.fillRect(x + 5, WORLD.groundY - 30, 8, 10);
  }
}

// Physics helpers
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Game state
let player = createPlayer();
let entities = [];
let score = 0; let best = 0; let lives = 3;
let spawnTimer = 0; let candyTimer = 0;
let lastTick = performance.now();

function resetGame() {
  player = createPlayer();
  entities = [];
  score = 0; lives = 3; spawnTimer = 0; candyTimer = 120;
}

function startGame() {
  resetGame();
  gameState = GAME_STATE.Playing;
  overlay.classList.add('hidden');
}

startBtn?.addEventListener('click', startGame);

// HUD
function drawHUD() {
  ctx.save();
  ctx.globalAlpha = 1;
  // score bar
  ctx.fillStyle = COLORS.hud;
  roundRect(36, 30, WORLD.width - 72, 46, 12);
  ctx.fill();
  // left stats
  drawStat(56, 53, COLORS.pumpkin, 'Score', String(score));
  drawStat(196, 53, COLORS.white, 'Lives', '❤'.repeat(lives));
  // right stats
  const rightX = WORLD.width - 56;
  drawStat(rightX - 180, 53, COLORS.white, 'Best', String(best), true);
  ctx.restore();
}

function drawStat(x, y, color, label, value, alignRight=false) {
  ctx.save();
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = alignRight ? 'right' : 'left';
  // dot
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(alignRight ? x : x-12, y, 5, 0, Math.PI*2); ctx.fill();
  // label
  ctx.fillStyle = '#94a3b8'; ctx.fillText(label, alignRight ? x - 16 : x, y);
  // value
  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText(value, alignRight ? x - 16 : x + 64, y);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function spawnEntities(dt) {
  spawnTimer -= dt;
  candyTimer -= dt;
  if (spawnTimer <= 0) {
    const typeRoll = Math.random();
    if (typeRoll < 0.55) {
      entities.push(createSkeleton(WORLD.width + 40));
      spawnTimer = 900 + Math.random() * 700;
    } else {
      entities.push(createBat(WORLD.width + 40));
      spawnTimer = 750 + Math.random() * 700;
    }
  }
  if (candyTimer <= 0) {
    entities.push(createCandy(WORLD.width + 40));
    candyTimer = 4000 + Math.random() * 2000;
  }
}

function update(dtMs) {
  const dt = dtMs / 16.6667; // normalize to 60fps units
  if (gameState !== GAME_STATE.Playing) return;

  // Player movement
  player.vx = 0;
  if (keys.left) player.vx = -MOVE_SPEED;
  if (keys.right) player.vx = MOVE_SPEED;
  if (keys.jump && player.onGround) { player.vy = JUMP_VELOCITY; player.onGround = false; }

  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  // constrain
  if (player.x < 20) player.x = 20;
  if (player.x + player.w > WORLD.width - 20) player.x = WORLD.width - 20 - player.w;

  // ground collision
  if (player.y + player.h >= WORLD.groundY) {
    player.y = WORLD.groundY - player.h;
    player.vy = 0; player.onGround = true;
  }

  // Entities update
  for (const e of entities) {
    e.x += (e.vx || 0) * dt;
    if (e.type === 'bat') {
      e.y += Math.sin(Date.now() / 200 + e.x * 0.02) * 1.8 * dt;
    }
  }
  // Remove offscreen
  entities = entities.filter(e => e.x > -80);

  // Collisions
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    const hitbox = { x: e.x, y: e.y + (e.hitboxYOffset||0), w: e.w, h: e.h - (e.hitboxYOffset||0) };
    if (aabb({x: player.x, y: player.y, w: player.w, h: player.h}, hitbox)) {
      if (e.type === 'candy') {
        score += 5; entities.splice(i,1); continue;
      }
      // enemy collision
      if (player.invulnTimer <= 0) {
        lives -= 1; player.invulnTimer = 60 * 1.2; // ~1.2s
        if (lives <= 0) {
          best = Math.max(best, score);
          gameState = GAME_STATE.GameOver;
          overlay.classList.remove('hidden');
          stateTitle.textContent = 'Game Over';
          stateSubtitle.textContent = 'Press Space to Restart';
        }
      }
    }
  }

  if (player.invulnTimer > 0) player.invulnTimer -= dt;

  // Score over time
  score += 1 * dt;

  // Spawns
  spawnEntities(dtMs);
}

function render() {
  // background
  drawSky();
  drawHills();
  drawGround();

  // entities
  for (const e of entities) {
    e.draw();
  }

  // player (blinking when invulnerable)
  const blink = player.invulnTimer > 0 && Math.floor(player.invulnTimer / 3) % 2 === 0;
  if (!blink) player.draw();

  drawHUD();

  // hint
  if (gameState === GAME_STATE.Playing && Math.floor(Date.now()/800)%2 === 0 && score < 30) {
    drawHint('Tip: Jump with ↑ or Space');
  }
}

function drawHint(text) {
  ctx.save();
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(226,232,240,.95)';
  ctx.fillText(text, WORLD.width/2, WORLD.height - 26);
  ctx.restore();
}

function loop(t) {
  const dt = t - lastTick; lastTick = t;
  update(dt);
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  render();
  requestAnimationFrame(loop);
}

function init() {
  // Build a HUD DOM overlay inside the canvas area for crisp UI
  const bar = document.createElement('div');
  bar.className = 'scorebar';
  bar.innerHTML = `
    <div class="left">
      <span class="stat"><span class="dot pumpkin"></span>Pumpkin</span>
      <span class="stat"><span class="dot skull"></span>Skeletons</span>
      <span class="stat"><span class="dot bat"></span>Bats</span>
      <span class="stat"><span class="dot candy"></span>Candy +5</span>
    </div>
    <div class="right">
      <span id="hudScore" class="stat">Score: 0</span>
      <span id="hudBest" class="stat">Best: 0</span>
    </div>
  `;
  canvas.parentElement.style.position = 'relative';
  canvas.parentElement.appendChild(bar);
  // Show start overlay on initial load
  if (gameState === GAME_STATE.Idle) {
    overlay.classList.remove('hidden');
    stateTitle.textContent = 'Halloween Run';
    stateSubtitle.textContent = 'Press Space to Start';
  }
}

// Keep HUD values in sync each frame
setInterval(() => {
  const scoreEl = document.getElementById('hudScore');
  const bestEl = document.getElementById('hudBest');
  if (scoreEl) scoreEl.textContent = `Score: ${Math.floor(score)}`;
  if (bestEl) bestEl.textContent = `Best: ${Math.floor(best)}`;
}, 100);

init();
requestAnimationFrame(loop);

// Resize handling to keep aspect visually nice (canvas resolution fixed for simplicity)
window.addEventListener('resize', () => {
  // Using CSS to scale; no action required
});
