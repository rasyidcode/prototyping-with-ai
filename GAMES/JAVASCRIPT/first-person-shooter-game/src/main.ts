import './style.css';
import { Clock, Color, PCFSoftShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { PlayerControls } from './PlayerControls';
import { Player } from './Player';
import { setupUi } from './ui';
import { World } from './World';
import { TargetManager } from './TargetManager';
import { Weapon } from './Weapon';

const scene = new Scene();
scene.background = new Color(0x88a1c5);

const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.getElementById('app')?.appendChild(renderer.domElement);

const ui = setupUi();
const controls = new PlayerControls(camera, document.body);
const player = new Player(camera);
const world = new World(scene);
world.build();

const targets = new TargetManager(scene, (score) => ui.setScore(score));
targets.spawnTargets();
const weapon = new Weapon(camera, scene, targets);

ui.bindStart(() => controls.lock());
controls.controls.addEventListener('lock', () => ui.showOverlay(false));
controls.controls.addEventListener('unlock', () => ui.showOverlay(true));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (controls.controls.isLocked) {
    player.update(delta, controls.input, world.colliders);
  }

  weapon.update(delta);
  renderer.render(scene, camera);
}

animate();
