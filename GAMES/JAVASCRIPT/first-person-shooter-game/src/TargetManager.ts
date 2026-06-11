import { BoxGeometry, ColorRepresentation, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three';

export class TargetManager {
  public readonly targets: Mesh[] = [];
  public score = 0;

  constructor(private readonly scene: Scene, private readonly onScoreChange: (score: number) => void) {}

  public spawnTargets(): void {
    const positions: Vector3[] = [
      new Vector3(-12, 2, -14),
      new Vector3(16, 2, -8),
      new Vector3(18, 2, 12),
      new Vector3(-18, 2, 16),
      new Vector3(0, 3, -24),
      new Vector3(0, 5, 22)
    ];

    for (const position of positions) {
      const target = this.createTarget(position, 0xd94141);
      this.targets.push(target);
      this.scene.add(target);
    }
  }

  private createTarget(position: Vector3, color: ColorRepresentation): Mesh {
    const target = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial({ color }));
    target.position.copy(position);
    target.castShadow = true;
    target.userData.isTarget = true;
    return target;
  }

  public registerHit(target: Mesh): void {
    if (!target.parent) {
      return;
    }

    target.visible = false;
    this.scene.remove(target);
    this.score += 1;
    this.onScoreChange(this.score);
  }
}
