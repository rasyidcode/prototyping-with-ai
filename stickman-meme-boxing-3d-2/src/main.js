import './style.css';
import * as THREE from 'three';
import { BoxingGame } from './game.js';

// Opponent data definitions
const OPPONENTS = {
  john_cena: {
    name: "John Cena",
    quote: "You can't see me, but you can feel my fists!",
    image: "/memes/john_cena.png"
  },
  harold: {
    name: "Pain Harold",
    quote: "I smile because I endure. Pain is just a state of mind.",
    image: "/memes/harold.png"
  },
  gigachad: {
    name: "Gigachad",
    quote: "Yes, I punch hard. How could you tell?",
    image: "/memes/gigachad.png"
  },
  doge: {
    name: "Doge",
    quote: "Such knock out. Very lose. Many regrets. Wow.",
    image: "/memes/doge.png"
  }
};

let gameInstance = null;
let currentOpponentId = 'john_cena';

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const selectScreen = document.getElementById('select-screen');
const instructionsScreen = document.getElementById('instructions-screen');
const spinnerScreen = document.getElementById('spinner-screen');
const hudScreen = document.getElementById('hud-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Initialize Game Engine
function initGame() {
  const callbacks = {
    onPlayerHPChange: (hp) => {
      const bar = document.getElementById('player-hp-bar');
      const text = document.getElementById('player-hp-text');
      bar.style.width = `${hp}%`;
      text.textContent = `${Math.round(hp)} / 100`;
      
      // Flash red on low HP
      if (hp < 30) {
        bar.style.background = 'linear-gradient(90deg, #ff0055, #ff3c3c)';
      } else {
        bar.style.background = 'linear-gradient(90deg, #0072ff, #00f2fe)';
      }
    },
    
    onOpponentHPChange: (hp) => {
      const bar = document.getElementById('opponent-hp-bar');
      const text = document.getElementById('opponent-hp-text');
      bar.style.width = `${hp}%`;
      text.textContent = `${Math.round(hp)} / 100`;
      
      if (hp < 30) {
        bar.style.background = 'linear-gradient(270deg, #ff0055, #ff3c3c)';
      } else {
        bar.style.background = 'linear-gradient(270deg, #ff007b, #fe0979)';
      }
    },
    
    onPlayerStaminaChange: (stamina) => {
      document.getElementById('player-stamina-bar').style.width = `${stamina}%`;
    },
    
    onOpponentStaminaChange: (stamina) => {
      document.getElementById('opponent-stamina-bar').style.width = `${stamina}%`;
    },
    
    onSpecialChange: (special) => {
      const bar = document.getElementById('special-bar');
      const hint = document.getElementById('special-hint');
      const btn = document.getElementById('ctrl-special');
      
      bar.style.width = `${special}%`;
      
      if (special >= 100) {
        bar.classList.add('ready');
        hint.classList.add('show');
        btn.classList.remove('locked');
      } else {
        bar.classList.remove('ready');
        hint.classList.remove('show');
        btn.classList.add('locked');
      }
    },
    
    onTimeChange: (seconds) => {
      document.getElementById('timer').textContent = seconds;
      
      if (seconds <= 10) {
        document.getElementById('timer').style.color = '#ff3c3c';
      } else {
        document.getElementById('timer').style.color = '#ffdd00';
      }
    },
    
    comboCounter: (count) => {
      const display = document.getElementById('combo-display');
      if (count > 1) {
        display.textContent = `${count}x COMBO!`;
        display.classList.remove('hidden');
        // trigger animation redraw
        display.style.animation = 'none';
        display.offsetHeight;
        display.style.animation = 'combo-hit 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      } else {
        display.classList.add('hidden');
      }
    },
    
    showMemeText: (text, pos3D, type) => {
      if (!gameInstance) return;
      
      // Project 3D vector to 2D screen space
      const tempV = pos3D.clone();
      tempV.y += 1.8; // Position it above the character's head
      tempV.project(gameInstance.camera);
      
      const container = document.getElementById('canvas-container');
      const x = (tempV.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-(tempV.y * 0.5) + 0.5) * container.clientHeight;
      
      // Create DOM element for clean CSS styling and high-performance layout
      const span = document.createElement('span');
      span.textContent = text;
      
      // Base styles
      span.style.position = 'absolute';
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.transform = 'translate(-50%, -50%) scale(0.8)';
      span.style.fontFamily = 'var(--font-display)';
      span.style.fontSize = '1.3rem';
      span.style.fontWeight = '900';
      span.style.pointerEvents = 'none';
      span.style.zIndex = '100';
      span.style.transition = 'all 1.2s cubic-bezier(0.075, 0.82, 0.165, 1)';
      span.style.whiteSpace = 'nowrap';
      
      // Colors based on message type
      if (type === 'hit') {
        span.style.color = '#00f2fe';
        span.style.textShadow = '0 0 10px rgba(0, 242, 254, 0.8), 0 0 20px rgba(0, 242, 254, 0.4)';
      } else if (type === 'warn') {
        span.style.color = '#fe0979';
        span.style.textShadow = '0 0 10px rgba(254, 9, 121, 0.8), 0 0 20px rgba(254, 9, 121, 0.4)';
        span.style.fontSize = '1.6rem';
      } else if (type === 'block') {
        span.style.color = '#ffffff';
        span.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.8)';
        span.style.fontSize = '1.0rem';
      } else if (type === 'doge') {
        span.style.fontFamily = '"Comic Sans MS", cursive, sans-serif';
        const dogeColors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'];
        span.style.color = dogeColors[Math.floor(Math.random() * dogeColors.length)];
        span.style.textShadow = '2px 2px 0px #000';
        span.style.fontSize = '1.4rem';
      } else if (type === 'harold') {
        span.style.color = '#ffaa00';
        span.style.textShadow = '0 0 8px rgba(255, 170, 0, 0.6)';
        span.style.fontStyle = 'italic';
        span.style.fontSize = '1.1rem';
      } else {
        span.style.color = '#ffdd00';
        span.style.textShadow = '0 0 8px rgba(255, 221, 0, 0.8)';
        span.style.fontSize = '1.1rem';
      }
      
      container.appendChild(span);
      
      // Force redraw
      span.offsetHeight;
      
      // Animate up and fade out
      span.style.transform = 'translate(-50%, -160%) scale(1.2)';
      span.style.opacity = '0';
      
      setTimeout(() => {
        span.remove();
      }, 1200);
    },
    
    onWin: (opponentId) => {
      showGameOver(true, opponentId);
    },
    
    onLose: (opponentId, isDraw = false) => {
      showGameOver(false, opponentId, isDraw);
    }
  };

  gameInstance = new BoxingGame('canvas-container', callbacks);
}

