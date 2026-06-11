import * as THREE from 'three';
import { MainMenuScene } from './scenes/MainMenuScene.js';

export class Game {
  constructor() {
    this.container = document.getElementById('app');
    this.renderer = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    
    this.currentScene = null;
    
    // Bind methods to keep proper context in requestAnimationFrame and event listeners
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
  }
  
  init() {
    console.log("Initializing Zombie Slapper Engine...");
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // 1. Setup WebGL Renderer with modern aesthetics
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Shadows & Tonemapping
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    
    // Insert canvas into container
    this.container.appendChild(this.renderer.domElement);
    
    // 2. Setup Perspective Camera
    // Camera is positioned looking down the street. Y=2.2 (approx. eye level), Z=6.
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.set(0, 2.2, 5.5);
    // Tilted slightly down (-0.12 radians, about -7 degrees) to look at incoming zombies
    this.camera.rotation.set(-0.12, 0, 0);
    
    // 3. Create Scene
    this.currentScene = new MainMenuScene(this);
    
    // 4. Hide Loading Overlay
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => loading.remove(), 500);
    }
    
    // 5. Event Listeners
    window.addEventListener('resize', this.onWindowResize);
    
    // 6. Start Loop
    this.clock.getDelta(); // Reset clock delta
    this.animate();
  }
  
  changeScene(newScene) {
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    this.currentScene = newScene;
  }
  
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  animate() {
    requestAnimationFrame(this.animate);
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta to prevent crazy physics/motion jumps
    
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
      
      const threeScene = this.currentScene.getThreeScene();
      if (threeScene) {
        this.renderer.render(threeScene, this.camera);
      }
    }
  }
}
