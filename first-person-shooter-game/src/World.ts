import {
  Box3,
  BoxGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  TextureLoader,
  Vector3
} from 'three';

export class World {
  public readonly colliders: Box3[] = [];

  constructor(private readonly scene: Scene) {}

  public build(): void {
    const light = new HemisphereLight(0x8ab4ff, 0x3d2f1f, 0.45);
    this.scene.add(light);

    const sun = new DirectionalLight(0xffffff, 1.1);
    sun.position.set(12, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    this.scene.add(sun);

    const arena = new Group();
    this.scene.add(arena);

    const floorTexture = new TextureLoader().load('https://threejs.org/examples/textures/checker.png');
    floorTexture.wrapS = RepeatWrapping;
    floorTexture.wrapT = RepeatWrapping;
    floorTexture.repeat.set(24, 24);

    const floor = new Mesh(
      new PlaneGeometry(120, 120),
      new MeshStandardMaterial({ map: floorTexture, roughness: 0.85, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    arena.add(floor);

    this.addCollider(new Vector3(0, -0.5, 0), new Vector3(120, 1, 120), arena, 0x60666f);

    const wallThickness = 2;
    this.addCollider(new Vector3(0, 4, -58), new Vector3(120, 8, wallThickness), arena, 0x888888);
    this.addCollider(new Vector3(0, 4, 58), new Vector3(120, 8, wallThickness), arena, 0x888888);
    this.addCollider(new Vector3(-58, 4, 0), new Vector3(wallThickness, 8, 120), arena, 0x888888);
    this.addCollider(new Vector3(58, 4, 0), new Vector3(wallThickness, 8, 120), arena, 0x888888);

    this.addCollider(new Vector3(0, 2, 0), new Vector3(8, 4, 8), arena, 0x7c7c84);
    this.addCollider(new Vector3(-20, 1.5, -10), new Vector3(4, 3, 4), arena, 0x7c7c84);
    this.addCollider(new Vector3(22, 2.5, 16), new Vector3(6, 5, 6), arena, 0x7c7c84);
  }

  private addCollider(position: Vector3, size: Vector3, parent: Group, color: number): void {
    const mesh = new Mesh(new BoxGeometry(size.x, size.y, size.z), new MeshStandardMaterial({ color }));
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    const min = position.clone().sub(size.clone().multiplyScalar(0.5));
    const max = position.clone().add(size.clone().multiplyScalar(0.5));
    this.colliders.push(new Box3(min, max));
  }
}