// SCREEN TRANSITIONS
function showScreen(screen) {
  // Hide all screens
  const screens = [menuScreen, selectScreen, instructionsScreen, spinnerScreen, hudScreen, gameOverScreen];
  screens.forEach(s => {
    s.classList.remove('active');
    setTimeout(() => {
      if (!s.classList.contains('active')) s.classList.add('hidden');
    }, 500);
  });
  
  // Show target screen
  screen.classList.remove('hidden');
  // force layout redraw
  screen.offsetHeight;
  screen.classList.add('active');
}

// MATCH FLOW CONTROLLERS
function setupAndStartFight(opponentId) {
  currentOpponentId = opponentId;
  
  // Set opponent name in HUD
  const op = OPPONENTS[opponentId];
  document.getElementById('opponent-name').textContent = op.name.toUpperCase();
  
  // Update HUD opponent avatar circle
  const avatar = document.getElementById('hud-opponent-avatar');
  avatar.innerHTML = `<img src="${op.image}" alt="${op.name}">`;

  // Initialize Scene Setup
  gameInstance.setupFight(opponentId);
  showScreen(hudScreen);

  // Trigger countdown announcement
  const announce = document.getElementById('fight-announce');
  announce.textContent = 'READY...';
  announce.classList.add('show');
  
  setTimeout(() => {
    announce.textContent = 'FIGHT!';
    gameInstance.startFight();
    
    setTimeout(() => {
      announce.classList.remove('show');
    }, 1000);
  }, 1200);
}

// Random Opponent Spinner Animation
function triggerRandomFight() {
  showScreen(spinnerScreen);
  
  const reel = document.getElementById('spinner-reel');
  reel.innerHTML = '';
  
  const list = Object.keys(OPPONENTS);
  const totalItems = 32;
  
  // Populate spinner reel with repeating opponent cards
  for (let i = 0; i < totalItems; i++) {
    const key = list[i % list.length];
    const op = OPPONENTS[key];
    const item = document.createElement('div');
    item.className = 'spinner-item';
    item.innerHTML = `
      <img src="${op.image}" alt="${op.name}">
      <span>${op.name}</span>
    `;
    reel.appendChild(item);
  }
  
  // Randomly select final winner
  const winnerIdx = Math.floor(Math.random() * list.length);
  const finalIdx = totalItems - 5 + winnerIdx; // Target 5 slots from end
  const targetY = -(finalIdx * 120); // Each item is 120px tall
  
  // Reset reel position
  reel.style.transition = 'none';
  reel.style.transform = 'translateY(0)';
  
  // Trigger redraw
  reel.offsetHeight;
  
  // Animate spin with nice easing
  setTimeout(() => {
    reel.style.transition = 'transform 3.5s cubic-bezier(0.15, 0.85, 0.15, 1)';
    reel.style.transform = `translateY(${targetY}px)`;
  }, 50);

  // Transition to gameplay when spin completes
  setTimeout(() => {
    setupAndStartFight(list[winnerIdx]);
  }, 4000);
}

