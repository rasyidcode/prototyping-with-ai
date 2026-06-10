import { BufferGeometry, Line, LineBasicMaterial, Mesh, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from 'three';
import { TargetManager } from './TargetManager';

export class Weapon {
  private readonly raycaster = new Raycaster();
  private readonly center = new Vector2(0, 0);
  private flashLine: Line | null = null;
  private flashTimer = 0;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly scene: Scene,
    private readonly targetManager: TargetManager
  ) {
    window.addEventListener('mousedown', this.onShoot);
  }

  private onShoot = (): void => {
    // Raycaster with NDC (0,0) fires exactly through screen center crosshair.
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(this.targetManager.targets, false);

    if (hits.length > 0) {
      const target = hits[0].object as Mesh;
      this.targetManager.registerHit(target);
      this.drawFlash(this.raycaster.ray.origin, hits[0].point);
      return;
    }

    const missEnd = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(80));
    this.drawFlash(this.raycaster.ray.origin, missEnd);
  };

  private drawFlash(from: Vector3, to: Vector3): void {
    if (this.flashLine) {
      this.scene.remove(this.flashLine);
      this.flashLine.geometry.dispose();
    }

    const geometry = new BufferGeometry().setFromPoints([from, to]);
    const material = new LineBasicMaterial({ color: 0xfff799 });
    this.flashLine = new Line(geometry, material);
    this.scene.add(this.flashLine);
    this.flashTimer = 0.05;
  }

  public update(delta: number): void {
    if (!this.flashLine) {
      return;
    }

    this.flashTimer -= delta;
    if (this.flashTimer <= 0) {
      this.scene.remove(this.flashLine);
      this.flashLine.geometry.dispose();
      this.flashLine = null;
    }
  }
}
