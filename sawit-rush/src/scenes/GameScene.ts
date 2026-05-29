import Phaser from "phaser";
import {
  CHAOS_EVENTS,
  ChaosName,
  GameMode,
  MODE_LABELS,
  TREE_POSITIONS,
  UPGRADES,
  UpgradeKey
} from "../game/balance";
import { dailySeed, SeededRandom } from "../game/random";
import { loadSave, saveProgress } from "../game/storage";

type TreeState = {
  sprite: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Rectangle;
  ready: boolean;
  progress: number;
  worker?: Phaser.GameObjects.Image;
};

type Batch = {
  amount: number;
  quality: number;
};

type TruckState = {
  sprite: Phaser.GameObjects.Image;
  state: "idle" | "toFactory" | "returning" | "disabled";
  cargo: Batch[];
  progress: number;
  disabledTimer: number;
};

type FloatingTextStyle = Phaser.Types.GameObjects.Text.TextStyle;

const FIELD = { x: 88, y: 96, w: 330, h: 318 };
const ROAD = { startX: 448, y: 318, endX: 650 };
const FACTORY = { x: 704, y: 214 };
const DOCK = { x: 824, y: 396 };
const BASE_SESSION_SECONDS = 240;

export class GameScene extends Phaser.Scene {
  private mode: GameMode = "story";
  private rng = new SeededRandom(1);
  private trees: TreeState[] = [];
  private trucks: TruckState[] = [];
  private fieldQueue: Batch[] = [];
  private factoryQueue: Batch[] = [];
  private cpo = 0;
  private cpoQuality = 100;
  private money = 120;
  private score = 0;
  private xp = 0;
  private stars = 0;
  private combo = 1;
  private comboTimer = 0;
  private sessionTimer = BASE_SESSION_SECONDS;
  private factoryProgress = 0;
  private factoryBatch?: Batch;
  private chaos?: { name: ChaosName; timer: number };
  private chaosCooldown = 20;
  private demandBonusTimer = 0;
  private ended = false;
  private upgrades: Record<UpgradeKey, number> = {
    workerSpeed: 0,
    truckCapacity: 0,
    truckSpeed: 0,
    factorySpeed: 0,
    storage: 0,
    repairTeam: 0
  };