// GAME OVER CONTROLLER
function showGameOver(isWin, opponentId, isDraw = false) {
  const title = document.getElementById('game-over-title');
  const subtitle = document.getElementById('game-over-subtitle');
  const quote = document.getElementById('ending-quote');
  const img = document.getElementById('ending-opponent-img');
  
  const op = OPPONENTS[opponentId];
  img.src = op.image;
  
  if (isWin) {
    title.textContent = 'K.O. - VICTORY';
    title.className = 'neon-text';
    subtitle.textContent = `YOU DEFEATED ${op.name.toUpperCase()}!`;
    quote.textContent = `"Impossible... You actually saw me? Can't be."`;
    if (opponentId === 'doge') quote.textContent = `"Such punch. Very strong. Much defeat. Wow."`;
    if (opponentId === 'harold') quote.textContent = `"I smile, but inside... my ribs are broken."`;
    if (opponentId === 'gigachad') quote.textContent = `"A worthy opponent. I respect your power."`;
  } else if (isDraw) {
    title.textContent = 'TIME OUT';
    title.className = 'neon-text-red';
    subtitle.textContent = `ROUND TIME EXPIRED - DRAW!`;
    quote.textContent = `"A draw? We must fight again to prove who is the true meme champ."`;
  } else {
    title.textContent = 'K.O. - DEFEAT';
    title.className = 'neon-text-red';
    subtitle.textContent = `YOU WERE KNOCKED OUT BY ${op.name.toUpperCase()}!`;
    quote.textContent = `"${op.quote}"`;
  }

  showScreen(gameOverScreen);
}

// BIND DOM EVENT LISTENERS
function bindEvents() {
  // Main Menu Actions
  document.getElementById('btn-random-fight').addEventListener('click', triggerRandomFight);
  document.getElementById('btn-select-opponent').addEventListener('click', () => showScreen(selectScreen));
  document.getElementById('btn-how-to-play').addEventListener('click', () => showScreen(instructionsScreen));
  
  // Back buttons
  document.getElementById('btn-back-menu').addEventListener('click', () => showScreen(menuScreen));
  document.getElementById('btn-instructions-back').addEventListener('click', () => showScreen(menuScreen));
  
  // Opponent Cards click handler
  document.querySelectorAll('.opponent-card').forEach(card => {
    card.addEventListener('click', () => {
      const opId = card.getAttribute('data-opponent');
      setupAndStartFight(opId);
    });
  });

  // Game Over Actions
  document.getElementById('btn-rematch').addEventListener('click', () => {
    setupAndStartFight(currentOpponentId);
  });
  document.getElementById('btn-back-to-menu').addEventListener('click', () => {
    showScreen(menuScreen);
  });

  // Mobile / Touch HUD controls
  document.getElementById('ctrl-dodge-l').addEventListener('click', () => {
    gameInstance.handleKeyDown('a');
  });
  document.getElementById('ctrl-dodge-r').addEventListener('click', () => {
    gameInstance.handleKeyDown('d');
  });
  document.getElementById('ctrl-punch-l').addEventListener('click', () => {
    gameInstance.handleKeyDown('j');
  });
  document.getElementById('ctrl-punch-r').addEventListener('click', () => {
    gameInstance.handleKeyDown('k');
  });
  document.getElementById('ctrl-special').addEventListener('click', () => {
    gameInstance.handleKeyDown('l');
  });

  // Block is held on touch/click
  const blockBtn = document.getElementById('ctrl-block');
  const triggerBlockStart = (e) => {
    e.preventDefault();
    blockBtn.classList.add('active');
    gameInstance.handleKeyDown(' ');
  };
  const triggerBlockEnd = (e) => {
    e.preventDefault();
    blockBtn.classList.remove('active');
    gameInstance.handleKeyUp(' ');
  };

  blockBtn.addEventListener('mousedown', triggerBlockStart);
  blockBtn.addEventListener('mouseup', triggerBlockEnd);
  blockBtn.addEventListener('mouseleave', triggerBlockEnd);
  
  blockBtn.addEventListener('touchstart', triggerBlockStart, { passive: false });
  blockBtn.addEventListener('touchend', triggerBlockEnd, { passive: false });

  // KEYBOARD HANDLERS
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return; // Prevent key repeat spamming
    if (gameInstance) {
      gameInstance.handleKeyDown(e.key);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (gameInstance) {
      gameInstance.handleKeyUp(e.key);
    }
  });
}

// Entry Point
document.addEventListener('DOMContentLoaded', () => {
  initGame();
  bindEvents();
});
