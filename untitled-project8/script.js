const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const timeValue = document.getElementById("timeValue");
const scoreValue = document.getElementById("scoreValue");
const comboValue = document.getElementById("comboValue");
const panicBar = document.getElementById("panicBar");
const rateValue = document.getElementById("rateValue");
const laneButtons = document.querySelectorAll(".lane");

const laneMeta = {
  intervensi: { label: "Intervensi", color: "#5d8dff" },
  komunikasi: { label: "Komunikasi", color: "#3bc7d9" },
  ekspor: { label: "Ekspor", color: "#48c774" },
  abaikan: { label: "Abaikan", color: "#f5b342" },
};

const deck = [
  { text: "Dolar menguat di Asia", lane: "intervensi", impact: 8 },
  { text: "Tekanan pasar spot naik", lane: "intervensi", impact: 9 },
  { text: "Cadangan devisa diuji", lane: "intervensi", impact: 10 },
  { text: "Investor tunggu sinyal bunga", lane: "intervensi", impact: 8 },
  { text: "Rumor kurs 20 ribu menyebar", lane: "komunikasi", impact: 11 },
  { text: "Konferensi pers diminta", lane: "komunikasi", impact: 7 },
  { text: "Thread panik viral", lane: "komunikasi", impact: 9 },
  { text: "Klarifikasi data impor", lane: "komunikasi", impact: 8 },
  { text: "Pesanan kopi ekspor masuk", lane: "ekspor", impact: 7 },
  { text: "Kapal nikel siap berangkat", lane: "ekspor", impact: 8 },
  { text: "Remitansi pekerja naik", lane: "ekspor", impact: 7 },
  { text: "UMKM tembus pasar luar", lane: "ekspor", impact: 8 },
  { text: "Meme dompet tipis", lane: "abaikan", impact: 5 },
  { text: "Candaan grup keluarga", lane: "abaikan", impact: 5 },
  { text: "Jajak harga nasi padang", lane: "abaikan", impact: 6 },
  { text: "Sticker kaget kurs", lane: "abaikan", impact: 5 },
];

let cards = [];
let particles = [];
let selectedId = null;
let nextCardId = 1;
let running = false;
let ended = false;
let lastTime = 0;
let spawnTimer = 0;
let bonusTimer = 18;
let exportWave = null;
let state = {
  time: 90,
  score: 0,
  combo: 1,
  panic: 28,
  rate: 17850,
};

function resetGame() {
  cards = [];
  particles = [];
  selectedId = null;
  nextCardId = 1;
  exportWave = null;
  state = { time: 90, score: 0, combo: 1, panic: 28, rate: 17850 };
  spawnTimer = 0;
  bonusTimer = 18;
  running = true;
  ended = false;
  lastTime = performance.now();
  startBtn.textContent = "Ulangi";
  updateHud();
}

function updateHud() {
  timeValue.textContent = Math.max(0, Math.ceil(state.time));
  scoreValue.textContent = state.score.toLocaleString("id-ID");
  comboValue.textContent = `x${state.combo}`;
  panicBar.style.width = `${Math.min(100, state.panic)}%`;
  rateValue.textContent = `Rp${Math.round(state.rate).toLocaleString("id-ID")}`;
}

function spawnCard() {
  const template = deck[Math.floor(Math.random() * deck.length)];
  const width = 214;
  const x = 32 + Math.random() * (canvas.width - width - 64);
  cards.push({
    ...template,
    id: nextCardId++,
    x,
    y: -82,
    w: width,
    h: 76,
    speed: 52 + Math.random() * 54 + (90 - state.time) * 0.8,
  });
}

function spawnExportWave() {
  exportWave = {
    ttl: 8,
    crates: [
      { x: 164, y: 500, label: "KOPI", good: true, hit: false },
      { x: 402, y: 520, label: "SAWIT", good: true, hit: false },
      { x: 640, y: 500, label: "RUMOR", good: false, hit: false },
      { x: 878, y: 520, label: "TEKSTIL", good: true, hit: false },
    ],
  };
}

function resolveCard(lane) {
  if (!selectedId || !running) return;
  const card = cards.find((item) => item.id === selectedId);
  if (!card) return;

  const correct = card.lane === lane;
  if (correct) {
    state.score += 100 * state.combo + card.impact * 5;
    state.combo = Math.min(9, state.combo + 1);
    state.panic = Math.max(0, state.panic - card.impact * 0.7);
    state.rate = Math.max(17400, state.rate - card.impact * 3);
    burst(card.x + card.w / 2, card.y + card.h / 2, "#48c774");
  } else {
    state.combo = 1;
    state.panic = Math.min(100, state.panic + card.impact * 1.2);
    state.rate += card.impact * 8;
    burst(card.x + card.w / 2, card.y + card.h / 2, "#e84f4f");
  }

  cards = cards.filter((item) => item.id !== selectedId);
  selectedId = null;
  updateHud();
}

function burst(x, y, color) {
  for (let i = 0; i < 14; i += 1) {
    particles.push({
      x,
      y,
      vx: -90 + Math.random() * 180,
      vy: -100 + Math.random() * 60,
      ttl: 0.45,
      color,
    });
  }
}

