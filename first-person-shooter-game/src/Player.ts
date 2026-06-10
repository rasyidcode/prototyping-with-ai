import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { InputState } from './PlayerControls';

export class Player {
  private readonly velocity = new Vector3();
  private readonly playerSize = new Vector3(0.8, 1.8, 0.8);
  private readonly playerFeetHeight = 0.9;
  private isGrounded = false;

  private readonly moveSpeed = 11;
  private readonly jumpSpeed = 8;
  private readonly gravity = 22;
  private readonly drag = 8;

  constructor(public readonly camera: PerspectiveCamera) {
    this.camera.position.set(0, 2.2, 20);
  }

  public update(delta: number, input: InputState, colliders: Box3[]): void {
    const moveInput = new Vector3(
      Number(input.KeyD) - Number(input.KeyA),
      0,
      Number(input.KeyS) - Number(input.KeyW)
    );

    if (moveInput.lengthSq() > 0) {
      moveInput.normalize();
      // Convert local WASD axes into world-space movement using current camera yaw.
      const forward = new Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new Vector3(forward.z, 0, -forward.x);
      const desiredVelocity = right.multiplyScalar(moveInput.x).add(forward.multiplyScalar(moveInput.z));
      this.velocity.x += desiredVelocity.x * this.moveSpeed * delta;
      this.velocity.z += desiredVelocity.z * this.moveSpeed * delta;
    }

    const dragFactor = Math.exp(-this.drag * delta);
    this.velocity.x *= dragFactor;
    this.velocity.z *= dragFactor;

    if (this.isGrounded && input.Space) {
      this.velocity.y = this.jumpSpeed;
      this.isGrounded = false;
    }

    this.velocity.y -= this.gravity * delta;

    const oldPos = this.camera.position.clone();
    const nextPos = oldPos.clone().addScaledVector(this.velocity, delta);
    this.camera.position.copy(nextPos);

    const playerBox = this.computeAabb(nextPos);
    this.isGrounded = false;

    for (const collider of colliders) {
      if (!playerBox.intersectsBox(collider)) {
        continue;
      }

      const overlapY = Math.min(playerBox.max.y - collider.min.y, collider.max.y - playerBox.min.y);
      const overlapX = Math.min(playerBox.max.x - collider.min.x, collider.max.x - playerBox.min.x);
      const overlapZ = Math.min(playerBox.max.z - collider.min.z, collider.max.z - playerBox.min.z);

      // Resolve penetration on the smallest overlap axis to approximate AABB collision response.
      if (overlapY <= overlapX && overlapY <= overlapZ) {
        if (oldPos.y >= collider.max.y) {
          this.camera.position.y += overlapY;
          this.velocity.y = 0;
          this.isGrounded = true;
        } else {
          this.camera.position.y -= overlapY;
          this.velocity.y = Math.min(0, this.velocity.y);
        }
      } else if (overlapX < overlapZ) {
        this.camera.position.x += oldPos.x < collider.getCenter(new Vector3()).x ? -overlapX : overlapX;
        this.velocity.x = 0;
      } else {
        this.camera.position.z += oldPos.z < collider.getCenter(new Vector3()).z ? -overlapZ : overlapZ;
        this.velocity.z = 0;
      }
    }

    if (this.camera.position.y < -20) {
      this.camera.position.set(0, 2.2, 20);
      this.velocity.set(0, 0, 0);
    }
  }

  private computeAabb(position: Vector3): Box3 {
    const half = this.playerSize.clone().multiplyScalar(0.5);
    const center = new Vector3(position.x, position.y - this.playerFeetHeight + half.y, position.z);
    return new Box3(center.clone().sub(half), center.clone().add(half));
  }
}
