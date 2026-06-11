import Phaser from "phaser";
import gameAssetsUrl from "../../game-assets.png?url";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("assetSheet", gameAssetsUrl);
  }

  create(): void {
    this.createTextures();
    this.scene.start("MenuScene");
  }

  private createTextures(): void {
    this.cropTexture("palm", 0, 0, 155, 130);
    this.cropTexture("worker", 156, 0, 120, 118);
    this.cropTexture("truck", 210, 548, 300, 102);
    this.cropTexture("factory", 300, 232, 318, 194);
    this.cropTexture("dock", 1140, 120, 190, 118);
    this.cropTexture("crate", 335, 12, 135, 92);
    this.cropTexture("fruit", 476, 20, 160, 98);
    this.cropTexture("cpoTruck", 260, 658, 236, 98);
    this.cropTexture("warning", 1048, 806, 96, 70);
    this.cropTexture("spark", 832, 720, 88, 82);
    this.cropTexture("leaf", 1030, 382, 96, 70);
    this.cropTexture("mud", 724, 804, 86, 72);
  }

  private cropTexture(
    key: string,
    sourceX: number,
    sourceY: number,
    width: number,
    height: number
  ): void {
    const source = this.textures.get("assetSheet").getSourceImage() as HTMLImageElement;
    const canvasTexture = this.textures.createCanvas(key, width, height);
    const context = canvasTexture?.getContext();
    if (!canvasTexture || !context) {
      return;
    }
    context.clearRect(0, 0, width, height);
    context.drawImage(source, sourceX, sourceY, width, height, 0, 0, width, height);
    canvasTexture.refresh();
  }
}
