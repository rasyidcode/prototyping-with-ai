export class UIManager {
  constructor() {
    this.hudContainer = null;
    this.scoreElement = null;
    this.slapsElement = null;
    this.heartsContainer = null;
    this.comboContainer = null;
    this.comboTitleElement = null;
    this.damageFlashElement = null;
    
    this.maxHealth = 5;
    this.currentHealth = 5;
    
    this._cacheElements();
  }
  
  init() {
    this.showHUD();
    this.updateScore(0);
    this.updateSlaps(0);
    this.updateHealth(5);
    this.hideCombo();
  }
  
  showHUD() {
    if (this.hudContainer) {
      this.hudContainer.classList.remove('hidden');
    }
  }
  
  hideHUD() {
    if (this.hudContainer) {
      this.hudContainer.classList.add('hidden');
    }
  }
  
  updateScore(score) {
    if (this.scoreElement) {
      // Pad score with leading zeroes to look like an old school arcade machine (e.g. 00450)
      this.scoreElement.textContent = String(score).padStart(5, '0');
      
      // Quick subtle scale pop on score increase
      this.scoreElement.style.transform = 'scale(1.15)';
      this.scoreElement.style.transition = 'transform 0.05s ease';
      setTimeout(() => {
        if (this.scoreElement) this.scoreElement.style.transform = 'scale(1)';
      }, 50);
    }
  }
  
  updateSlaps(slaps) {
    if (this.slapsElement) {
      this.slapsElement.textContent = slaps;
    }
  }
  
  updateHealth(health) {
    const healthDecreased = health < this.currentHealth;
    this.currentHealth = health;
    
    if (!this.heartsContainer) return;
    
    // Clear and redraw hearts
    this.heartsContainer.innerHTML = '';
    
    for (let i = 0; i < this.maxHealth; i++) {
      const isLost = i >= health;
      const heartSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      heartSVG.setAttribute('class', `heart-icon ${isLost ? 'lost' : ''}`);
      heartSVG.setAttribute('viewBox', '0 0 24 24');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', '#ff4c4c');
      path.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
      
      heartSVG.appendChild(path);
      this.heartsContainer.appendChild(heartSVG);
    }
    
    // Trigger screen damage flash and heart vibration if taking damage
    if (healthDecreased) {
      this.triggerDamageFlash();
      
      // Pulse remaining hearts
      const hearts = this.heartsContainer.querySelectorAll('.heart-icon:not(.lost)');
      hearts.forEach((heart) => {
        heart.classList.add('pulse');
        setTimeout(() => heart.classList.remove('pulse'), 400);
      });
    }
  }
  
  triggerDamageFlash() {
    if (this.damageFlashElement) {
      this.damageFlashElement.classList.add('flash');
      
      // Clear previous timeout if any
      if (this.flashTimeout) clearTimeout(this.flashTimeout);
      
      this.flashTimeout = setTimeout(() => {
        if (this.damageFlashElement) {
          this.damageFlashElement.classList.remove('flash');
        }
      }, 150); // Flash duration
    }
  }
  
  showCombo(multiplier) {
    if (!this.comboContainer || !this.comboTitleElement) return;
    
    this.comboTitleElement.textContent = `COMBO X${multiplier}`;
    this.comboContainer.classList.remove('hidden');
    
    // Punchy scale pop on combo increase
    this.comboContainer.style.transform = 'translate(-50%, -50%) scale(1.35) rotate(-3deg)';
    this.comboContainer.style.transition = 'transform 0.05s ease';
    
    if (this.comboTimeout) clearTimeout(this.comboTimeout);
    
    this.comboTimeout = setTimeout(() => {
      if (this.comboContainer) {
        this.comboContainer.style.transform = 'translate(-50%, -50%) scale(1)';
        this.comboContainer.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      }
    }, 50);
  }
  
  hideCombo() {
    if (this.comboContainer) {
      this.comboContainer.classList.add('hidden');
    }
  }
  
  spawnComicWord(x, y) {
    const words = ['SMACK!', 'POW!', 'WHACK!', 'BAM!', 'SLAP!'];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    
    const div = document.createElement('div');
    div.className = 'comic-particle';
    div.textContent = randomWord;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    
    document.body.appendChild(div);
    
    // Remove element after animation completes (500ms)
    setTimeout(() => {
      div.remove();
    }, 500);
  }
  
  showMainMenu() {
    if (this.mainMenuElement) this.mainMenuElement.classList.remove('hidden');
    this.hideHUD();
    if (this.gameOverElement) this.gameOverElement.classList.add('hidden');
  }

  showGameOver(score, slaps, survivalTime) {
    this.hideHUD();
    this.hideCombo();
    if (this.mainMenuElement) this.mainMenuElement.classList.add('hidden');
    
    if (this.finalScoreElement) this.finalScoreElement.textContent = String(score).padStart(5, '0');
    if (this.finalSlapsElement) this.finalSlapsElement.textContent = slaps;
    if (this.finalTimeElement) this.finalTimeElement.textContent = `${Math.floor(survivalTime)}s`;
    
    if (this.gameOverElement) this.gameOverElement.classList.remove('hidden');
  }

  setFreezeActive(active) {
    if (this.freezeOverlayElement) {
      if (active) {
        this.freezeOverlayElement.classList.add('active');
      } else {
        this.freezeOverlayElement.classList.remove('active');
      }
    }
  }

  _cacheElements() {
    this.hudContainer = document.getElementById('hud');
    this.scoreElement = document.getElementById('score-val');
    this.slapsElement = document.getElementById('slaps-val');
    this.heartsContainer = document.getElementById('hearts-container');
    this.comboContainer = document.getElementById('combo-container');
    this.comboTitleElement = document.getElementById('combo-title');
    this.damageFlashElement = document.getElementById('damage-flash');
    this.freezeOverlayElement = document.getElementById('freeze-overlay');
    
    this.mainMenuElement = document.getElementById('main-menu');
    this.gameOverElement = document.getElementById('game-over');
    this.finalScoreElement = document.getElementById('final-score');
    this.finalSlapsElement = document.getElementById('final-slaps');
    this.finalTimeElement = document.getElementById('final-time');
  }
}
