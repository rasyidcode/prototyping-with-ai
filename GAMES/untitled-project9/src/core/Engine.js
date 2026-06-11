import * as THREE from 'three';

/**
 * Engine.js
 * Bootstraps and manages the Three.js WebGL scene, camera, lights, and rendering loop.
 */
export class Engine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      throw new Error('Game canvas element not found!');
    }

    // Initialize Core Components
    this.scene = new THREE.Scene();
    this.setupFog();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();

    // Event Listeners
    window.addEventListener('resize', () => this.handleResize());
  }

  setupFog() {
    // Elegant warm-sunset fog to blend buildings into the golden horizon
    this.scene.background = new THREE.Color(0xff8e53);
    this.scene.fog = new THREE.FogExp2(0xff8e53, 0.007);
  }

  setupCamera() {
    // 60-degree Field of View for dynamic speed perspective
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Initial positioning
    this.camera.position.set(0, 20, -30);
    this.camera.lookAt(0, 0, 0);

    // Ideal camera follow offsets
    this.cameraOffset = new THREE.Vector3(0, 15, -22);
    this.cameraLookOffset = new THREE.Vector3(0, 2, 5);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable high-fidelity lighting model & shadow mapping
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setupLights() {
    // 1. Cozy Indigo Twilight ambient light
    this.ambientLight = new THREE.AmbientLight(0x2a1f4d, 0.95);
    this.scene.add(this.ambientLight);

    // 2. Dual-colored Hemisphere light (Sky is warm coral, ground is purple)
    this.hemisphereLight = new THREE.HemisphereLight(0xff6b8b, 0x4a1e75, 0.4);
    this.scene.add(this.hemisphereLight);

    // 3. Main Sunset Directional Light (Warm Orange/Gold)
    this.sunLight = new THREE.DirectionalLight(0xffd59e, 1.85);
    this.sunLight.position.set(80, 50, -40);
    this.sunLight.castShadow = true;

    // High quality shadow map config
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 250;

    const size = 100;
    this.sunLight.shadow.camera.left = -size;
    this.sunLight.shadow.camera.right = size;
    this.sunLight.shadow.camera.top = size;
    this.sunLight.shadow.camera.bottom = -size;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  /**
   * Smoothly lerps the camera to follow the food truck's current position and rotation.
   * @param {THREE.Object3D} target - The food truck mesh or object.
   * @param {number} delta - Delta time for linear interpolation.
   */
  updateCamera(target, delta) {
    if (!target) return;

    // Calculate target camera position relative to truck's local transformation
    const localOffset = this.cameraOffset.clone();
    localOffset.applyQuaternion(target.quaternion);
    const targetCamPos = target.position.clone().add(localOffset);

    // Smoothly interpolate current camera position toward target position
    const lerpSpeed = 4.5 * delta;
    this.camera.position.lerp(targetCamPos, Math.min(lerpSpeed, 1));

    // Calculate a point just in front of the truck for the camera to look at
    const localLook = this.cameraLookOffset.clone();
    localLook.applyQuaternion(target.quaternion);
    const targetLookAt = target.position.clone().add(localLook);

    // Maintain a smooth rotation focus on the target lookat vector
    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    
    // Create an target look direction vector
    const targetDirection = targetLookAt.clone().sub(this.camera.position).normalize();
    
    // Smoothly turn camera using quaternions
    const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(this.camera.position, targetLookAt, new THREE.Vector3(0, 1, 0))
    );
    this.camera.quaternion.slerp(targetRotation, Math.min(lerpSpeed * 1.5, 1));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
