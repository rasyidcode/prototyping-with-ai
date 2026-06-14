import * as Phaser from 'phaser';
import { Scene, Math as PhaserMath } from 'phaser';

// Sound effects synthesized using Web Audio API (zero asset dependencies)
class SoundEffects {
    private ctx: AudioContext | null = null;

    constructor() { }

    private init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playDrop() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playMerge(tier: number) {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        // Base note scales up with fruit tier (starts at C3 and rises)
        const baseFreq = 130.81 * Math.pow(1.122, tier * 1.5);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * 1.25, now + 0.08); // Perfect third chord step

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.22);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    playGameOver() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.7);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.7);

        osc.start(now);
        osc.stop(now + 0.7);
    }
}

// 11 Tiers of fruits with their properties
interface FruitConfig {
    name: string;
    radius: number;
    color: string;
    secondaryColor: string;
    borderColor: string;
}

const FRUIT_CONFIGS: FruitConfig[] = [
    { name: 'Cherry', radius: 16, color: '#FF3B30', secondaryColor: '#FF7D75', borderColor: '#8F1D1A' },       // 0
    { name: 'Strawberry', radius: 24, color: '#FF2D55', secondaryColor: '#FF7992', borderColor: '#9A1032' },   // 1
    { name: 'Grape', radius: 32, color: '#AF52DE', secondaryColor: '#D39DFA', borderColor: '#692694' },        // 2
    { name: 'Dekopon', radius: 40, color: '#FF9500', secondaryColor: '#FFC575', borderColor: '#B55A00' },      // 3
    { name: 'Persimmon', radius: 48, color: '#FFCC00', secondaryColor: '#FFE775', borderColor: '#B58B00' },    // 4
    { name: 'Apple', radius: 58, color: '#E63946', secondaryColor: '#FFA3A8', borderColor: '#9B2226' },        // 5
    { name: 'Pear', radius: 68, color: '#DDF20F', secondaryColor: '#EEFA75', borderColor: '#8B9B03' },         // 6
    { name: 'Peach', radius: 80, color: '#FFB3BA', secondaryColor: '#FFE3E5', borderColor: '#D07A84' },        // 7
    { name: 'Pineapple', radius: 94, color: '#FFD166', secondaryColor: '#FFE4A3', borderColor: '#C49726' },    // 8
    { name: 'Melon', radius: 108, color: '#4CD964', secondaryColor: '#96F2A3', borderColor: '#238734' },       // 9
    { name: 'Watermelon', radius: 124, color: '#2A9D8F', secondaryColor: '#63CBBF', borderColor: '#165B52' }   // 10
];