  private hud!: Record<string, Phaser.GameObjects.Text>;
  private chaosText!: Phaser.GameObjects.Text;
  private factoryBar!: Phaser.GameObjects.Rectangle;
  private qualityBar!: Phaser.GameObjects.Rectangle;
  private fieldQueueText!: Phaser.GameObjects.Text;
  private factoryQueueText!: Phaser.GameObjects.Text;
  private shipText!: Phaser.GameObjects.Text;
  private rainOverlay?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("GameScene");
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? "story";
    const seed = this.mode === "daily" ? dailySeed() : Date.now() % 100000;
    this.rng = new SeededRandom(seed);
  }

  create(): void {
    this.resetState();
    this.drawWorld();
    this.createTrees();
    this.createTrucks();
    this.createHud();
    this.createControls();
    this.updateHud();
  }

  update(_time: number, deltaMs: number): void {
    if (this.ended) return;
    const dt = deltaMs / 1000;
    this.sessionTimer -= dt;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.demandBonusTimer = Math.max(0, this.demandBonusTimer - dt);
    if (this.comboTimer <= 0) this.combo = 1;

    this.decayBatches(this.fieldQueue, dt);
    this.decayBatches(this.factoryQueue, dt * 0.55);
    this.tickTrucks(dt);
    this.tickFactory(dt);
    this.tickChaos(dt);
    this.updateHud();

    if (this.sessionTimer <= 0) this.endRun();
  }

  private resetState(): void {
    this.trees = [];
    this.trucks = [];
    this.fieldQueue = [];
    this.factoryQueue = [];
    this.cpo = 0;
    this.cpoQuality = 100;
    this.money = 120;
    this.score = 0;
    this.xp = 0;
    this.stars = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.sessionTimer = this.mode === "endless" ? 360 : BASE_SESSION_SECONDS;
    this.factoryProgress = 0;
    this.factoryBatch = undefined;
    this.chaos = undefined;
    this.chaosCooldown = this.mode === "endless" ? 14 : 20;
    this.demandBonusTimer = 0;
    this.ended = false;
    for (const key of Object.keys(this.upgrades) as UpgradeKey[]) this.upgrades[key] = 0;
  }

  private drawWorld(): void {
    this.add.rectangle(480, 270, 960, 540, 0x69bd57);
    this.add.rectangle(480, 54, 960, 108, 0x236b4b);
    this.add.rectangle(480, 492, 960, 96, 0x276a42);
    this.add.rectangle(FIELD.x + FIELD.w / 2, FIELD.y + FIELD.h / 2, FIELD.w, FIELD.h, 0x4fae4d, 0.88);
    this.add.rectangle(553, ROAD.y, 240, 58, 0x8d6a42).setStrokeStyle(5, 0x674a2e);
    this.add.rectangle(552, ROAD.y, 240, 8, 0xf4dd98, 0.5);
    this.add.image(FACTORY.x, FACTORY.y, "factory").setScale(0.46);
    this.add.image(DOCK.x, DOCK.y, "dock").setScale(0.72);
    this.add.text(42, 82, MODE_LABELS[this.mode], { fontSize: "20px", color: "#fff7c7", fontStyle: "bold" });
    this.add.text(646, 124, "Factory", { fontSize: "18px", color: "#fff7c7", fontStyle: "bold" });
    this.add.text(770, 454, "Export", { fontSize: "18px", color: "#fff7c7", fontStyle: "bold" });
  }

  private createTrees(): void {
    TREE_POSITIONS.forEach((pos, index) => {
      const sprite = this.add.image(pos.x, pos.y, "palm").setInteractive({ useHandCursor: true });
      const barBg = this.add.rectangle(pos.x, pos.y + 54, 52, 7, 0x24472d);
      const bar = this.add.rectangle(pos.x - 26, pos.y + 54, 52, 7, 0xffd84a).setOrigin(0, 0.5);
      const tree: TreeState = { sprite, bar, ready: true, progress: 1 };
      this.trees.push(tree);
      sprite.on("pointerdown", () => this.harvestTree(index));
      sprite.setScale(0.46);
      barBg.setDepth(3);
      bar.setDepth(4);
    });
  }

  private createTrucks(): void {
    for (let i = 0; i < 2; i += 1) {
      const sprite = this.add.image(ROAD.startX, ROAD.y + (i - 0.5) * 28, "truck").setScale(0.26);
      this.trucks.push({ sprite, state: "idle", cargo: [], progress: 0, disabledTimer: 0 });
    }
  }

  private createHud(): void {
    const style: FloatingTextStyle = { fontSize: "18px", color: "#fff7c7", fontStyle: "bold" };
    this.hud = {
      score: this.add.text(22, 14, "", style),
      money: this.add.text(190, 14, "", style),
      combo: this.add.text(330, 14, "", style),
      time: this.add.text(468, 14, "", style),
      xp: this.add.text(594, 14, "", style),
      stars: this.add.text(704, 14, "", style)
    };
    this.chaosText = this.add.text(22, 46, "", { fontSize: "17px", color: "#ffef8a", fontStyle: "bold" });
    this.fieldQueueText = this.add.text(430, 370, "", { fontSize: "16px", color: "#fff9d8", fontStyle: "bold" });
    this.factoryQueueText = this.add.text(628, 286, "", { fontSize: "16px", color: "#fff9d8", fontStyle: "bold" });
    this.shipText = this.add.text(772, 492, "", { fontSize: "16px", color: "#fff9d8", fontStyle: "bold" });
    this.add.rectangle(704, 300, 136, 14, 0x253241);
    this.factoryBar = this.add.rectangle(636, 300, 0, 14, 0xffc84a).setOrigin(0, 0.5);
    this.add.rectangle(822, 342, 138, 14, 0x253241);
    this.qualityBar = this.add.rectangle(753, 342, 138, 14, 0x5fe06f).setOrigin(0, 0.5);
  }

  private createControls(): void {
    this.makeButton(514, 454, 156, "Dispatch Truck", () => this.dispatchTruck());
    this.makeButton(824, 500, 140, "Ship CPO", () => this.shipCpo());
    this.makeButton(906, 32, 76, "Menu", () => this.scene.start("MenuScene"));

    const keys = Object.keys(UPGRADES) as UpgradeKey[];
    keys.forEach((key, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      this.makeUpgradeButton(84 + col * 150, 452 + row * 42, key);
    });
  }

  private makeButton(x: number, y: number, w: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, w, 34, 0xffc84a)
      .setStrokeStyle(3, 0x49301a)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, { fontSize: "15px", color: "#342313", fontStyle: "bold" })
      .setOrigin(0.5);
    bg.on("pointerdown", () => {
      this.tweens.add({ targets: [bg, text], scale: 0.94, yoyo: true, duration: 70 });
      onClick();
    });
  }

  private makeUpgradeButton(x: number, y: number, key: UpgradeKey): void {
    const bg = this.add
      .rectangle(x, y, 138, 32, 0xf6f0d1)
      .setStrokeStyle(2, 0x405034)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, "", { fontSize: "12px", color: "#26301f", fontStyle: "bold", align: "center" })
      .setOrigin(0.5);
    bg.on("pointerdown", () => this.buyUpgrade(key));
    bg.setData("label", text);
    bg.setData("upgradeKey", key);
  }

  private harvestTree(index: number): void {
    const tree = this.trees[index];
    if (!tree.ready || tree.worker) return;

    const worker = this.add.image(tree.sprite.x - 28, tree.sprite.y + 12, "worker").setScale(0.38);
    tree.worker = worker;
    tree.ready = false;
    tree.progress = 0;
    tree.sprite.setTint(0xb7e38f);

    const duration = this.harvestDuration() * 1000;
    this.tweens.add({
      targets: worker,
      x: tree.sprite.x + 26,
      yoyo: true,
      repeat: 2,
      duration: duration / 6,
      onComplete: () => {
        worker.destroy();
        tree.worker = undefined;
        if (this.fieldQueue.length < this.storageLimit()) {
          this.fieldQueue.push({ amount: 1, quality: 100 });
          this.popText(tree.sprite.x, tree.sprite.y - 44, "+TBS", "#fff1a0");
          this.emitBurst(tree.sprite.x, tree.sprite.y, "leaf", 8);
        } else {
          this.popText(tree.sprite.x, tree.sprite.y - 44, "Storage full", "#ffe1e1");
        }
        this.time.delayedCall(this.regrowDuration() * 1000, () => {
          tree.ready = true;
          tree.progress = 1;
          tree.sprite.clearTint();
          tree.bar.width = 52;
        });
      }
    });

    this.tweens.addCounter({
      from: 0,
      to: 52,
      duration,
      onUpdate: (tween) => {
        tree.bar.width = tween.getValue() ?? 0;
      }
    });
  }

  private dispatchTruck(): void {
    const idle = this.trucks.find((truck) => truck.state === "idle");
    if (!idle || this.fieldQueue.length === 0) {
      this.popText(516, 418, "No truck or TBS", "#ffe1e1");
      return;
    }

    const load = Math.min(this.truckCapacity(), this.fieldQueue.length);
    idle.cargo = this.fieldQueue.splice(0, load);
    idle.state = "toFactory";
    idle.progress = 0;
    idle.sprite.clearTint();
    this.popText(idle.sprite.x, idle.sprite.y - 34, `Loaded x${load}`, "#fff1a0");
  }

  private shipCpo(): void {
    if (this.cpo <= 0) {
      this.popText(DOCK.x, DOCK.y - 54, "No CPO", "#ffe1e1");
      return;
    }
    const units = this.cpo;
    const qualityFactor = Math.max(0.35, this.cpoQuality / 100);
    const demand = this.demandBonusTimer > 0 ? 1.75 : 1;
    const payout = Math.round(units * 42 * qualityFactor * this.combo * demand);
    const scoreGain = Math.round(units * 120 * qualityFactor * this.combo * demand);
    this.money += payout;
    this.score += scoreGain;
    this.xp += units * 2;
    this.stars += scoreGain >= 500 ? 1 : 0;
    this.combo = Math.min(12, this.combo + 1);
    this.comboTimer = 7;
    this.cpo = 0;
    this.cpoQuality = 100;
    this.emitBurst(DOCK.x, DOCK.y - 20, "spark", 18);
    this.popText(DOCK.x, DOCK.y - 76, `+$${payout}  x${this.combo}`, "#fff1a0");
  }

  private tickTrucks(dt: number): void {
    const speed = this.truckSpeed();
    for (const truck of this.trucks) {
      if (truck.state === "disabled") {
        truck.disabledTimer -= dt;
        truck.sprite.setTint(0x555555);
        if (truck.disabledTimer <= 0) {
          truck.state = truck.cargo.length > 0 ? "toFactory" : "idle";
          truck.sprite.clearTint();
        }
        continue;
      }
      if (truck.state === "idle") continue;

      this.decayBatches(truck.cargo, dt * 0.8);
      truck.progress = Math.min(1, truck.progress + dt / speed);
      const from = truck.state === "toFactory" ? ROAD.startX : ROAD.endX;
      const to = truck.state === "toFactory" ? ROAD.endX : ROAD.startX;
      truck.sprite.x = Phaser.Math.Linear(from, to, truck.progress);

      if (truck.progress >= 1 && truck.state === "toFactory") {
        this.factoryQueue.push(...truck.cargo);
        truck.cargo = [];
        truck.state = "returning";
        truck.progress = 0;
        this.popText(FACTORY.x, FACTORY.y + 78, "Delivered", "#fff1a0");
      } else if (truck.progress >= 1 && truck.state === "returning") {
        truck.state = "idle";
        truck.progress = 0;
      }
    }
  }

  private tickFactory(dt: number): void {
    if (this.isFactoryBlocked()) return;
    if (!this.factoryBatch && this.factoryQueue.length > 0 && this.cpo < this.storageLimit()) {
      this.factoryBatch = this.factoryQueue.shift();
      this.factoryProgress = 0;
    }
    if (!this.factoryBatch) return;

    this.factoryProgress += dt / this.factoryDuration();
    if (this.factoryProgress >= 1) {
      const amount = this.factoryBatch.amount;
      const quality = this.factoryBatch.quality;
      this.cpoQuality = this.cpo === 0 ? quality : (this.cpoQuality * this.cpo + quality * amount) / (this.cpo + amount);
      this.cpo += amount;
      this.factoryBatch = undefined;
      this.factoryProgress = 0;
      this.emitBurst(FACTORY.x, FACTORY.y + 30, "spark", 8);
      this.popText(FACTORY.x, FACTORY.y + 76, "+CPO", "#fff1a0");
    }
  }

  private tickChaos(dt: number): void {
    if (this.chaos) {
      this.chaos.timer -= dt;
      if (this.chaos.timer <= 0) {
        this.clearChaos();
      }
      return;
    }

    const pressure = this.mode === "endless" ? Math.max(0, (360 - this.sessionTimer) / 40) : 0;
    this.chaosCooldown -= dt * (1 + pressure * 0.08);
    if (this.chaosCooldown <= 0) this.startChaos();
  }

  private startChaos(): void {
    const name = this.rng.pick(CHAOS_EVENTS);
    const duration = Math.max(5, 11 - this.upgrades.repairTeam * 1.2);
    this.chaos = { name, timer: name === "Export demand spike" ? 10 : duration };
    this.chaosText.setText(`! ${name}`);
    this.cameras.main.shake(130, 0.005);
    this.popText(480, 94, name, "#ffef8a");

    if (name === "Wild monkeys steal fruit") {
      const stolen = this.fieldQueue.splice(0, Math.min(2, this.fieldQueue.length)).length;
      if (stolen > 0) this.popText(292, 382, `-${stolen} TBS`, "#ffe1e1");
    }
    if (name === "Truck tire explosion") {
      const truck = this.trucks.find((candidate) => candidate.state !== "disabled");
      if (truck) {
        truck.state = "disabled";
        truck.disabledTimer = duration;
      }
    }
    if (name === "Export demand spike") this.demandBonusTimer = 10;
    if (name === "Heavy rain slows trucks" || name === "Flooded plantation roads") {
      this.rainOverlay = this.add.rectangle(480, 270, 960, 540, 0x7bb4ff, 0.12).setDepth(30);
    }
  }

  private clearChaos(): void {
    this.chaos = undefined;
    this.chaosCooldown = this.mode === "endless" ? this.rng.integer(10, 16) : this.rng.integer(16, 24);
    this.chaosText.setText("");
    this.rainOverlay?.destroy();
    this.rainOverlay = undefined;
    for (const truck of this.trucks) {
      if (truck.state === "disabled") {
        truck.state = truck.cargo.length > 0 ? "toFactory" : "idle";
        truck.sprite.clearTint();
      }
    }
  }

  private buyUpgrade(key: UpgradeKey): void {
    const upgrade = UPGRADES[key];
    const level = this.upgrades[key];
    if (level >= upgrade.max) {
      this.popText(210, 426, "Maxed", "#fff1a0");
      return;
    }
    const cost = this.upgradeCost(key);
    if (this.money < cost) {
      this.popText(210, 426, "Need money", "#ffe1e1");
      return;
    }
    this.money -= cost;
    this.upgrades[key] += 1;
    this.popText(210, 426, `${upgrade.label} +1`, "#fff1a0");
  }

  private updateHud(): void {
    this.hud.score.setText(`Score ${this.score}`);
    this.hud.money.setText(`$${this.money}`);
    this.hud.combo.setText(`Combo x${this.combo}`);
    this.hud.time.setText(`Time ${Math.ceil(this.sessionTimer)}`);
    this.hud.xp.setText(`XP ${this.xp}`);
    this.hud.stars.setText(`Stars ${this.stars}`);

    this.fieldQueueText.setText(`TBS ${this.fieldQueue.length}/${this.storageLimit()}`);
    this.factoryQueueText.setText(`Queue ${this.factoryQueue.length}`);
    this.shipText.setText(`CPO ${this.cpo}  Q ${Math.round(this.cpoQuality)}%`);
    this.factoryBar.width = 136 * this.factoryProgress;
    this.qualityBar.width = 138 * Math.max(0, this.cpoQuality / 100);
    this.qualityBar.fillColor = this.cpoQuality > 70 ? 0x5fe06f : this.cpoQuality > 40 ? 0xffc84a : 0xff5a36;

    for (const obj of this.children.list) {
      const text = obj.getData?.("label") as Phaser.GameObjects.Text | undefined;
      const key = obj.getData?.("upgradeKey") as UpgradeKey | undefined;
      if (!text || !key) continue;
      const level = this.upgrades[key];
      const maxed = level >= UPGRADES[key].max;
      text.setText(`${UPGRADES[key].label} ${level}\n${maxed ? "MAX" : `$${this.upgradeCost(key)}`}`);
    }
  }

  private endRun(): void {
    this.ended = true;
    const save = loadSave();
    const nextSave = {
      bestScore: Math.max(save.bestScore, this.score),
      xp: save.xp + this.xp,
      stars: save.stars + this.stars
    };
    saveProgress(nextSave);

    const panel = this.add.container(480, 270).setDepth(50);
    panel.add(this.add.rectangle(0, 0, 420, 260, 0x263b2c, 0.96).setStrokeStyle(4, 0xffd76f));
    panel.add(
      this.add
        .text(0, -84, "Run Complete", {
          fontSize: "36px",
          color: "#fff7c7",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
    );
    panel.add(
      this.add
        .text(0, -20, `Score ${this.score}\nMoney $${this.money}\nXP +${this.xp}   Stars +${this.stars}`, {
          fontSize: "22px",
          color: "#f8ffe5",
          align: "center"
        })
        .setOrigin(0.5)
    );
    const again = this.add
      .rectangle(0, 84, 180, 42, 0xffc84a)
      .setStrokeStyle(3, 0x49301a)
      .setInteractive({ useHandCursor: true });
    panel.add(again);
    panel.add(this.add.text(0, 84, "Play Again", { fontSize: "19px", color: "#342313", fontStyle: "bold" }).setOrigin(0.5));
    again.on("pointerdown", () => this.scene.restart({ mode: this.mode }));
  }

  private decayBatches(batches: Batch[], dt: number): void {
    for (const batch of batches) batch.quality = Math.max(12, batch.quality - dt * 2.25);
  }

  private harvestDuration(): number {
    const strike = this.chaos?.name === "Worker strike slows harvest" ? 1.8 : 1;
    return Math.max(0.8, (2.8 - this.upgrades.workerSpeed * 0.28) * strike);
  }

  private regrowDuration(): number {
    return this.mode === "endless" ? 3.2 : 4.2;
  }

  private truckCapacity(): number {
    return 2 + this.upgrades.truckCapacity;
  }

  private truckSpeed(): number {
    let speed = Math.max(1.5, 4.2 - this.upgrades.truckSpeed * 0.34);
    if (this.chaos?.name === "Heavy rain slows trucks") speed *= 1.65;
    if (this.chaos?.name === "Broken bridge blocks route") speed *= 2.2;
    if (this.chaos?.name === "Flooded plantation roads") speed *= 1.85;
    if (this.chaos?.name === "Fuel shortage") speed *= 1.45;
    if (this.chaos?.name === "Road traffic jam") speed *= 1.7;
    return speed;
  }

  private factoryDuration(): number {
    let duration = Math.max(1.2, 4.2 - this.upgrades.factorySpeed * 0.36);
    if (this.chaos?.name === "Machine overheating") duration *= 1.9;
    return duration;
  }

  private isFactoryBlocked(): boolean {
    return this.chaos?.name === "Factory power outage";
  }

  private storageLimit(): number {
    return 8 + this.upgrades.storage * 4;
  }

  private upgradeCost(key: UpgradeKey): number {
    const upgrade = UPGRADES[key];
    return Math.round(upgrade.baseCost * Math.pow(1.55, this.upgrades[key]));
  }

  private popText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, { fontSize: "20px", color, fontStyle: "bold", stroke: "#26301f", strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy()
    });
  }

  private emitBurst(x: number, y: number, key: string, quantity: number): void {
    const emitter = this.add.particles(x, y, key, {
      speed: { min: 50, max: 150 },
      lifespan: 520,
      quantity,
      scale: { start: 0.18, end: 0 },
      emitting: false
    });
    emitter.explode(quantity);
    this.time.delayedCall(620, () => emitter.destroy());
  }
}
