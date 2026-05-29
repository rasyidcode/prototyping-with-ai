import Phaser from "phaser";
import { GameMode, MODE_LABELS } from "../game/balance";
import { loadSave } from "../game/storage";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const save = loadSave();

    this.add.image(width / 2, height / 2, "assetSheet").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x10281d, 0.22);
    this.add.rectangle(width / 2, 160, 560, 188, 0x153320, 0.62);

    for (let i = 0; i < 13; i += 1) {
      const x = 45 + i * 76;
      const y = 360 + Math.sin(i) * 22;
      this.add.image(x, y, "palm").setScale(0.42 + (i % 3) * 0.035);
    }

    this.add
      .text(width / 2, 74, "Sawit Rush!", {
        fontFamily: "Arial Black, Impact, sans-serif",
        fontSize: "64px",
        color: "#fff7c7",
        stroke: "#3a552b",
        strokeThickness: 8
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 132, "Fast harvests. Hot machines. Bad roads. Keep the CPO moving.", {
        fontSize: "22px",
        color: "#f8ffe5"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 176, `Best ${save.bestScore}   XP ${save.xp}   Stars ${save.stars}`, {
        fontSize: "20px",
        color: "#ffe59a"
      })
      .setOrigin(0.5);

    const modes: GameMode[] = ["story", "endless", "daily"];
    modes.forEach((mode, index) => {
      this.makeButton(width / 2, 240 + index * 74, MODE_LABELS[mode], () => {
        this.scene.start("GameScene", { mode });
      });
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, 330, 54, 0xffc84a)
      .setStrokeStyle(4, 0x54391f)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#382618"
      })
      .setOrigin(0.5);

    button.add([bg, text]);
    bg.on("pointerover", () => bg.setFillStyle(0xffdc62));
    bg.on("pointerout", () => bg.setFillStyle(0xffc84a));
    bg.on("pointerdown", () => {
      this.tweens.add({ targets: button, scale: 0.94, yoyo: true, duration: 80 });
      onClick();
    });
  }
}
