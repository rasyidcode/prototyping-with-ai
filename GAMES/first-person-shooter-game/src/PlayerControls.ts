import { Camera } from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export type InputState = Record<'KeyW' | 'KeyA' | 'KeyS' | 'KeyD' | 'Space', boolean>;

export class PlayerControls {
  public readonly controls: PointerLockControls;
  public readonly input: InputState = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false
  };

  constructor(camera: Camera, domElement: HTMLElement) {
    this.controls = new PointerLockControls(camera, domElement);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code in this.input) {
      this.input[event.code as keyof InputState] = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.code in this.input) {
      this.input[event.code as keyof InputState] = false;
    }
  };

  public lock(): void {
    this.controls.lock();
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
