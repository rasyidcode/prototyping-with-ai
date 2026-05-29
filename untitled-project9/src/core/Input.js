/**
 * Input.js
 * Handles keyboard, click, and mobile touch joystick inputs.
 */
export class Input {
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false
    };

    this.selectedFoodIndex = 0; // 0: Pizza, 1: Burger, 2: Taco
    this.onFireCallback = null;
    this.onFoodSwitchCallback = null;

    // Mobile Joystick parameters
    this.joystickActive = false;
    this.joystickStartPos = { x: 0, y: 0 };
    this.joystickCurPos = { x: 0, y: 0 };
    this.joystickVector = { x: 0, y: 0 }; // Values between -1 and 1

    this.initKeyboardListeners();
    this.initTouchListeners();
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.handleKey(e.key, true);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.key, false);
    });
  }

  handleKey(key, isPressed) {
    const keyLower = key.toLowerCase();

    // Driving Controls
    if (keyLower === 'w' || key === 'ArrowUp') {
      this.keys.forward = isPressed;
    }
    if (keyLower === 's' || key === 'ArrowDown') {
      this.keys.backward = isPressed;
    }
    if (keyLower === 'a' || key === 'ArrowLeft') {
      this.keys.left = isPressed;
    }
    if (keyLower === 'd' || key === 'ArrowRight') {
      this.keys.right = isPressed;
    }

    // Launch Food
    if (key === ' ' || keyLower === 'spacebar') {
      // Avoid browser scrolling
      event?.preventDefault();
      
      if (isPressed && !this.keys.space) {
        if (this.onFireCallback) this.onFireCallback();
      }
      this.keys.space = isPressed;
    }

    // Hotkeys for switching food items (1, 2, 3)
    if (isPressed) {
      if (key === '1') this.switchFood(0);
      if (key === '2') this.switchFood(1);
      if (key === '3') this.switchFood(2);
    }
  }

  switchFood(index) {
    if (index !== this.selectedFoodIndex) {
      this.selectedFoodIndex = index;
      if (this.onFoodSwitchCallback) {
        this.onFoodSwitchCallback(index);
      }
    }
  }

  initTouchListeners() {
    const joystickArea = document.getElementById('touch-joystick-area');
    const joystickKnob = document.getElementById('touch-joystick-knob');
    const fireBtn = document.getElementById('btn-mobile-fire');

    if (!joystickArea || !joystickKnob) return;

    // Prevent default scrolling on mobile touch inside joystick
    joystickArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = joystickArea.getBoundingClientRect();
      
      this.joystickActive = true;
      this.joystickStartPos = {
        x: touch.clientX,
        y: touch.clientY
      };
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!this.joystickActive) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.joystickStartPos.x;
      const deltaY = touch.clientY - this.joystickStartPos.y;
      
      // Limit joystick travel radius
      const maxDistance = 45; // pixels
      const distance = Math.min(maxDistance, Math.hypot(deltaX, deltaY));
      const angle = Math.atan2(deltaY, deltaX);

      // Translate knob position
      const moveX = Math.cos(angle) * distance;
      const moveY = Math.sin(angle) * distance;
      
      joystickKnob.style.transform = `translate(${moveX}px, ${moveY}px)`;

      // Map positions to game vectors: positive Y is forward driving
      this.joystickVector = {
        x: moveX / maxDistance,
        y: -moveY / maxDistance // Invert Y so up is positive driving force
      };

      // Set key equivalents based on vector
      this.keys.forward = this.joystickVector.y > 0.35;
      this.keys.backward = this.joystickVector.y < -0.35;
      this.keys.left = this.joystickVector.x < -0.3;
      this.keys.right = this.joystickVector.x > 0.3;
    }, { passive: true });

    const stopJoystick = () => {
      if (!this.joystickActive) return;
      this.joystickActive = false;
      joystickKnob.style.transform = 'translate(0px, 0px)';
      this.joystickVector = { x: 0, y: 0 };
      
      // Clear key states
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
    };

    window.addEventListener('touchend', stopJoystick);
    window.addEventListener('touchcancel', stopJoystick);

    // Mobile fire button
    if (fireBtn) {
      fireBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.onFireCallback) this.onFireCallback();
      });
    }

    // Switch buttons on mobile
    const switchers = [
      document.getElementById('btn-switch-1'),
      document.getElementById('btn-switch-2'),
      document.getElementById('btn-switch-3')
    ];

    switchers.forEach((btn, idx) => {
      if (btn) {
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.switchFood(idx);
          
          // Toggle UI state active
          switchers.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      }
    });

    // Also support mouse clicks for launching food (desktop backup)
    window.addEventListener('mousedown', (e) => {
      // Only fire if clicking on the main canvas (and not over UI panel overlays)
      if (e.target.id === 'game-canvas') {
        if (this.onFireCallback) this.onFireCallback();
      }
    });
  }
}
