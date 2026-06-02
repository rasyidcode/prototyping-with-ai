import * as THREE from 'three';
import { GameScene } from './GameScene.js';

export class MainMenuScene {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    
    // Ambient fog and sky
    this.scene.background = new THREE.Color(0x0a0718);
    this.scene.fog = new THREE.FogExp2(0x0a0718, 0.04);
    
    this.environmentMeshes = [];
    this.time = 0;
    
    this.init();
  }
  
  init() {
    this._setupLights();
    this._createRoad();
    this._createSidewalks();
    this._createStreetLights();
    this._createBuildings();
    
    // Set up camera positioning for cinematic title screen pan
    this.game.camera.position.set(0, 3.5, 8);
    this.game.camera.rotation.set(-0.25, 0, 0);
    
    // Configure Main Menu UI
    this._setupUI();
  }
  
  getThreeScene() {
    return this.scene;
  }
  
  update(deltaTime) {
    this.time += deltaTime;
    
    // Slowly sway the camera side to side and up and down for a nice cinematic feel
    this.game.camera.position.x = Math.sin(this.time * 0.2) * 1.5;
    this.game.camera.position.y = 3.2 + Math.cos(this.time * 0.3) * 0.4;
    this.game.camera.lookAt(new THREE.Vector3(0, 1.5, -15));
  }
  
  destroy() {
    // Hide Main Menu DOM
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.classList.add('hidden');
    
    // Dispose resources
    this.scene.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
  
  _setupUI() {
    // Reset HUD
    const hud = document.getElementById('hud');
    if (hud) hud.classList.add('hidden');
    
    const gameOver = document.getElementById('game-over');
    if (gameOver) gameOver.classList.add('hidden');
    
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
      mainMenu.classList.remove('hidden');
      
      // Wire Play Button
      const playBtn = document.getElementById('play-btn');
      if (playBtn) {
        playBtn.onclick = () => {
          // Play click noise if audio context is active
          this.game.changeScene(new GameScene(this.game));
        };
      }
      
      // Wire Instructions
      const helpBtn = document.getElementById('help-btn');
      const modal = document.getElementById('instructions-modal');
      const closeHelpBtn = document.getElementById('close-help-btn');
      
      if (helpBtn && modal) {
        helpBtn.onclick = () => {
          modal.classList.remove('hidden');
        };
      }
      
      if (closeHelpBtn && modal) {
        closeHelpBtn.onclick = () => {
          modal.classList.add('hidden');
        };
      }
    }
  }
  
  _setupLights() {
    const ambientLight = new THREE.AmbientLight(0x1a1e36, 0.7);
    this.scene.add(ambientLight);
    
    const moonlight = new THREE.DirectionalLight(0x455688, 0.8);
    moonlight.position.set(5, 20, 10);
    this.scene.add(moonlight);
  }
  
  _createRoad() {
    const roadGeo = new THREE.PlaneGeometry(10, 90);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x121118, roughness: 0.9 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -25);
    this.scene.add(road);
    
    // Yellow lines
    const lineGeo = new THREE.PlaneGeometry(0.2, 3);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd6a827, roughness: 0.9, emissive: 0x110d00 });
    for (let z = 5; z > -70; z -= 8) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.01, z);
      this.scene.add(line);
    }
  }
  
  _createSidewalks() {
    const sidewalkGeo = new THREE.BoxGeometry(4, 0.2, 90);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x24232c, roughness: 0.7 });
    
    const leftSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    leftSidewalk.position.set(-7, 0.1, -25);
    this.scene.add(leftSidewalk);
    
    const rightSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    rightSidewalk.position.set(7, 0.1, -25);
    this.scene.add(rightSidewalk);
  }
  
  _createStreetLights() {
    const lightPositions = [{ x: -5, z: 0 }, { x: 5, z: -15 }, { x: -5, z: -30 }, { x: 5, z: -45 }];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1f2230, metalness: 0.8 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    
    lightPositions.forEach((pos) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0.2, pos.z);
      
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.5, 8);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.25;
      group.add(pole);
      
      const bulbGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(pos.x > 0 ? -0.5 : 0.5, 4.4, 0);
      group.add(bulb);
      
      const spotLight = new THREE.SpotLight(0xffea8c, 4, 15, Math.PI / 4, 0.5, 1);
      spotLight.position.set(pos.x > 0 ? -0.5 : 0.5, 4.3, 0);
      spotLight.target.position.set(pos.x > 0 ? -0.5 : 0.5, 0, 0);
      group.add(spotLight);
      group.add(spotLight.target);
      
      this.scene.add(group);
    });
  }
  
  _createBuildings() {
    const buildingColors = [0x151622, 0x1a1526, 0x121724];
    for (let z = 10; z > -60; z -= 15) {
      this._spawnBuilding(-12, z, buildingColors);
      this._spawnBuilding(12, z, buildingColors);
    }
  }
  
  _spawnBuilding(xOffset, zPos, colors) {
    const height = 10 + Math.random() * 10;
    const width = 5 + Math.random() * 3;
    const depth = 6 + Math.random() * 3;
    
    const geo = new THREE.BoxGeometry(width, height, depth);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.95 });
    
    const building = new THREE.Mesh(geo, mat);
    building.position.set(xOffset, height / 2, zPos);
    this.scene.add(building);
    
    // Simple window planes
    const windowGeo = new THREE.PlaneGeometry(0.3, 0.5);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffdf5e });
    const isLeft = xOffset < 0;
    const faceX = isLeft ? (width / 2 + 0.01) : -(width / 2 + 0.01);
    
    for (let f = 1; f < Math.floor(height / 3); f++) {
      if (Math.random() > 0.4) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(building.position.x + faceX, f * 2.5, building.position.z + (Math.random() - 0.5) * (depth - 2));
        win.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(win);
      }
    }
  }
}
