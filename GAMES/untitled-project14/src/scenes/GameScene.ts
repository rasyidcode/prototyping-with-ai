import Phaser from 'phaser';

type FruitId =
  | 'cherry'
  | 'strawberry'
  | 'grape'
  | 'orange'
  | 'apple'
  | 'pear'
  | 'peach'
  | 'melon'
  | 'watermelon';

type FruitConfig = {
  id: FruitId;
  name: string;
  radius: number;
  score: number;
  asset: string;
  next?: FruitId;
};

type FruitBody = Phaser.Physics.Matter.Image & {
  fruitId?: FruitId;
  merging?: boolean;
};

const FRUITS: FruitConfig[] = [
  { id: 'cherry', name: 'Cherry', radius: 18, score: 2, asset: 'fruit-cherry', next: 'strawberry' },
  { id: 'strawberry', name: 'Strawberry', radius: 24, score: 5, asset: 'fruit-strawberry', next: 'grape' },
  { id: 'grape', name: 'Grape', radius: 31, score: 9, asset: 'fruit-grape', next: 'orange' },
  { id: 'orange', name: 'Orange', radius: 39, score: 15, asset: 'fruit-orange', next: 'apple' },
  { id: 'apple', name: 'Apple', radius: 48, score: 24, asset: 'fruit-apple', next: 'pear' },
  { id: 'pear', name: 'Pear', radius: 58, score: 36, asset: 'fruit-pear', next: 'peach' },
  { id: 'peach', name: 'Peach', radius: 70, score: 52, asset: 'fruit-peach', next: 'melon' },
  { id: 'melon', name: 'Melon', radius: 84, score: 75, asset: 'fruit-melon', next: 'watermelon' },
  { id: 'watermelon', name: 'Watermelon', radius: 100, score: 110, asset: 'fruit-watermelon' }
];

const FRUIT_BY_ID = new Map(FRUITS.map((fruit) => [fruit.id, fruit]));
const STARTER_FRUITS = FRUITS.slice(0, 5);
const MAX_DROP_COOLDOWN_MS = 520;
const WALL_THICKNESS = 48;