// Helper to draw cute faces on canvas
function drawCuteFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, style: number) {
    ctx.save();

    // Scale features based on radius
    const eyeSpacing = r * 0.35;
    const eyeY = cy - r * 0.05;
    const eyeSize = Math.max(2.5, r * 0.08);

    // Cheeks
    ctx.fillStyle = 'rgba(255, 105, 180, 0.45)';
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing - r * 0.04, eyeY + r * 0.14, r * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + eyeSpacing + r * 0.04, eyeY + r * 0.14, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1C1C24';
    if (style === 8) {
        // Pineapple: Sunglasses!
        ctx.strokeStyle = '#1C1C24';
        ctx.lineWidth = Math.max(2, r * 0.07);
        ctx.fillStyle = '#2A2A35';

        // Left glass
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing, eyeY, r * 0.17, 0, Math.PI, false);
        ctx.lineTo(cx - eyeSpacing + r * 0.17, eyeY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right glass
        ctx.beginPath();
        ctx.arc(cx + eyeSpacing, eyeY, r * 0.17, 0, Math.PI, false);
        ctx.lineTo(cx + eyeSpacing + r * 0.17, eyeY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bridge
        ctx.beginPath();
        ctx.moveTo(cx - eyeSpacing + r * 0.17, eyeY);
        ctx.lineTo(cx + eyeSpacing - r * 0.17, eyeY);
        ctx.stroke();
    } else if (style === 4) {
        // Persimmon: Sleeping eyes
        ctx.strokeStyle = '#1C1C24';
        ctx.lineWidth = Math.max(2.5, r * 0.07);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(cx - eyeSpacing - eyeSize, eyeY);
        ctx.lineTo(cx - eyeSpacing + eyeSize, eyeY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + eyeSpacing - eyeSize, eyeY);
        ctx.lineTo(cx + eyeSpacing + eyeSize, eyeY);
        ctx.stroke();
    } else if (style === 3) {
        // Dekopon: Wink!
        // Left eye open
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Left eye reflection
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing - eyeSize * 0.25, eyeY - eyeSize * 0.25, eyeSize * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Right eye winking curve
        ctx.strokeStyle = '#1C1C24';
        ctx.lineWidth = Math.max(2.5, r * 0.07);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx + eyeSpacing, eyeY + eyeSize * 0.2, eyeSize * 0.85, Math.PI, 0, false);
        ctx.stroke();
    } else {
        // Standard eyes
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(cx + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Eyes reflections
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing - eyeSize * 0.25, eyeY - eyeSize * 0.25, eyeSize * 0.3, 0, Math.PI * 2);
        ctx.arc(cx + eyeSpacing - eyeSize * 0.25, eyeY - eyeSize * 0.25, eyeSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mouth
    ctx.strokeStyle = '#1C1C24';
    ctx.fillStyle = '#FF4D6D';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const mouthY = cy + r * 0.14;

    if (style === 10 || style === 5 || style === 9) {
        // Big open happy mouth
        ctx.beginPath();
        ctx.arc(cx, mouthY, r * 0.14, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (style === 4) {
        // Neutral line mouth
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.07, mouthY);
        ctx.lineTo(cx + r * 0.07, mouthY);
        ctx.stroke();
    } else {
        // Smile curve
        ctx.beginPath();
        ctx.arc(cx, mouthY - r * 0.04, r * 0.09, 0, Math.PI, false);
        ctx.stroke();
    }
    ctx.restore();
}

export class Game extends Scene {
    // Game variables
    private score: number = 0;
    private highScore: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private highScoreText!: Phaser.GameObjects.Text;

    // Physics & active game items
    private activeFruits: any[] = [];
    private currentFruit: Phaser.GameObjects.Sprite | null = null;
    private nextFruitTier: number = 0;
    private nextFruitPreview!: Phaser.GameObjects.Image;
    private canDrop: boolean = true;
    private nextFruitId: number = 0;

    // Container coordinates
    private readonly containerLeft = 282;
    private readonly containerRight = 742;
    private readonly containerWidth = 460;
    private readonly containerBottom = 700;
    private readonly containerTop = 120;
    private readonly dangerLineY = 145;

    // Queues
    private mergesQueue: Array<{ spriteA: any, spriteB: any, isMax: boolean }> = [];

    // Game Over & Danger state
    private gameOver: boolean = false;
    private gameOverOverlay!: Phaser.GameObjects.Container;
    private dangerTime: number = 0;
    private dangerGraphics!: Phaser.GameObjects.Graphics;

    // Dropper guide line
    private guideLineGraphics!: Phaser.GameObjects.Graphics;

    // Sound Effects
    private soundEffects!: SoundEffects;

    constructor() {
        super('Game');
    }

    preload() {
        // No assets to pre-load; everything generated procedurally!
    }

    create() {
        // Initialize sound effects
        this.soundEffects = new SoundEffects();

        // Load high score
        this.highScore = parseInt(localStorage.getItem('suika_high_score') || '0', 10);

        // Generate procedural textures
        this.generateFruitTextures();
        this.generateParticleTexture();

        // 1. Draw elegant background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x11111E, 0x11111E, 0x07070F, 0x07070F, 1);
        bg.fillRect(0, 0, 1024, 768);

        // Slow animated background lava-lamp blobs
        const blob1 = this.add.circle(150, 200, 300, 0x9B5DE5, 0.035);
        const blob2 = this.add.circle(850, 500, 350, 0x00F5D4, 0.025);
        const blob3 = this.add.circle(500, 700, 250, 0xFF007F, 0.025);

        this.tweens.add({
            targets: blob1,
            x: 220,
            y: 260,
            duration: 14000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: blob2,
            x: 780,
            y: 420,
            duration: 17000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: blob3,
            x: 460,
            y: 640,
            duration: 11000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 2. Draw Glassmorphism Container background
        const containerBg = this.add.graphics();
        containerBg.fillStyle(0x16162A, 0.45);
        containerBg.fillRoundedRect(this.containerLeft, this.containerTop, this.containerWidth, this.containerBottom - this.containerTop, 10);

        // Draw elegant glowing container walls
        containerBg.lineStyle(3, 0x56567B, 0.6);
        containerBg.beginPath();
        containerBg.moveTo(this.containerLeft, this.containerTop);
        containerBg.lineTo(this.containerLeft, this.containerBottom);
        containerBg.lineTo(this.containerRight, this.containerBottom);
        containerBg.lineTo(this.containerRight, this.containerTop);
        containerBg.stroke();

        // 3. Setup Physics Walls
        const wallOptions = {
            isStatic: true,
            friction: 0.03,
            restitution: 0.15
        };
        // Left wall physics (invisible thick barrier extending high above container to prevent escape)
        const wallHeight = this.containerBottom + 200;
        const wallCenterY = (this.containerBottom - 200) / 2;
        this.matter.add.rectangle(this.containerLeft - 50, wallCenterY, 100, wallHeight, wallOptions);
        
        // Right wall physics (invisible thick barrier extending high above container to prevent escape)
        this.matter.add.rectangle(this.containerRight + 50, wallCenterY, 100, wallHeight, wallOptions);
        
        // Bottom wall physics (thick bottom wall to prevent fruits tunneling under pressure)
        this.matter.add.rectangle((this.containerLeft + this.containerRight) / 2, this.containerBottom + 50, this.containerWidth + 200, 100, wallOptions);

        // 4. Create Panels & UI Cards
        this.createLeftPanel();
        this.createRightPanel();

        // 5. Setup graphics overlays
        this.dangerGraphics = this.add.graphics().setDepth(10);
        this.guideLineGraphics = this.add.graphics().setDepth(5);

        // 6. Setup Matter Collisions
        this.matter.world.on('collisionstart', (event: any) => {
            event.pairs.forEach((pair: any) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;

                if (bodyA.gameObject && bodyB.gameObject) {
                    const spriteA = bodyA.gameObject;
                    const spriteB = bodyB.gameObject;

                    const tierA = spriteA.getData('tier');
                    const tierB = spriteB.getData('tier');
                    const idA = spriteA.getData('id');
                    const idB = spriteB.getData('id');
                    const isDroppedA = spriteA.getData('isDropped');
                    const isDroppedB = spriteB.getData('isDropped');

                    // Proceed only if they are matching tier fruits that have been dropped
                    if (tierA === tierB && isDroppedA && isDroppedB && idA !== undefined && idB !== undefined) {
                        const isMax = (tierA === 10);
                        if (!spriteA.getData('merging') && !spriteB.getData('merging')) {
                            spriteA.setData('merging', true);
                            spriteB.setData('merging', true);
                            this.mergesQueue.push({ spriteA, spriteB, isMax });
                        }
                    }
                }
            });
        });

        // 7. Setup Mouse Input
        this.input.on('pointermove', () => {
            this.updateDropper();
        });

        this.input.on('pointerdown', () => {
            // Check if pointer is clicked inside the drop column
            const px = this.input.activePointer.x;
            const py = this.input.activePointer.y;
            // Ignore if game is over, or we clicked on sidebar buttons
            if (px >= this.containerLeft && px <= this.containerRight && py < this.containerBottom) {
                this.handlePointerDown();
            }
        });

        // 8. Create Game Over Overlay (hidden by default)
        this.createGameOverOverlay();

        // 9. Start First Dropper
        this.nextFruitTier = PhaserMath.Between(0, 4);
        this.spawnDropperFruit();
    }

    update(_time: number, delta: number) {
        if (this.gameOver) return;

        // Process queue of mergers
        if (this.mergesQueue.length > 0) {
            this.processMerges();
        }

        // Check for Game Over condition
        this.checkGameOver(delta);

        // Keep dropper fruit updated
        this.updateDropper();
    }

    // --- Layout & UI Creation ---

    private drawRoundedCard(graphics: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, bg: number, border: number) {
        graphics.fillStyle(bg, 0.5);
        graphics.lineStyle(1.5, border, 0.45);
        graphics.fillRoundedRect(x, y, w, h, r);
        graphics.strokeRoundedRect(x, y, w, h, r);
    }

    private createLeftPanel() {
        const leftX = 20;

        // Logo Title Card
        const titleGraphics = this.add.graphics();
        this.drawRoundedCard(titleGraphics, leftX, 20, 230, 95, 12, 0x16162A, 0x9B5DE5);

        this.add.text(leftX + 115, 45, 'SUIKA', {
            fontFamily: 'Outfit', fontSize: '32px', color: '#FF9500', fontStyle: '900', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(leftX + 115, 80, 'FRUIT PUZZLE', {
            fontFamily: 'Outfit', fontSize: '18px', color: '#00F5D4', fontStyle: '800', letterSpacing: 3
        }).setOrigin(0.5);

        // Score Card
        const scoreGraphics = this.add.graphics();
        this.drawRoundedCard(scoreGraphics, leftX, 135, 230, 110, 12, 0x16162A, 0x56567B);

        this.add.text(leftX + 115, 160, 'SCORE', {
            fontFamily: 'Outfit', fontSize: '15px', color: '#A5A5C7', fontStyle: '600'
        }).setOrigin(0.5);

        this.scoreText = this.add.text(leftX + 115, 200, '0', {
            fontFamily: 'Outfit', fontSize: '42px', color: '#FFFFFF', fontStyle: '900'
        }).setOrigin(0.5);

        // Best Score Card
        const bestGraphics = this.add.graphics();
        this.drawRoundedCard(bestGraphics, leftX, 265, 230, 110, 12, 0x16162A, 0x56567B);

        this.add.text(leftX + 115, 290, 'BEST SCORE', {
            fontFamily: 'Outfit', fontSize: '15px', color: '#A5A5C7', fontStyle: '600'
        }).setOrigin(0.5);

        this.highScoreText = this.add.text(leftX + 115, 330, this.highScore.toString(), {
            fontFamily: 'Outfit', fontSize: '42px', color: '#FFD166', fontStyle: '900'
        }).setOrigin(0.5);

        // Interactive Restart Button
        const restartBtn = this.add.container(leftX, 395);
        const btnBg = this.add.graphics();
        this.drawRoundedCard(btnBg, 0, 0, 230, 56, 12, 0x2A1B3D, 0xE03E3E);
        restartBtn.add(btnBg);

        const btnText = this.add.text(115, 28, 'RESTART GAME', {
            fontFamily: 'Outfit', fontSize: '17px', color: '#FFE0E0', fontStyle: '700'
        }).setOrigin(0.5);
        restartBtn.add(btnText);

        restartBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 230, 56), Phaser.Geom.Rectangle.Contains);
        restartBtn.on('pointerover', () => {
            btnBg.clear();
            this.drawRoundedCard(btnBg, 0, 0, 230, 56, 12, 0x481E3D, 0xFF5A5A);
            restartBtn.setScale(1.02);
        });
        restartBtn.on('pointerout', () => {
            btnBg.clear();
            this.drawRoundedCard(btnBg, 0, 0, 230, 56, 12, 0x2A1B3D, 0xE03E3E);
            restartBtn.setScale(1.0);
        });
        restartBtn.on('pointerdown', () => {
            this.restartGame();
        });

        // Instructions Card
        const instrGraphics = this.add.graphics();
        this.drawRoundedCard(instrGraphics, leftX, 470, 230, 230, 12, 0x111122, 0x444455);

        this.add.text(leftX + 115, 495, 'HOW TO PLAY', {
            fontFamily: 'Outfit', fontSize: '14px', color: '#9B5DE5', fontStyle: '700'
        }).setOrigin(0.5);

        const instrs = [
            "• Move mouse to aim",
            "• Click/tap to drop fruit",
            "• Match same fruits to",
            "  merge them & grow!",
            "• Don't overflow the",
            "  flashing red line!"
        ];

        instrs.forEach((line, i) => {
            this.add.text(leftX + 22, 530 + i * 24, line, {
                fontFamily: 'Outfit', fontSize: '13px', color: '#A5A5C7', fontStyle: '500', align: 'left'
            });
        });
    }

    private createRightPanel() {
        const rightX = 774;

        // Next Fruit Preview Card
        const nextGraphics = this.add.graphics();
        this.drawRoundedCard(nextGraphics, rightX, 20, 230, 140, 12, 0x16162A, 0x56567B);

        this.add.text(rightX + 115, 42, 'NEXT FRUIT', {
            fontFamily: 'Outfit', fontSize: '15px', color: '#A5A5C7', fontStyle: '600'
        }).setOrigin(0.5);

        // Loading texture dynamically later
        this.nextFruitPreview = this.add.image(rightX + 115, 95, 'fruit_0').setDepth(2);

        // Evolution Guide Card
        const guideGraphics = this.add.graphics();
        this.drawRoundedCard(guideGraphics, rightX, 180, 230, 520, 12, 0x16162A, 0x56567B);

        this.add.text(rightX + 115, 205, 'EVOLUTION PATH', {
            fontFamily: 'Outfit', fontSize: '14px', color: '#00F5D4', fontStyle: '700'
        }).setOrigin(0.5);

        // Create mini fruit chain
        const startY = 230;
        const spacing = 43;

        FRUIT_CONFIGS.forEach((config, i) => {
            const y = startY + i * spacing;

            // Add tiny thumbnail image
            const thumb = this.add.image(rightX + 35, y, `fruit_${i}`).setDepth(2);
            // Thumb scale to diameter ~ 20px
            thumb.setScale(Math.min(1.0, 13 / config.radius));

            // Name label
            this.add.text(rightX + 65, y, config.name, {
                fontFamily: 'Outfit', fontSize: '12px', color: '#FFFFFF', fontStyle: '600'
            }).setOrigin(0, 0.5);

            // Points label
            this.add.text(rightX + 205, y, `+${(i + 1) * 2}`, {
                fontFamily: 'Outfit', fontSize: '11px', color: '#FFD166', fontStyle: '700'
            }).setOrigin(1, 0.5);

            // Arrow down if not last
            if (i < 10) {
                this.add.text(rightX + 35, y + spacing / 2, '↓', {
                    fontFamily: 'Outfit', fontSize: '11px', color: '#56567B', fontStyle: '900'
                }).setOrigin(0.5);
            }
        });
    }

    private createGameOverOverlay() {
        this.gameOverOverlay = this.add.container(0, 0).setDepth(1000).setVisible(false);

        // Backing
        const back = this.add.graphics();
        back.fillStyle(0x07070F, 0.88);
        back.fillRect(0, 0, 1024, 768);
        this.gameOverOverlay.add(back);

        // Card Panel
        const cardX = 362;
        const cardY = 184;
        const cardW = 300;
        const cardH = 380;

        const cardGraphics = this.add.graphics();
        this.drawRoundedCard(cardGraphics, cardX, cardY, cardW, cardH, 16, 0x16162A, 0x9B5DE5);
        this.gameOverOverlay.add(cardGraphics);

        // Text
        const title = this.add.text(512, 235, 'GAME OVER', {
            fontFamily: 'Outfit', fontSize: '38px', color: '#FF3B30', fontStyle: '900'
        }).setOrigin(0.5);
        this.gameOverOverlay.add(title);

        const scoreLabel = this.add.text(512, 300, 'FINAL SCORE', {
            fontFamily: 'Outfit', fontSize: '14px', color: '#A5A5C7', fontStyle: '600'
        }).setOrigin(0.5);
        this.gameOverOverlay.add(scoreLabel);

        const finalScoreVal = this.add.text(512, 345, '0', {
            fontFamily: 'Outfit', fontSize: '48px', color: '#FFFFFF', fontStyle: '900'
        }).setOrigin(0.5);
        this.gameOverOverlay.add(finalScoreVal);

        // Listen for when overlay becomes visible to update the finalScoreVal
        this.events.on('updatefinalscore', (score: number) => {
            finalScoreVal.setText(score.toString());
        });

        // Play Again Button Container
        const playAgainBtn = this.add.container(512, 450);
        const playAgainBg = this.add.graphics();
        this.drawRoundedCard(playAgainBg, -110, -26, 220, 52, 12, 0x00F5D4, 0x6EFFF2);
        playAgainBtn.add(playAgainBg);

        const playAgainText = this.add.text(0, 0, 'PLAY AGAIN', {
            fontFamily: 'Outfit', fontSize: '18px', color: '#0A0A14', fontStyle: '800'
        }).setOrigin(0.5);
        playAgainBtn.add(playAgainText);

        playAgainBtn.setInteractive(new Phaser.Geom.Rectangle(-110, -26, 220, 52), Phaser.Geom.Rectangle.Contains);
        playAgainBtn.on('pointerover', () => {
            playAgainBg.clear();
            this.drawRoundedCard(playAgainBg, -110, -26, 220, 52, 12, 0x33FFEA, 0xAAFFF7);
            playAgainBtn.setScale(1.03);
        });
        playAgainBtn.on('pointerout', () => {
            playAgainBg.clear();
            this.drawRoundedCard(playAgainBg, -110, -26, 220, 52, 12, 0x00F5D4, 0x6EFFF2);
            playAgainBtn.setScale(1.0);
        });
        playAgainBtn.on('pointerdown', () => {
            this.restartGame();
        });
        this.gameOverOverlay.add(playAgainBtn);
    }

    // --- Textures Generation ---

    private generateFruitTextures() {
        FRUIT_CONFIGS.forEach((config, idx) => {
            const r = config.radius;
            // Larger canvas padding to draw leaves/stems extending outside boundary safely
            const size = Math.ceil(r * 2.6);
            const cx = size / 2;
            const cy = size / 2;

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, size, size);

            // Draw decorations that sit behind the fruit body
            ctx.save();
            if (idx === 0) {
                // Cherry stem
                ctx.strokeStyle = '#4CD964';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx, cy - r + 3);
                ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 1.1, cx + r * 0.8, cy - r * 1.35);
                ctx.stroke();

                // Stem Leaf
                ctx.fillStyle = '#4CD964';
                ctx.beginPath();
                ctx.ellipse(cx + r * 0.45, cy - r * 1.15, 3.5, 7, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (idx === 1) {
                // Strawberry leaf crown
                ctx.fillStyle = '#4CD964';
                for (let angle = -Math.PI / 4; angle <= Math.PI / 4; angle += Math.PI / 8) {
                    ctx.save();
                    ctx.translate(cx, cy - r + 3);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-5, -r * 0.32);
                    ctx.lineTo(5, -r * 0.32);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            } else if (idx === 2) {
                // Grape stem
                ctx.strokeStyle = '#8B5A2B';
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx, cy - r + 3);
                ctx.quadraticCurveTo(cx - 3, cy - r - 8, cx - 1, cy - r - 12);
                ctx.stroke();
            } else if (idx === 3) {
                // Dekopon orange bump
                ctx.fillStyle = config.color;
                ctx.beginPath();
                ctx.arc(cx, cy - r + 4, r * 0.28, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = config.borderColor;
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Leaf
                ctx.fillStyle = '#4CD964';
                ctx.beginPath();
                ctx.ellipse(cx + 4, cy - r - 2, 3, 6.5, Math.PI / 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (idx === 4) {
                // Persimmon leaf cap
                ctx.fillStyle = '#2C4A08';
                for (let i = 0; i < 4; i++) {
                    ctx.save();
                    ctx.translate(cx, cy - r + 5);
                    ctx.rotate((i * Math.PI) / 2);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r * 0.12, r * 0.28, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            } else if (idx === 5) {
                // Apple brown stem
                ctx.strokeStyle = '#8B5A2B';
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx, cy - r + 5);
                ctx.quadraticCurveTo(cx - 4, cy - r - 9, cx - 7, cy - r - 16);
                ctx.stroke();

                // Leaf
                ctx.fillStyle = '#4CD964';
                ctx.beginPath();
                ctx.ellipse(cx - 3, cy - r - 9, 4.5, 9, -Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (idx === 6) {
                // Pear brown stem
                ctx.strokeStyle = '#8B5A2B';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(cx, cy - r * 1.1 + 5);
                ctx.quadraticCurveTo(cx + 4, cy - r * 1.1 - 9, cx + 8, cy - r * 1.1 - 15);
                ctx.stroke();
            } else if (idx === 7) {
                // Peach stem & leaf
                ctx.strokeStyle = '#8B5A2B';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx, cy - r + 2);
                ctx.quadraticCurveTo(cx + 4, cy - r - 4, cx + 6, cy - r - 7);
                ctx.stroke();

                ctx.fillStyle = '#4CD964';
                ctx.beginPath();
                ctx.ellipse(cx - r * 0.2, cy - r + 2, r * 0.09, r * 0.24, -Math.PI / 6, 0, Math.PI * 2);
                ctx.fill();
            } else if (idx === 8) {
                // Pineapple spiky crown
                ctx.fillStyle = '#238734';
                for (let i = -2; i <= 2; i++) {
                    ctx.save();
                    ctx.translate(cx + i * r * 0.16, cy - r + 6);
                    ctx.rotate((i * Math.PI) / 12);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-r * 0.12, -r * 0.44 + Math.abs(i) * 5);
                    ctx.lineTo(r * 0.12, -r * 0.44 + Math.abs(i) * 5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            } else if (idx === 9) {
                // Melon curly T stem
                ctx.strokeStyle = '#7AE582';
                ctx.lineWidth = 5.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx, cy - r + 3);
                ctx.lineTo(cx, cy - r - 12);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(cx - 9, cy - r - 12, 9, 0, Math.PI, true);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx + 9, cy - r - 12, 9, Math.PI, 0, false);
                ctx.stroke();
            }
            ctx.restore();

            // Draw Main Fruit Body
            ctx.save();
            if (idx === 6) {
                // Pear shape contour
                ctx.beginPath();
                ctx.arc(cx, cy + r * 0.18, r * 0.9, 0, Math.PI * 2);
                ctx.closePath();

                const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
                grad.addColorStop(0, config.secondaryColor);
                grad.addColorStop(1, config.color);
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(cx, cy - r * 0.35, r * 0.65, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.arc(cx, cy - r * 0.35, r * 0.65, Math.PI * 0.9, Math.PI * 2.1, false);
                ctx.arc(cx, cy + r * 0.18, r * 0.9, -Math.PI * 0.15, Math.PI * 1.15, false);
                ctx.closePath();

                ctx.strokeStyle = config.borderColor;
                ctx.lineWidth = Math.max(3, r * 0.055);
                ctx.stroke();
            } else {
                // Circular fruit body
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.closePath();

                const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.12, cx, cy, r);
                grad.addColorStop(0, config.secondaryColor);
                grad.addColorStop(0.86, config.color);
                grad.addColorStop(1, config.borderColor);
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.strokeStyle = config.borderColor;
                ctx.lineWidth = Math.max(3, r * 0.05);
                ctx.stroke();
            }
            ctx.restore();

            // Draw Interior Textures
            ctx.save();
            if (idx === 1) {
                // Strawberry seeds
                ctx.fillStyle = '#FFEB60';
                const rows = [
                    { y: -r * 0.5, c: 3 },
                    { y: -r * 0.2, c: 5 },
                    { y: r * 0.1, c: 6 },
                    { y: r * 0.4, c: 4 },
                    { y: r * 0.7, c: 2 }
                ];
                rows.forEach(row => {
                    const py = cy + row.y;
                    for (let s = 0; s < row.c; s++) {
                        const angle = ((s - (row.c - 1) / 2) * Math.PI) / (row.c + 1.2);
                        const px = cx + Math.sin(angle) * r * 0.7;
                        ctx.beginPath();
                        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            } else if (idx === 7) {
                // Peach cleft line
                ctx.strokeStyle = 'rgba(218, 97, 126, 0.45)';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(cx - r, cy, r, -0.28, 0.28);
                ctx.stroke();
            } else if (idx === 8) {
                // Pineapple cross-hatch pattern
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r - 3.5, 0, Math.PI * 2);
                ctx.clip();
                ctx.strokeStyle = 'rgba(196, 122, 10, 0.35)';
                ctx.lineWidth = 2.5;
                const sp = r * 0.3;
                for (let k = -r * 2; k < r * 2; k += sp) {
                    ctx.beginPath();
                    ctx.moveTo(cx + k, cy - r);
                    ctx.lineTo(cx + k - r * 2, cy + r);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(cx + k, cy - r);
                    ctx.lineTo(cx + k + r * 2, cy + r);
                    ctx.stroke();
                }
                ctx.restore();
            } else if (idx === 9) {
                // Melon netting
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r - 3.5, 0, Math.PI * 2);
                ctx.clip();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
                ctx.lineWidth = 1.8;
                const sp = r * 0.25;
                for (let yo = -r * 1.5; yo < r * 1.5; yo += sp) {
                    ctx.beginPath();
                    for (let xo = -r; xo <= r; xo += 4) {
                        const x = cx + xo;
                        const y = cy + yo + Math.sin(xo * 0.05) * 4.5;
                        if (xo === -r) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                for (let xo = -r * 1.5; xo < r * 1.5; xo += sp) {
                    ctx.beginPath();
                    for (let yo = -r; yo <= r; yo += 4) {
                        const y = cy + yo;
                        const x = cx + xo + Math.sin(yo * 0.05) * 4.5;
                        if (yo === -r) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            } else if (idx === 10) {
                // Watermelon vertical stripes
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r - 3.5, 0, Math.PI * 2);
                ctx.clip();
                ctx.strokeStyle = 'rgba(12, 55, 34, 0.65)';
                ctx.lineWidth = r * 0.12;
                ctx.lineJoin = 'miter';
                const sp = r * 0.35;
                for (let off = -r * 1.5; off < r * 1.5; off += sp) {
                    const sx = cx + off;
                    ctx.beginPath();
                    ctx.moveTo(sx, cy - r);
                    let step = r * 0.2;
                    for (let cyy = cy - r; cyy <= cy + r; cyy += step) {
                        const amp = r * 0.055 * (cyy % (step * 2) === 0 ? 1 : -1);
                        ctx.lineTo(sx + amp, cyy);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }
            ctx.restore();

            // Face
            drawCuteFace(ctx, cx, cy, r, idx);

            // Shading glossy highlights
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.ellipse(cx - r * 0.4, cy - r * 0.4, r * 0.14, r * 0.24, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Register texture
            const key = `fruit_${idx}`;
            if (this.textures.exists(key)) {
                this.textures.remove(key);
            }
            this.textures.addCanvas(key, canvas);
        });
    }

    private generateParticleTexture() {
        const size = 12;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(6, 6, 6, 0, Math.PI * 2);
            ctx.fill();
            this.textures.addCanvas('particle', canvas);
        }
    }

    // --- Core Game Functions ---

    private spawnDropperFruit() {
        if (this.gameOver) return;

        const tier = this.nextFruitTier;

        // Choose next tier (0 to 4)
        this.nextFruitTier = PhaserMath.Between(0, 4);

        // Update sidebar preview
        this.nextFruitPreview.setTexture(`fruit_${this.nextFruitTier}`);
        this.nextFruitPreview.setScale(Math.min(1.0, 42 / FRUIT_CONFIGS[this.nextFruitTier].radius));

        // Center on pointer clamp
        const px = this.input.activePointer.x;
        const radius = FRUIT_CONFIGS[tier].radius;
        const clampedX = PhaserMath.Clamp(px, this.containerLeft + radius, this.containerRight - radius);

        this.currentFruit = this.add.sprite(clampedX, 85, `fruit_${tier}`);
        this.currentFruit.setData('tier', tier);
        this.currentFruit.setData('isDropped', false);
        this.currentFruit.setDepth(3);

        // Scale pop animation
        this.currentFruit.setScale(0);
        this.tweens.add({
            targets: this.currentFruit,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
    }

    private updateDropper() {
        if (this.gameOver || !this.currentFruit) {
            this.guideLineGraphics.clear();
            return;
        }

        const tier = this.currentFruit.getData('tier') as number;
        const radius = FRUIT_CONFIGS[tier].radius;
        const px = this.input.activePointer.x;

        const clampedX = PhaserMath.Clamp(px, this.containerLeft + radius, this.containerRight - radius);
        this.currentFruit.x = clampedX;

        // Draw helper guide line
        this.guideLineGraphics.clear();
        this.guideLineGraphics.lineStyle(2, 0xffffff, 0.16);

        const startY = 85 + radius;
        const endY = this.containerBottom;
        const dash = 9;
        const gap = 5;

        let curY = startY;
        while (curY < endY) {
            this.guideLineGraphics.beginPath();
            this.guideLineGraphics.moveTo(clampedX, curY);
            this.guideLineGraphics.lineTo(clampedX, Math.min(curY + dash, endY));
            this.guideLineGraphics.stroke();
            curY += dash + gap;
        }
    }

    private handlePointerDown() {
        if (this.gameOver || !this.canDrop || !this.currentFruit) return;

        const x = this.currentFruit.x;
        const y = this.currentFruit.y;
        const tier = this.currentFruit.getData('tier') as number;

        // Clean up preview
        this.currentFruit.destroy();
        this.currentFruit = null;
        this.canDrop = false;

        // Sound
        this.soundEffects.playDrop();

        // Spawn physics fruit
        this.spawnFruit(x, y, tier, true);

        // Delayed spawn of the next fruit
        this.time.delayedCall(550, () => {
            if (!this.gameOver) {
                this.spawnDropperFruit();
                this.canDrop = true;
            }
        });
    }

    private spawnFruit(x: number, y: number, tier: number, isPhysics: boolean) {
        const config = FRUIT_CONFIGS[tier];
        const key = `fruit_${tier}`;

        let sprite: any;
        if (isPhysics) {
            sprite = this.matter.add.sprite(x, y, key);
            sprite.setCircle(config.radius, {
                label: 'fruit',
                restitution: 0.12,
                friction: 0.08,
                frictionAir: 0.015,
                mass: 2 + tier // stable linear mass curve (2 to 12) to prevent crushing tunneling
            });
            sprite.setData('tier', tier);
            sprite.setData('id', this.nextFruitId++);
            sprite.setData('isDropped', true);
            this.activeFruits.push(sprite);
        } else {
            sprite = this.add.sprite(x, y, key);
            sprite.setData('tier', tier);
            sprite.setData('isDropped', false);
        }

        sprite.setScale(0);
        sprite.setDepth(3);
        this.tweens.add({
            targets: sprite,
            scale: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });

        return sprite;
    }

    private processMerges() {
        this.mergesQueue.forEach(merge => {
            const { spriteA, spriteB, isMax } = merge;

            if (!spriteA.active || !spriteB.active) return;

            const tier = spriteA.getData('tier') as number;
            const xA = spriteA.x;
            const yA = spriteA.y;
            const xB = spriteB.x;
            const yB = spriteB.y;

            // Merge position (midpoint)
            const midX = (xA + xB) / 2;
            const midY = (yA + yB) / 2;

            // Remove from active tracking list
            this.activeFruits = this.activeFruits.filter(f => f !== spriteA && f !== spriteB);

            // Destroy sprites & physics bodies
            spriteA.destroy();
            spriteB.destroy();

            // Play synthesis merge sound
            this.soundEffects.playMerge(tier);

            // Increment Score
            const pts = (tier + 1) * 2;
            this.updateScore(pts);

            // Merge particles
            this.createMergeParticles(midX, midY, FRUIT_CONFIGS[tier].color);

            if (!isMax) {
                // Spawn higher-tier fruit
                const nextTier = tier + 1;
                this.spawnFruit(midX, midY, nextTier, true);

                // Pop text popup
                this.showScorePopup(midX, midY, `+${pts}`);
            } else {
                // Two max melons merged! Double scoring plus cool blast!
                this.updateScore(150);
                this.showScorePopup(midX, midY, 'MAX FRUIT MERGE! +150', true);
                this.createSuperMergeParticles(midX, midY);
            }
        });

        this.mergesQueue = [];
    }

    private updateScore(amount: number) {
        this.score += amount;
        this.scoreText.setText(this.score.toString());

        // Scale pulse score text
        this.tweens.add({
            targets: this.scoreText,
            scale: 1.15,
            duration: 90,
            yoyo: true,
            repeat: 0
        });

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreText.setText(this.highScore.toString());
        }
    }

    private createMergeParticles(x: number, y: number, colorHex: string) {
        const color = Phaser.Display.Color.HexStringToColor(colorHex).color;

        for (let i = 0; i < 14; i++) {
            const p = this.add.image(x, y, 'particle').setDepth(200);
            p.setTint(color);
            p.setScale(PhaserMath.FloatBetween(0.5, 1.2));

            const angle = PhaserMath.FloatBetween(0, Math.PI * 2);
            const speed = PhaserMath.FloatBetween(50, 180);
            const vx = Math.cos(angle) * speed * 0.08;
            const vy = Math.sin(angle) * speed * 0.08;

            this.tweens.add({
                targets: p,
                x: x + vx * 120,
                y: y + vy * 120,
                alpha: 0,
                scale: 0,
                duration: PhaserMath.Between(400, 600),
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }

    private createSuperMergeParticles(x: number, y: number) {
        // High density multicolor explosion
        const colors = [0xFF3B30, 0x00F5D4, 0xFFD166, 0x9B5DE5];

        for (let i = 0; i < 35; i++) {
            const color = Phaser.Utils.Array.GetRandom(colors);
            const p = this.add.image(x, y, 'particle').setDepth(200);
            p.setTint(color);
            p.setScale(PhaserMath.FloatBetween(0.8, 1.8));

            const angle = PhaserMath.FloatBetween(0, Math.PI * 2);
            const speed = PhaserMath.FloatBetween(90, 280);
            const vx = Math.cos(angle) * speed * 0.08;
            const vy = Math.sin(angle) * speed * 0.08;

            this.tweens.add({
                targets: p,
                x: x + vx * 180,
                y: y + vy * 180,
                alpha: 0,
                scale: 0,
                duration: PhaserMath.Between(600, 900),
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }

    private showScorePopup(x: number, y: number, text: string, isSuper: boolean = false) {
        const popup = this.add.text(x, y, text, {
            fontFamily: 'Outfit',
            fontSize: isSuper ? '26px' : '18px',
            color: isSuper ? '#FFE055' : '#FFFFFF',
            stroke: '#05050A',
            strokeThickness: isSuper ? 5 : 3,
            fontStyle: '900'
        }).setOrigin(0.5).setDepth(210);

        this.tweens.add({
            targets: popup,
            y: y - 45,
            scale: isSuper ? 1.25 : 1.15,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => popup.destroy()
        });
    }

    private checkGameOver(delta: number) {
        let anyFruitAbove = false;

        this.activeFruits.forEach(fruit => {
            const tier = fruit.getData('tier') as number;
            const r = FRUIT_CONFIGS[tier].radius;
            const topY = fruit.y - r;
            const isDropped = fruit.getData('isDropped');

            if (isDropped && topY < this.dangerLineY) {
                // Double check if it has settled
                const body = fruit.body as any;
                if (body && Math.abs(body.velocity.y) < 0.15 && Math.abs(body.velocity.x) < 0.15) {
                    anyFruitAbove = true;
                }
            }
        });

        this.dangerGraphics.clear();

        if (anyFruitAbove) {
            this.dangerTime += delta;

            // Flashing warning lines
            const isFlash = Math.floor(this.time.now / 150) % 2 === 0;
            this.dangerGraphics.lineStyle(3.5, isFlash ? 0xFF3B30 : 0xFFCC00, 0.85);
            this.dangerGraphics.beginPath();
            this.dangerGraphics.moveTo(this.containerLeft, this.dangerLineY);
            this.dangerGraphics.lineTo(this.containerRight, this.dangerLineY);
            this.dangerGraphics.stroke();

            if (this.dangerTime >= 1600) {
                this.triggerGameOver();
            }
        } else {
            this.dangerTime = 0;
            // Normal styling
            this.dangerGraphics.lineStyle(2.5, 0xE03E3E, 0.25);
            this.dangerGraphics.beginPath();
            this.dangerGraphics.moveTo(this.containerLeft, this.dangerLineY);
            this.dangerGraphics.lineTo(this.containerRight, this.dangerLineY);
            this.dangerGraphics.stroke();
        }
    }

    private triggerGameOver() {
        this.gameOver = true;
        this.soundEffects.playGameOver();

        // Save High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('suika_high_score', this.highScore.toString());
            this.highScoreText.setText(this.highScore.toString());
        }

        // Show overlay & trigger event to update score display inside overlay
        this.events.emit('updatefinalscore', this.score);
        this.gameOverOverlay.setVisible(true);
        this.gameOverOverlay.setAlpha(0);

        this.tweens.add({
            targets: this.gameOverOverlay,
            alpha: 1,
            duration: 350,
            ease: 'Power2'
        });
    }

    private restartGame() {
        // Clear active items
        this.activeFruits.forEach(f => f.destroy());
        this.activeFruits = [];

        // Reset state
        this.score = 0;
        this.scoreText.setText('0');
        this.gameOver = false;
        this.canDrop = true;
        this.dangerTime = 0;
        this.mergesQueue = [];

        // Clear graphics
        this.dangerGraphics.clear();
        this.guideLineGraphics.clear();

        // Hide overlay
        this.gameOverOverlay.setVisible(false);

        // Clean current fruit
        if (this.currentFruit) {
            this.currentFruit.destroy();
            this.currentFruit = null;
        }

        // Reload
        this.nextFruitTier = PhaserMath.Between(0, 4);
        this.spawnDropperFruit();
    }
}
