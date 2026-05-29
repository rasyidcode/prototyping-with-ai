import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.createTextures();
    this.scene.start("MenuScene");
  }

  private createTextures(): void {
    this.makePalm();
    this.makeWorker();
    this.makeTruck();
    this.makeFactory();
    this.makeDock();
    this.makeCrate();
    this.makeParticle("spark", 0xfff2a6);
    this.makeParticle("leaf", 0x64cf58);
    this.makeParticle("mud", 0x8a5a2b);
  }

  private makePalm(): void {
    const g = this.add.graphics();
    g.fillStyle(0x764826).fillRoundedRect(18, 38, 12, 38, 5);
    g.fillStyle(0x1c8f45);
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7;
      g.fillEllipse(24 + Math.cos(angle) * 18, 36 + Math.sin(angle) * 10, 36, 15);
    }
    g.fillStyle(0xf08a2a).fillCircle(21, 39, 5).fillCircle(29, 38, 5).fillCircle(25, 45, 5);
    g.generateTexture("palm", 52, 82);
    g.destroy();
  }

  private makeWorker(): void {
    const g = this.add.graphics();
    g.fillStyle(0xf6c177).fillCircle(16, 10, 8);
    g.fillStyle(0xffd84a).fillTriangle(6, 8, 26, 8, 16, 0);
    g.fillStyle(0x3c9bd9).fillRoundedRect(8, 18, 16, 20, 5);
    g.lineStyle(4, 0x272b32).lineBetween(10, 39, 7, 50).lineBetween(22, 39, 25, 50);
    g.lineStyle(3, 0x272b32).lineBetween(8, 24, 1, 31).lineBetween(24, 24, 31, 31);
    g.generateTexture("worker", 34, 54);
    g.destroy();
  }

  private makeTruck(): void {
    const g = this.add.graphics();
    g.fillStyle(0xff5a36).fillRoundedRect(4, 13, 45, 22, 5);
    g.fillStyle(0xffcf4d).fillRoundedRect(43, 19, 21, 16, 4);
    g.fillStyle(0x5ed7ff).fillRect(48, 21, 10, 7);
    g.fillStyle(0x1a1f29).fillCircle(17, 38, 7).fillCircle(51, 38, 7);
    g.fillStyle(0xf8f4e8).fillCircle(17, 38, 3).fillCircle(51, 38, 3);
    g.generateTexture("truck", 70, 48);
    g.destroy();
  }

  private makeFactory(): void {
    const g = this.add.graphics();
    g.fillStyle(0x687585).fillRoundedRect(0, 30, 112, 64, 6);
    g.fillStyle(0xe25241).fillTriangle(0, 30, 56, 0, 112, 30);
    g.fillStyle(0x454f5d).fillRect(12, 48, 18, 46).fillRect(76, 46, 22, 48);
    g.fillStyle(0xffcf4d).fillRect(40, 50, 24, 18);
    g.fillStyle(0x545f70).fillRect(84, 4, 15, 32);
    g.generateTexture("factory", 112, 98);
    g.destroy();
  }

  private makeDock(): void {
    const g = this.add.graphics();
    g.fillStyle(0x3b82c4).fillRoundedRect(0, 24, 114, 40, 8);
    g.fillStyle(0xf5f0d8).fillTriangle(18, 24, 96, 24, 72, 2);
    g.fillStyle(0x6b4a2b).fillRect(8, 62, 100, 12);
    g.generateTexture("dock", 118, 78);
    g.destroy();
  }

  private makeCrate(): void {
    const g = this.add.graphics();
    g.fillStyle(0xf08a2a).fillRoundedRect(0, 0, 26, 20, 5);
    g.fillStyle(0xffbd4a).fillCircle(7, 7, 4).fillCircle(14, 11, 4).fillCircle(20, 7, 4);
    g.generateTexture("crate", 26, 20);
    g.destroy();
  }

  private makeParticle(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color).fillCircle(4, 4, 4);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }
}