export class GameScene extends Phaser.Scene {
  private score = 0;
  private dropX = 0;
  private currentFruit: FruitConfig = STARTER_FRUITS[0];
  private nextFruit: FruitConfig = STARTER_FRUITS[1];
  private preview?: Phaser.GameObjects.Image;
  private aimLine?: Phaser.GameObjects.Rectangle;
  private bowlGraphics?: Phaser.GameObjects.Graphics;
  private fruits = new Set<FruitBody>();
  private walls: MatterJS.BodyType[] = [];
  private lastDropAt = 0;
  private scoreElement?: HTMLElement | null;
  private nextFruitElement?: HTMLImageElement | null;
  private resetButton?: HTMLButtonElement | null;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    for (const fruit of FRUITS) {
      this.load.svg(fruit.asset, "/assets/fruits/" + fruit.id + ".svg", {
        width: 128,
        height: 128
      });
    }
  }

  create(): void {
    this.scoreElement = document.querySelector('#score');
    this.nextFruitElement = document.querySelector('#next-fruit');
    this.resetButton = document.querySelector('#reset-button');
    this.resetButton?.addEventListener('click', this.resetGame);

    this.currentFruit = Phaser.Utils.Array.GetRandom(STARTER_FRUITS);
    this.nextFruit = Phaser.Utils.Array.GetRandom(STARTER_FRUITS);
    this.dropX = this.scale.width / 2;

    this.createWorld();
    this.createPreview();
    this.updateHud();

    window.addEventListener("pointermove", this.handleWindowPointerMove, { passive: true });
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.dropFruit, this);
    this.matter.world.on('collisionstart', this.handleCollisionStart, this);
    this.scale.on('resize', this.handleResize, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(): void {
    this.positionPreview();
  }

  private createWorld(): void {
    this.matter.world.setBounds(0, 0, this.scale.width, this.scale.height, WALL_THICKNESS, false, false, false, false);
    this.rebuildWalls();
    this.drawBowl();
  }

  private rebuildWalls(): void {
    for (const wall of this.walls) {
      this.matter.world.remove(wall);
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const bowl = this.getBowlMetrics();

    this.walls = [
      this.matter.add.rectangle(bowl.left - WALL_THICKNESS / 2, bowl.centerY, WALL_THICKNESS, bowl.height, {
        isStatic: true
      }),
      this.matter.add.rectangle(bowl.right + WALL_THICKNESS / 2, bowl.centerY, WALL_THICKNESS, bowl.height, {
        isStatic: true
      }),
      this.matter.add.rectangle(width / 2, bowl.bottom + WALL_THICKNESS / 2, width, WALL_THICKNESS, {
        isStatic: true
      })
    ];
  }

  private drawBowl(): void {
    this.bowlGraphics?.destroy();
    this.bowlGraphics = this.add.graphics();
    const bowl = this.getBowlMetrics();

    this.bowlGraphics.lineStyle(6, 0x365f5b, 0.92);
    this.bowlGraphics.beginPath();
    this.bowlGraphics.moveTo(bowl.left, bowl.top);
    this.bowlGraphics.lineTo(bowl.left, bowl.bottom);
    this.bowlGraphics.lineTo(bowl.right, bowl.bottom);
    this.bowlGraphics.lineTo(bowl.right, bowl.top);
    this.bowlGraphics.strokePath();
    this.bowlGraphics.setDepth(5);
  }

  private createPreview(): void {
    this.aimLine = this.add.rectangle(0, 0, 3, 160, 0x365f5b, 0.18).setOrigin(0.5, 0);
    this.preview = this.add.image(0, 0, this.currentFruit.asset).setAlpha(0.72).setDepth(10);
    this.positionPreview();
  }

  private positionPreview(): void {
    if (!this.preview || !this.aimLine) {
      return;
    }

    const bowl = this.getBowlMetrics();
    const fruit = this.currentFruit;
    this.dropX = Phaser.Math.Clamp(this.dropX, bowl.left + fruit.radius, bowl.right - fruit.radius);
    const dropY = Math.max(44, bowl.top - 42);

    this.preview
      .setTexture(fruit.asset)
      .setDisplaySize(fruit.radius * 2, fruit.radius * 2)
      .setPosition(this.dropX, dropY);
    this.aimLine.setPosition(this.dropX, dropY + fruit.radius + 8);
    this.aimLine.setSize(3, bowl.bottom - dropY - fruit.radius - 10);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.dropX = pointer.x;
  }

  private handleWindowPointerMove = (event: PointerEvent): void => {
    const canvas = this.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();

    if (bounds.width <= 0) {
      return;
    }

    this.dropX = ((event.clientX - bounds.left) / bounds.width) * this.scale.width;
  };

  private dropFruit(pointer: Phaser.Input.Pointer): void {
    if (Date.now() - this.lastDropAt < MAX_DROP_COOLDOWN_MS) {
      return;
    }

    this.dropX = pointer.x;
    this.positionPreview();

    const fruit = this.currentFruit;
    const spawnY = Math.max(42, this.getBowlMetrics().top - 36);
    const body = this.matter.add.image(this.dropX, spawnY, fruit.asset, undefined, {
      restitution: 0.18,
      friction: 0.22,
      frictionAir: 0.012,
      density: 0.0028,
      label: fruit.id
    }) as FruitBody;

    body.fruitId = fruit.id;
    body.setDisplaySize(fruit.radius * 2, fruit.radius * 2);
    body.setCircle(fruit.radius);
    body.setBounce(0.08);
    body.setFriction(0.16, 0.04, 0.22);
    body.setDepth(3);
    this.fruits.add(body);

    this.lastDropAt = Date.now();
    this.currentFruit = this.nextFruit;
    this.nextFruit = Phaser.Utils.Array.GetRandom(STARTER_FRUITS);
    this.updateHud();
  }

  private handleCollisionStart(event: Phaser.Physics.Matter.Events.CollisionStartEvent): void {
    for (const pair of event.pairs) {
      const bodyA = pair.bodyA.gameObject as FruitBody | undefined;
      const bodyB = pair.bodyB.gameObject as FruitBody | undefined;

      if (!bodyA?.fruitId || !bodyB?.fruitId || bodyA.fruitId !== bodyB.fruitId || bodyA.merging || bodyB.merging) {
        continue;
      }

      this.mergeFruits(bodyA, bodyB);
    }
  }

  private mergeFruits(first: FruitBody, second: FruitBody): void {
    const config = FRUIT_BY_ID.get(first.fruitId as FruitId);
    if (!config?.next || !first.body || !second.body) {
      return;
    }

    const nextConfig = FRUIT_BY_ID.get(config.next);
    if (!nextConfig) {
      return;
    }

    first.merging = true;
    second.merging = true;

    const x = (first.x + second.x) / 2;
    const y = (first.y + second.y) / 2;
    const velocityX = (first.body.velocity.x + second.body.velocity.x) / 2;
    const velocityY = (first.body.velocity.y + second.body.velocity.y) / 2;

    this.tweens.add({
      targets: [first, second],
      alpha: 0,
      duration: 90,
      onComplete: () => {
        this.fruits.delete(first);
        this.fruits.delete(second);
        first.destroy();
        second.destroy();
        this.spawnMergedFruit(nextConfig, x, y, velocityX, velocityY);
      }
    });

    this.score += nextConfig.score;
    this.updateHud();
  }

  private spawnMergedFruit(config: FruitConfig, x: number, y: number, velocityX: number, velocityY: number): void {
    const fruit = this.matter.add.image(x, y, config.asset, undefined, {
      restitution: 0.16,
      friction: 0.24,
      frictionAir: 0.012,
      density: 0.0032,
      label: config.id
    }) as FruitBody;

    fruit.fruitId = config.id;
    fruit.setDisplaySize(config.radius * 2, config.radius * 2);
    fruit.setCircle(config.radius);
    fruit.setVelocity(velocityX * 0.35, velocityY * 0.2 - 1.2);
    fruit.setAngularVelocity(Phaser.Math.FloatBetween(-0.035, 0.035));
    fruit.setDepth(3);
    fruit.setAlpha(0);
    this.fruits.add(fruit);

    this.tweens.add({
      targets: fruit,
      alpha: 1,
      duration: 130,
      ease: "Sine.easeOut"
    });
  }

  private resetGame = (): void => {
    for (const fruit of this.fruits) {
      fruit.destroy();
    }
    this.fruits.clear();

    this.score = 0;
    this.currentFruit = Phaser.Utils.Array.GetRandom(STARTER_FRUITS);
    this.nextFruit = Phaser.Utils.Array.GetRandom(STARTER_FRUITS);
    this.updateHud();
  };

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.rebuildWalls();
    this.drawBowl();
    this.positionPreview();
  }

  private updateHud(): void {
    if (this.scoreElement) {
      this.scoreElement.textContent = `${this.score}`;
    }

    if (this.nextFruitElement) {
      this.nextFruitElement.src = `/assets/fruits/${this.nextFruit.id}.svg`;
      this.nextFruitElement.alt = this.nextFruit.name;
    }
  }

  private getBowlMetrics(): { left: number; right: number; top: number; bottom: number; height: number; centerY: number } {
    const width = this.scale.width;
    const height = this.scale.height;
    const bowlWidth = Phaser.Math.Clamp(width - 36, 320, 620);
    const left = (width - bowlWidth) / 2;
    const right = left + bowlWidth;
    const top = Math.max(96, height * 0.15);
    const bottom = height - 20;
    const bowlHeight = bottom - top;

    return {
      left,
      right,
      top,
      bottom,
      height: bowlHeight + WALL_THICKNESS,
      centerY: top + bowlHeight / 2
    };
  }

  private cleanup(): void {
    this.resetButton?.removeEventListener('click', this.resetGame);
    window.removeEventListener("pointermove", this.handleWindowPointerMove);
    this.scale.off('resize', this.handleResize, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerdown', this.dropFruit, this);
    this.matter.world.off('collisionstart', this.handleCollisionStart, this);
  }
}
