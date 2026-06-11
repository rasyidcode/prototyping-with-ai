import Phaser from 'phaser';
import './styles.css';
import { GameScene } from './scenes/GameScene';

const gameElement = document.querySelector<HTMLElement>('#game');

if (!gameElement) {
  throw new Error('Missing #game container');
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: gameElement,
  backgroundColor: '#f7efe2',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: gameElement.clientWidth,
    height: gameElement.clientHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1.15 },
      debug: false
    }
  },
  scene: [GameScene],
  render: {
    antialias: true,
    pixelArt: false
  }
};

new Phaser.Game(config);