function update(dt) {
  if (!running) return;

  state.time -= dt;
  state.panic += dt * 1.7;
  state.rate += dt * (state.panic > 65 ? 19 : 7);
  spawnTimer -= dt;
  bonusTimer -= dt;

  if (spawnTimer <= 0) {
    spawnCard();
    spawnTimer = Math.max(0.42, 1.15 - (90 - state.time) * 0.008);
  }

  if (bonusTimer <= 0 && !exportWave) {
    spawnExportWave();
    bonusTimer = 24;
  }

  cards.forEach((card) => {
    card.y += card.speed * dt;
  });

  cards
    .filter((card) => card.y > canvas.height + 20)
    .forEach((card) => {
      if (selectedId === card.id) selectedId = null;
      state.combo = 1;
      state.panic = Math.min(100, state.panic + card.impact);
      state.rate += card.impact * 6;
    });
  cards = cards.filter((card) => card.y <= canvas.height + 20);

  if (exportWave) {
    exportWave.ttl -= dt;
    if (exportWave.ttl <= 0) exportWave = null;
  }

  particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 240 * dt;
    particle.ttl -= dt;
  });
  particles = particles.filter((particle) => particle.ttl > 0);

  if (state.time <= 0 || state.panic >= 100) {
    running = false;
    ended = true;
    startBtn.textContent = "Main Lagi";
  }

  updateHud();
}

function drawPixelText(text, x, y, size, color = "#f7f1dc", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px Arial`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function drawBackground() {
  ctx.fillStyle = "#151820";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(247, 241, 220, 0.08)";
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#222733";
  ctx.fillRect(0, canvas.height - 86, canvas.width, 86);
  drawPixelText("LINIMASA PASAR", 28, canvas.height - 62, 20, "#aeb6ac");
  drawPixelText("Pilih kartu lalu tekan respons di bawah", canvas.width - 28, canvas.height - 62, 20, "#aeb6ac", "right");
}

function drawCard(card) {
  const selected = card.id === selectedId;
  ctx.fillStyle = selected ? "#f7f1dc" : "#303746";
  ctx.fillRect(card.x + 6, card.y + 6, card.w, card.h);
  ctx.fillStyle = selected ? "#303746" : "#f7f1dc";
  ctx.fillRect(card.x, card.y, card.w, card.h);
  ctx.strokeStyle = "#090a0c";
  ctx.lineWidth = 5;
  ctx.strokeRect(card.x, card.y, card.w, card.h);

  ctx.fillStyle = laneMeta[card.lane].color;
  ctx.fillRect(card.x, card.y, 14, card.h);
  drawPixelText("KABAR", card.x + 26, card.y + 12, 13, selected ? "#23262d" : "#aeb6ac");
  drawWrapped(card.text, card.x + 26, card.y + 32, card.w - 44, 18, selected ? "#151820" : "#f7f1dc");
}

function drawWrapped(text, x, y, maxWidth, lineHeight, color) {
  ctx.fillStyle = color;
  ctx.font = "900 18px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function drawExportWave() {
  if (!exportWave) return;
  ctx.fillStyle = "#111318";
  ctx.fillRect(96, 438, canvas.width - 192, 156);
  ctx.strokeStyle = "#48c774";
  ctx.lineWidth = 5;
  ctx.strokeRect(96, 438, canvas.width - 192, 156);
  drawPixelText("BONUS DEVISA: ketuk komoditas ekspor", canvas.width / 2, 458, 22, "#48c774", "center");

  exportWave.crates.forEach((crate) => {
    if (crate.hit) return;
    ctx.fillStyle = crate.good ? "#8b5a2b" : "#6b2b3d";
    ctx.fillRect(crate.x, crate.y, 122, 48);
    ctx.strokeStyle = "#090a0c";
    ctx.lineWidth = 4;
    ctx.strokeRect(crate.x, crate.y, 122, 48);
    drawPixelText(crate.label, crate.x + 61, crate.y + 14, 16, "#f7f1dc", "center");
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.ttl / 0.45);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 8, 8);
  });
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (running) return;
  ctx.fillStyle = "rgba(9, 10, 12, 0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const title = ended ? "Ronde Selesai" : "Rupiah Defense";
  const body = ended
    ? `Skor akhir: ${state.score.toLocaleString("id-ID")}`
    : "Tekan Mulai. Sortir headline ke respons yang tepat.";
  drawPixelText(title, canvas.width / 2, 250, 54, "#f7f1dc", "center");
  drawPixelText(body, canvas.width / 2, 320, 24, "#f5b342", "center");
}

function draw() {
  drawBackground();
  cards.forEach(drawCard);
  drawExportWave();
  drawParticles();
  drawOverlay();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

function handleCanvasPress(event) {
  event.preventDefault();
  if (!running) return;
  const point = getCanvasPoint(event);

  if (exportWave) {
    const crate = exportWave.crates.find(
      (item) =>
        !item.hit &&
        point.x >= item.x &&
        point.x <= item.x + 122 &&
        point.y >= item.y &&
        point.y <= item.y + 48,
    );
    if (crate) {
      crate.hit = true;
      if (crate.good) {
        state.score += 220;
        state.panic = Math.max(0, state.panic - 5);
        state.rate = Math.max(17400, state.rate - 35);
        burst(crate.x + 61, crate.y + 24, "#48c774");
      } else {
        state.panic = Math.min(100, state.panic + 8);
        burst(crate.x + 61, crate.y + 24, "#e84f4f");
      }
      updateHud();
      return;
    }
  }

  const card = [...cards]
    .reverse()
    .find(
      (item) =>
        point.x >= item.x &&
        point.x <= item.x + item.w &&
        point.y >= item.y &&
        point.y <= item.y + item.h,
    );
  selectedId = card ? card.id : null;
}

startBtn.addEventListener("click", resetGame);
canvas.addEventListener("mousedown", handleCanvasPress);
canvas.addEventListener("touchstart", handleCanvasPress, { passive: false });
laneButtons.forEach((button) => {
  button.addEventListener("click", () => resolveCard(button.dataset.lane));
});

updateHud();
draw();
requestAnimationFrame(loop);
