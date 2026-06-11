import Phaser from "phaser";
import "./style.css";

type Phase = "run" | "boss" | "won" | "lost";
type UpgradeKind = "damage" | "rate" | "spread" | "health";

const LANES = [-1, 0, 1] as const;
const RUN_DISTANCE = 1450;
const PLAYER_Y_RATIO = 0.82;
const HORIZON_Y_RATIO = 0.22;
const SHOOT_DEPTH = 0.5;

interface LaneEntity {
  lane: number;
  depth: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
}

interface Enemy extends LaneEntity {
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  boss?: boolean;
  hpBack?: Phaser.GameObjects.Rectangle;
  hpFill?: Phaser.GameObjects.Rectangle;
}

interface Coin extends LaneEntity {
  value: number;
}

interface Gate extends LaneEntity {
  kind: UpgradeKind;
  label: Phaser.GameObjects.Text;
  frame: Phaser.GameObjects.Rectangle;
  used: boolean;
}

interface Bullet {
  lane: number;
  depth: number;
  damage: number;
  sprite: Phaser.GameObjects.Image;
}

class RunnerScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Image;
  private playerLane = 1;
  private targetLane = 1;
  private distance = 0;
  private phase: Phase = "run";
  private runCount = 1;
  private health = 100;
  private maxHealth = 100;
  private coins = 0;
  private damage = 18;
  private fireDelay = 330;
  private spread = 1;
  private lastShot = 0;
  private nextEnemy = 0;
  private nextCoin = 120;
  private nextGate = 260;
  private boss: Enemy | null = null;
  private enemies: Enemy[] = [];
  private coinsOnTrack: Coin[] = [];
  private gates: Gate[] = [];
  private bullets: Bullet[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private hud!: {
    coins: Phaser.GameObjects.Text;
    health: Phaser.GameObjects.Text;
    weapon: Phaser.GameObjects.Text;
    progressFill: Phaser.GameObjects.Rectangle;
    bossGroup: Phaser.GameObjects.Container;
    bossFill: Phaser.GameObjects.Rectangle;
    overlay: Phaser.GameObjects.Container;
  };

  constructor() {
    super("RunnerScene");
  }

  preload() {
    this.createTextures();
  }

  create() {
    this.cameras.main.setBackgroundColor("#17191f");
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.createTrack();
    this.createPlayer();
    this.createHud();
    this.createControls();
    this.resetRun();
  }

  update(time: number, deltaMs: number) {
    const delta = deltaMs / 1000;
    this.handleInput();
    this.updatePlayer(delta);

    if (this.phase === "run") {
      this.distance += 118 * delta;
      this.spawnRunObjects();
      if (this.distance >= RUN_DISTANCE) {
        this.startBoss();
      }
    }

    if (this.phase === "run" || this.phase === "boss") {
      this.autoShoot(time);
      this.updateBullets(delta);
      this.updateEnemies(delta);
      this.updateCoins(delta);
      this.updateGates(delta);
      this.updateHud();
    }
  }

  private createTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x47d18c);
    g.fillRoundedRect(6, 10, 28, 40, 10);
    g.fillStyle(0xe9f4ff);
    g.fillCircle(20, 12, 10);
    g.fillStyle(0x23252d);
    g.fillRect(17, 3, 6, 20);
    g.generateTexture("player", 40, 56);
    g.clear();

    g.fillStyle(0x8ed957);
    g.fillRoundedRect(7, 12, 34, 38, 8);
    g.fillStyle(0x658b45);
    g.fillCircle(24, 13, 12);
    g.fillStyle(0xf05555);
    g.fillCircle(18, 12, 3);
    g.fillCircle(30, 12, 3);
    g.generateTexture("zombie", 48, 58);
    g.clear();

    g.fillStyle(0x6f58ff);
    g.fillRoundedRect(10, 8, 56, 58, 12);
    g.fillStyle(0xa394ff);
    g.fillCircle(38, 18, 16);
    g.fillStyle(0x2c245f);
    g.fillRect(20, 38, 36, 12);
    g.generateTexture("boss", 76, 76);
    g.clear();

    g.fillStyle(0xffd34f);
    g.fillCircle(16, 16, 13);
    g.lineStyle(3, 0xfff1a0);
    g.strokeCircle(16, 16, 9);
    g.generateTexture("coin", 32, 32);
    g.clear();

    g.fillStyle(0x7ce7ff);
    g.fillRoundedRect(6, 2, 12, 24, 6);
    g.generateTexture("bullet", 24, 28);
    g.clear();

    g.fillStyle(0xffffff);
    g.fillCircle(20, 20, 20);
    g.generateTexture("spark", 40, 40);
    g.destroy();
  }

  private createTrack() {
    const { width, height } = this.scale;
    const horizonY = height * HORIZON_Y_RATIO;
    const playerY = height * PLAYER_Y_RATIO;
    const road = this.add.graphics();

    road.fillStyle(0x242833);
    road.fillPoints(
      [
        new Phaser.Geom.Point(width * 0.42, horizonY),
        new Phaser.Geom.Point(width * 0.58, horizonY),
        new Phaser.Geom.Point(width * 0.98, height),
        new Phaser.Geom.Point(width * 0.02, height)
      ],
      true
    );

    road.lineStyle(2, 0x3a4050, 0.85);
    for (let i = 0; i < 4; i += 1) {
      const xTop = Phaser.Math.Linear(width * 0.42, width * 0.58, i / 3);
      const xBottom = Phaser.Math.Linear(width * 0.02, width * 0.98, i / 3);
      road.lineBetween(xTop, horizonY, xBottom, height);
    }

    for (let i = 0; i < 9; i += 1) {
      const t = i / 9;
      const y = Phaser.Math.Linear(horizonY, playerY, t);
      const left = this.laneX(0, t) - 90 * t;
      const right = this.laneX(2, t) + 90 * t;
      road.lineStyle(1, 0x444c60, 0.45);
      road.lineBetween(left, y, right, y);
    }

    this.add.text(width / 2, 22, "LANE RUNNER", {
      color: "#f5f7fb",
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "700"
    }).setOrigin(0.5, 0);
  }

  private createPlayer() {
    this.playerBody = this.add.image(0, 0, "player");
    const muzzle = this.add.rectangle(0, -25, 7, 22, 0x3b3f4d);
    const shadow = this.add.ellipse(0, 22, 54, 16, 0x000000, 0.28);
    this.player = this.add.container(0, 0, [shadow, this.playerBody, muzzle]);
    this.player.setDepth(1000);
  }

  private createHud() {
    const { width, height } = this.scale;
    this.hud = {
      coins: this.add.text(14, 14, "", this.hudStyle(18)).setDepth(2000),
      health: this.add.text(14, 42, "", this.hudStyle(14)).setDepth(2000),
      weapon: this.add.text(width - 14, 14, "", this.hudStyle(14)).setOrigin(1, 0).setDepth(2000),
      progressFill: this.add.rectangle(14, 76, 1, 8, 0x47d18c).setOrigin(0, 0.5).setDepth(2000),
      bossGroup: this.add.container(width / 2, 82).setDepth(2000),
      bossFill: this.add.rectangle(0, 0, 1, 10, 0xff5c5c).setOrigin(0, 0.5),
      overlay: this.add.container(width / 2, height / 2).setDepth(3000).setVisible(false)
    };

    this.add.rectangle(14, 76, width - 28, 8, 0x2d3340).setOrigin(0, 0.5).setDepth(1999);
    const bossBack = this.add.rectangle(-130, 0, 260, 10, 0x2d3340).setOrigin(0, 0.5);
    const bossLabel = this.add.text(0, -28, "BOSS", this.hudStyle(15)).setOrigin(0.5);
    this.hud.bossGroup.add([bossLabel, bossBack, this.hud.bossFill]);
    this.hud.bossGroup.setVisible(false);
  }

  private createControls() {
    const { width, height } = this.scale;
    const left = this.add.text(30, height - 82, "‹", {
      color: "#ffffff",
      fontSize: "46px",
      fontStyle: "700",
      backgroundColor: "#2f3442aa",
      padding: { left: 22, right: 22, top: 4, bottom: 8 }
    }).setInteractive().setDepth(2200);
    const right = this.add.text(width - 30, height - 82, "›", {
      color: "#ffffff",
      fontSize: "46px",
      fontStyle: "700",
      backgroundColor: "#2f3442aa",
      padding: { left: 22, right: 22, top: 4, bottom: 8 }
    }).setOrigin(1, 0).setInteractive().setDepth(2200);

    left.on("pointerdown", () => this.moveLane(-1));
    right.on("pointerdown", () => this.moveLane(1));

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - this.swipeStartX;
      const dy = pointer.y - this.swipeStartY;
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.35) {
        this.moveLane(dx > 0 ? 1 : -1);
      }
    });
  }

  private resetRun() {
    this.clearEntities();
    this.phase = "run";
    this.distance = 0;
    this.health = this.maxHealth;
    this.playerLane = 1;
    this.targetLane = 1;
    this.damage = 18 + (this.runCount - 1) * 2;
    this.fireDelay = 330;
    this.spread = 1;
    this.nextEnemy = 40;
    this.nextCoin = 100;
    this.nextGate = 270;
    this.boss = null;
    this.hud.overlay.setVisible(false);
    this.hud.bossGroup.setVisible(false);
    this.updatePlayer(1);
    this.updateHud();
  }

  private handleInput() {
    if (this.phase === "won" || this.phase === "lost") {
      return;
    }
    if (this.justDown(this.cursors.left) || this.justDown(this.keyA)) {
      this.moveLane(-1);
    }
    if (this.justDown(this.cursors.right) || this.justDown(this.keyD)) {
      this.moveLane(1);
    }
  }

  private justDown(key?: Phaser.Input.Keyboard.Key) {
    return Boolean(key && Phaser.Input.Keyboard.JustDown(key));
  }

  private moveLane(direction: number) {
    if (this.phase === "won" || this.phase === "lost") {
      return;
    }
    this.targetLane = Phaser.Math.Clamp(this.targetLane + direction, 0, 2);
  }

  private updatePlayer(delta: number) {
    this.playerLane = Phaser.Math.Linear(this.playerLane, this.targetLane, Math.min(1, delta * 12));
    const y = this.scale.height * PLAYER_Y_RATIO;
    this.player.setPosition(this.laneX(this.playerLane, 1), y);
  }

  private spawnRunObjects() {
    const difficulty = 1 + (this.runCount - 1) * 0.16;
    if (this.distance >= this.nextEnemy) {
      this.spawnEnemy(Phaser.Math.Between(0, 2), 0, false, difficulty);
      this.nextEnemy += Phaser.Math.Between(92, 145);
    }
    if (this.distance >= this.nextCoin) {
      this.spawnCoin(Phaser.Math.Between(0, 2), 0);
      this.nextCoin += Phaser.Math.Between(72, 118);
    }
    if (this.distance >= this.nextGate) {
      this.spawnGate(Phaser.Math.Between(0, 2), Phaser.Math.RND.pick(["damage", "rate", "spread", "health"]));
      this.nextGate += 385;
    }
  }

  private spawnEnemy(lane: number, depth: number, boss: boolean, difficulty = 1) {
    const key = boss ? "boss" : "zombie";
    const hp = boss ? 460 * difficulty : Phaser.Math.Between(40, 66) * difficulty;
    const sprite = this.add.image(0, 0, key);
    const shadow = this.add.ellipse(0, 0, boss ? 100 : 56, boss ? 24 : 15, 0x000000, 0.3);
    const enemy: Enemy = {
      lane,
      depth,
      sprite,
      shadow,
      hp,
      maxHp: hp,
      speed: boss ? 0.025 : 0.145 + Math.random() * 0.035 + (this.runCount - 1) * 0.006,
      reward: boss ? 80 : 8,
      boss
    };
    if (boss) {
      enemy.hpBack = this.add.rectangle(0, 0, 92, 8, 0x14161d);
      enemy.hpFill = this.add.rectangle(0, 0, 88, 5, 0xff5c5c);
    }
    this.enemies.push(enemy);
    this.positionLaneEntity(enemy);
  }

  private spawnCoin(lane: number, depth: number) {
    const coin: Coin = {
      lane,
      depth,
      value: 5 + this.runCount,
      sprite: this.add.image(0, 0, "coin"),
      shadow: this.add.ellipse(0, 0, 30, 9, 0x000000, 0.16)
    };
    this.coinsOnTrack.push(coin);
    this.positionLaneEntity(coin);
  }

  private spawnGate(lane: number, kind: UpgradeKind) {
    const gate: Gate = {
      lane,
      depth: 0,
      kind,
      sprite: this.add.image(0, 0, "spark").setAlpha(0.18),
      shadow: this.add.ellipse(0, 0, 86, 20, 0x000000, 0.2),
      label: this.add.text(0, 0, this.gateLabel(kind), {
        color: "#10131a",
        fontSize: "13px",
        fontStyle: "700",
        align: "center"
      }).setOrigin(0.5),
      frame: this.add.rectangle(0, 0, 94, 56, 0x7ce7ff, 0.78).setStrokeStyle(3, 0xffffff, 0.85),
      used: false
    };
    this.gates.push(gate);
    this.positionGate(gate);
  }

  private startBoss() {
    this.phase = "boss";
    this.hud.bossGroup.setVisible(true);
    this.nextEnemy = Number.POSITIVE_INFINITY;
    this.spawnEnemy(1, 0.16, true, 1 + (this.runCount - 1) * 0.2);
    this.boss = this.enemies[this.enemies.length - 1];
  }

  private autoShoot(time: number) {
    if (time < this.lastShot + this.fireDelay) {
      return;
    }
    const laneOffsets = this.spread === 1 ? [0] : this.spread === 2 ? [-0.32, 0.32] : [-0.52, 0, 0.52];
    for (const offset of laneOffsets) {
      const lane = Phaser.Math.Clamp(Math.round(this.playerLane + offset), 0, 2);
      const bullet: Bullet = {
        lane,
        depth: 1,
        damage: this.damage,
        sprite: this.add.image(this.laneX(lane, 1), this.scale.height * PLAYER_Y_RATIO - 42, "bullet")
      };
      bullet.sprite.setDepth(1200);
      this.bullets.push(bullet);
    }
    this.lastShot = time;
  }

  private updateBullets(delta: number) {
    for (const bullet of [...this.bullets]) {
      bullet.depth -= delta * 1.35;
      const y = this.depthY(bullet.depth);
      bullet.sprite.setPosition(this.laneX(bullet.lane, bullet.depth), y);
      bullet.sprite.setScale(0.35 + bullet.depth * 0.55);
      bullet.sprite.setAlpha(0.5 + bullet.depth * 0.5);

      const target = this.enemies.find(
        (enemy) => enemy.lane === bullet.lane && Math.abs(enemy.depth - bullet.depth) < (enemy.boss ? 0.12 : 0.07)
      );
      if (target) {
        this.damageEnemy(target, bullet.damage);
        this.destroyBullet(bullet);
      } else if (bullet.depth < SHOOT_DEPTH - 0.12) {
        this.destroyBullet(bullet);
      }
    }
  }

  private updateEnemies(delta: number) {
    for (const enemy of [...this.enemies]) {
      if (!enemy.boss || enemy.depth < 0.66) {
        enemy.depth += enemy.speed * delta;
      }
      this.positionLaneEntity(enemy);

      if (enemy.boss) {
        if (enemy.hpBack && enemy.hpFill) {
          enemy.hpBack.setPosition(enemy.sprite.x, enemy.sprite.y - enemy.sprite.displayHeight * 0.62);
          enemy.hpFill.setPosition(enemy.sprite.x - 44, enemy.sprite.y - enemy.sprite.displayHeight * 0.62);
          enemy.hpFill.displayWidth = 88 * Math.max(0, enemy.hp / enemy.maxHp);
        }
        if (enemy.depth > 0.62 && Phaser.Math.Between(0, 1000) < 7) {
          this.damagePlayer(6);
        }
      } else if (enemy.depth > 0.95) {
        if (Math.abs(enemy.lane - this.targetLane) < 0.45) {
          this.damagePlayer(16);
        }
        this.destroyEnemy(enemy, false);
      }
    }
  }

  private updateCoins(delta: number) {
    for (const coin of [...this.coinsOnTrack]) {
      coin.depth += 0.22 * delta;
      coin.sprite.rotation += delta * 4;
      this.positionLaneEntity(coin);
      if (coin.depth > 0.92 && Math.abs(coin.lane - this.targetLane) < 0.45) {
        this.coins += coin.value;
        this.popText(`+${coin.value}`, coin.sprite.x, coin.sprite.y, "#ffd34f");
        this.destroyCoin(coin);
      } else if (coin.depth > 1.08) {
        this.destroyCoin(coin);
      }
    }
  }

  private updateGates(delta: number) {
    for (const gate of [...this.gates]) {
      gate.depth += 0.19 * delta;
      this.positionGate(gate);
      if (!gate.used && gate.depth > 0.9 && Math.abs(gate.lane - this.targetLane) < 0.45) {
        gate.used = true;
        this.applyUpgrade(gate.kind);
        this.destroyGate(gate);
      } else if (gate.depth > 1.08) {
        this.destroyGate(gate);
      }
    }
  }

  private damageEnemy(enemy: Enemy, amount: number) {
    enemy.hp -= amount;
    enemy.sprite.setTintFill(0xffffff);
    this.time.delayedCall(45, () => enemy.sprite.clearTint());
    if (enemy.hp <= 0) {
      this.coins += enemy.reward;
      this.popText(`+${enemy.reward}`, enemy.sprite.x, enemy.sprite.y, "#ffd34f");
      const wasBoss = Boolean(enemy.boss);
      this.destroyEnemy(enemy, true);
      if (wasBoss) {
        this.finish("won");
      }
    }
  }

  private damagePlayer(amount: number) {
    this.health = Math.max(0, this.health - amount);
    this.playerBody.setTintFill(0xff6b6b);
    this.time.delayedCall(70, () => this.playerBody.clearTint());
    if (this.health <= 0) {
      this.finish("lost");
    }
  }

  private applyUpgrade(kind: UpgradeKind) {
    if (kind === "damage") {
      this.damage += 9;
    } else if (kind === "rate") {
      this.fireDelay = Math.max(145, this.fireDelay - 55);
    } else if (kind === "spread") {
      this.spread = Math.min(3, this.spread + 1);
    } else {
      this.maxHealth = Math.min(150, this.maxHealth + 15);
      this.health = Math.min(this.maxHealth, this.health + 35);
    }
    this.popText(this.gateLabel(kind), this.player.x, this.player.y - 90, "#7ce7ff");
  }

  private finish(nextPhase: Phase) {
    this.phase = nextPhase;
    if (nextPhase === "won") {
      this.runCount += 1;
    }
    this.hud.overlay.removeAll(true);
    const panel = this.add.rectangle(0, 0, Math.min(340, this.scale.width - 34), 230, 0x20242e, 0.96)
      .setStrokeStyle(2, nextPhase === "won" ? 0x47d18c : 0xff6b6b);
    const title = this.add.text(0, -72, nextPhase === "won" ? "BOSS DOWN" : "RUN FAILED", {
      color: "#ffffff",
      fontSize: "28px",
      fontStyle: "800"
    }).setOrigin(0.5);
    const stats = this.add.text(0, -18, `Coins ${this.coins}\nNext run difficulty ${this.runCount}`, {
      color: "#d9deea",
      fontSize: "16px",
      align: "center",
      lineSpacing: 8
    }).setOrigin(0.5);
    const restart = this.add.text(0, 68, "RESTART", {
      color: "#10131a",
      fontSize: "17px",
      fontStyle: "800",
      backgroundColor: "#ffd34f",
      padding: { left: 24, right: 24, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive();
    restart.on("pointerdown", () => this.resetRun());
    this.hud.overlay.add([panel, title, stats, restart]);
    this.hud.overlay.setVisible(true);
  }

  private updateHud() {
    const { width } = this.scale;
    this.hud.coins.setText(`Coins ${this.coins}`);
    this.hud.health.setText(`HP ${Math.ceil(this.health)}/${this.maxHealth}`);
    this.hud.weapon.setText(`DMG ${this.damage}  RATE ${Math.round(1000 / this.fireDelay)}/s  x${this.spread}`);
    this.hud.progressFill.displayWidth = (width - 28) * Math.min(1, this.distance / RUN_DISTANCE);
    if (this.boss && this.phase === "boss") {
      this.hud.bossFill.displayWidth = 260 * Math.max(0, this.boss.hp / this.boss.maxHp);
    }
  }

  private positionLaneEntity(entity: LaneEntity) {
    const x = this.laneX(entity.lane, entity.depth);
    const y = this.depthY(entity.depth);
    const scale = 0.32 + entity.depth * (entity.sprite.texture.key === "boss" ? 1.35 : 1.05);
    entity.shadow.setPosition(x, y + 18 * scale);
    entity.shadow.setScale(scale);
    entity.sprite.setPosition(x, y);
    entity.sprite.setScale(scale);
    entity.sprite.setDepth(Math.floor(100 + entity.depth * 900));
    entity.shadow.setDepth(entity.sprite.depth - 1);
  }

  private positionGate(gate: Gate) {
    const x = this.laneX(gate.lane, gate.depth);
    const y = this.depthY(gate.depth);
    const scale = 0.3 + gate.depth * 1.05;
    gate.shadow.setPosition(x, y + 24 * scale);
    gate.shadow.setScale(scale);
    gate.frame.setPosition(x, y);
    gate.frame.setScale(scale);
    gate.sprite.setPosition(x, y);
    gate.sprite.setScale(scale * 1.25);
    gate.label.setPosition(x, y);
    gate.label.setScale(scale);
    const depth = Math.floor(120 + gate.depth * 850);
    gate.shadow.setDepth(depth - 2);
    gate.sprite.setDepth(depth - 1);
    gate.frame.setDepth(depth);
    gate.label.setDepth(depth + 1);
  }

  private laneX(lane: number, depth: number) {
    const center = this.scale.width / 2;
    const nearSpacing = Math.min(118, this.scale.width * 0.27);
    const farSpacing = this.scale.width * 0.045;
    const spacing = Phaser.Math.Linear(farSpacing, nearSpacing, depth);
    return center + (lane - 1) * spacing;
  }

  private depthY(depth: number) {
    return Phaser.Math.Linear(this.scale.height * HORIZON_Y_RATIO, this.scale.height * PLAYER_Y_RATIO, depth);
  }

  private gateLabel(kind: UpgradeKind) {
    return {
      damage: "+DMG",
      rate: "+RATE",
      spread: "+SHOT",
      health: "+HP"
    }[kind];
  }

  private hudStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: "#f5f7fb",
      fontFamily: "Arial",
      fontSize: `${fontSize}px`,
      fontStyle: "700"
    };
  }

  private popText(text: string, x: number, y: number, color: string) {
    const label = this.add.text(x, y, text, {
      color,
      fontSize: "18px",
      fontStyle: "800"
    }).setOrigin(0.5).setDepth(2500);
    this.tweens.add({
      targets: label,
      y: y - 42,
      alpha: 0,
      duration: 620,
      onComplete: () => label.destroy()
    });
  }

  private destroyBullet(bullet: Bullet) {
    Phaser.Utils.Array.Remove(this.bullets, bullet);
    bullet.sprite.destroy();
  }

  private destroyEnemy(enemy: Enemy, burst: boolean) {
    Phaser.Utils.Array.Remove(this.enemies, enemy);
    if (burst) {
      const flare = this.add.image(enemy.sprite.x, enemy.sprite.y, "spark").setTint(0xffd34f).setDepth(1800);
      this.tweens.add({
        targets: flare,
        scale: 2,
        alpha: 0,
        duration: 260,
        onComplete: () => flare.destroy()
      });
    }
    enemy.sprite.destroy();
    enemy.shadow.destroy();
    enemy.hpBack?.destroy();
    enemy.hpFill?.destroy();
  }

  private destroyCoin(coin: Coin) {
    Phaser.Utils.Array.Remove(this.coinsOnTrack, coin);
    coin.sprite.destroy();
    coin.shadow.destroy();
  }

  private destroyGate(gate: Gate) {
    Phaser.Utils.Array.Remove(this.gates, gate);
    gate.sprite.destroy();
    gate.shadow.destroy();
    gate.label.destroy();
    gate.frame.destroy();
  }

  private clearEntities() {
    for (const bullet of [...this.bullets]) this.destroyBullet(bullet);
    for (const enemy of [...this.enemies]) this.destroyEnemy(enemy, false);
    for (const coin of [...this.coinsOnTrack]) this.destroyCoin(coin);
    for (const gate of [...this.gates]) this.destroyGate(gate);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 390,
  height: 844,
  backgroundColor: "#17191f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  scene: RunnerScene
};

new Phaser.Game(config);
