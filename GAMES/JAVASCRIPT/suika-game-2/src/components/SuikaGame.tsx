"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { TEAMS, Team } from "@/app/teams";
import { soundEffects } from "./SoundEffects";

interface SuikaGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (score: number, highestTeam: Team) => void;
  onTeamUnlocked: (rank: number) => void;
  onNextBallChange: (nextTeam: Team) => void;
  onDangerChange: (inDanger: boolean, progress: number) => void;
  restartTrigger: number;
  soundEnabled: boolean;
}

// Function to calculate the radius for a given team rank (1-48)
export const getRadiusForRank = (rank: number): number => {
  const minRadius = 16;
  const maxRadius = 80;
  // Linear scale between rank 1 and 48
  const step = (maxRadius - minRadius) / 47;
  return Math.round(minRadius + (rank - 1) * step);
};

export default function SuikaGame({
  onScoreChange,
  onGameOver,
  onTeamUnlocked,
  onNextBallChange,
  onDangerChange,
  restartTrigger,
  soundEnabled,
}: SuikaGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !gameRef.current) return;

    // Prevent double initialization
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    }

    let nextTeamToDrop = getRandomDropTeam();
    onNextBallChange(nextTeamToDrop);

    class MainScene extends Phaser.Scene {
      private activeBall: Phaser.GameObjects.Image | null = null;
      private nextTeam: Team = nextTeamToDrop;
      private canDrop: boolean = true;
      private score: number = 0;
      private highestRankReached: number = 1;
      private dangerTimer: number = 0;
      private dangerThreshold = 120; // 2 seconds at 60 FPS
      private isGameOver: boolean = false;
      private cursorX: number = 240;
      private dropLineGraphics!: Phaser.GameObjects.Graphics;

      constructor() {
        super("MainScene");
      }

      preload() {
        // Load loading background/text
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Load flag images
        TEAMS.forEach((team) => {
          this.load.image(team.code, `/flags/${team.code}.png`);
        });

        this.load.on("progress", (value: number) => {
          setLoadProgress(value);
        });

        this.load.on("complete", () => {
          setLoading(false);
        });
      }

      create() {
        this.score = 0;
        this.highestRankReached = 1;
        this.dangerTimer = 0;
        this.isGameOver = false;
        this.canDrop = true;

        // Set physics bounds (Left, Right, Top, Bottom)
        // Main box dimensions: width = 480, height = 720
        // Left wall: x = 20, Right wall: x = 460
        // Floor: y = 680
        // Drop line: y = 120
        
        this.matter.world.setBounds(0, 0, 480, 720, 32, true, true, false, true);

        // Visual stadium border bounds
        const borderGraphics = this.add.graphics();
        borderGraphics.lineStyle(4, 0x4f46e5, 0.4); // Neon blue/purple border
        borderGraphics.strokeRect(20, 120, 440, 560);
        
        // Draw the floor line visually
        borderGraphics.lineStyle(4, 0x10b981, 0.8); // Green pitch outline line at floor
        borderGraphics.strokeLineShape(new Phaser.Geom.Line(20, 680, 460, 680));

        // Create danger drop line graphics
        this.dropLineGraphics = this.add.graphics();
        this.drawDangerLine(false);

        // Generate circular textures for each country flag
        TEAMS.forEach((team) => {
          const radius = getRadiusForRank(team.rank);
          const diameter = radius * 2;
          const key = `circle-${team.code}`;

          // Create canvas texture
          const canvasTexture = this.textures.createCanvas(key, diameter, diameter);
          if (canvasTexture) {
            const ctx = canvasTexture.context;

            if (ctx) {
              // Draw circular clipping path
              ctx.beginPath();
              ctx.arc(radius, radius, radius, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();

              // Draw flag image stretched to fit circle
              const flagKey = team.code;
              const flagImg = this.textures.get(flagKey).getSourceImage() as HTMLImageElement;
              if (flagImg) {
                ctx.drawImage(flagImg, 0, 0, flagImg.width, flagImg.height, 0, 0, diameter, diameter);
              }

              // Draw team colored circular border
              ctx.strokeStyle = team.color;
              ctx.lineWidth = Math.max(2, Math.round(radius * 0.1)); // 10% of radius border
              ctx.beginPath();
              ctx.arc(radius, radius, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
              ctx.stroke();

              canvasTexture.refresh();
            }
          }
        });

        // Spawn first active ball
        this.spawnActiveBall();

        // Listen for collisions
        this.matter.world.on("collisionstart", (event: any) => {
          if (this.isGameOver) return;
          this.handleCollisions(event);
        });

        // Pointer controls
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
          if (this.isGameOver || !this.activeBall) return;
          this.cursorX = Phaser.Math.Clamp(pointer.x, 20 + getRadiusForRank(this.activeBall.getData("rank")), 460 - getRadiusForRank(this.activeBall.getData("rank")));
          this.activeBall.setX(this.cursorX);
        });

        this.input.on("pointerdown", () => {
          if (this.isGameOver) return;
          this.dropActiveBall();
        });
      }

      update() {
        if (this.isGameOver) return;

        // Danger line check
        let isAnyBallAboveLine = false;
        
        // Query all active bodies in world
        const bodies = this.matter.world.getAllBodies();
        
        bodies.forEach((body: any) => {
          if (body.isStatic || !body.gameObject) return;
          
          const go = body.gameObject;
          if (go.getData("type") !== "team") return;

          // Skip check if the ball was spawned or dropped very recently (grace period)
          const droppedAt = go.getData("droppedAt");
          if (droppedAt && (this.time.now - droppedAt < 1000)) return;

          // If a dropped ball is resting above the danger line (y = 120)
          const radius = getRadiusForRank(go.getData("rank"));
          const ballTop = go.y - radius;

          // We check if it is above y = 120 and has small velocity (resting/settled)
          if (ballTop < 120 && Math.abs(body.velocity.y) < 0.1 && Math.abs(body.velocity.x) < 0.1) {
            isAnyBallAboveLine = true;
          }
        });

        if (isAnyBallAboveLine) {
          this.dangerTimer++;
          const progress = Phaser.Math.Clamp(this.dangerTimer / this.dangerThreshold, 0, 1);
          onDangerChange(true, progress);
          
          // Flash danger line red
          this.drawDangerLine(true, this.dangerTimer % 20 < 10);

          if (this.dangerTimer >= this.dangerThreshold) {
            this.triggerGameOver();
          }
        } else {
          if (this.dangerTimer > 0) {
            this.dangerTimer = 0;
            onDangerChange(false, 0);
            this.drawDangerLine(false);
          }
        }
      }

      private drawDangerLine(isDanger: boolean, flashOn = false) {
        this.dropLineGraphics.clear();
        if (isDanger) {
          // Flashing Red line
          this.dropLineGraphics.lineStyle(3, flashOn ? 0xef4444 : 0x7f1d1d, 1);
        } else {
          // Dashed yellow line
          this.dropLineGraphics.lineStyle(2, 0xeab308, 0.5);
        }

        // Draw dashed line across the drop area
        const y = 120;
        const dashLength = 10;
        const gapLength = 6;
        for (let x = 20; x < 460; x += dashLength + gapLength) {
          this.dropLineGraphics.lineBetween(x, y, x + dashLength, y);
        }
      }

      private spawnActiveBall() {
        if (this.isGameOver) return;

        const team = this.nextTeam;
        const radius = getRadiusForRank(team.rank);
        const key = `circle-${team.code}`;

        // Place at the top center or current cursor x
        const spawnX = Phaser.Math.Clamp(this.cursorX, 20 + radius, 460 - radius);
        
        // Create as a simple visual image (no physics body)
        this.activeBall = this.add.image(spawnX, 70, key);

        this.activeBall.setData("type", "team");
        this.activeBall.setData("rank", team.rank);
        this.activeBall.setData("color", team.color);
        this.activeBall.setData("code", team.code);

        // Fetch the next team preview
        nextTeamToDrop = getRandomDropTeam();
        this.nextTeam = nextTeamToDrop;
        onNextBallChange(this.nextTeam);

        this.canDrop = true;
      }

      private dropActiveBall() {
        if (!this.canDrop || !this.activeBall) return;
        this.canDrop = false;

        // Play drop sound
        soundEffects.playDrop();

        const x = this.activeBall.x;
        const rank = this.activeBall.getData("rank");
        const code = this.activeBall.getData("code");
        const color = this.activeBall.getData("color");
        const radius = getRadiusForRank(rank);

        // Destroy the visual pointer ball
        this.activeBall.destroy();
        this.activeBall = null;

        // Spawn as a new dynamic Matter image that starts falling immediately
        const key = `circle-${code}`;
        const ball = this.matter.add.image(x, 70, key);
        ball.setCircle(radius);

        ball.setData("type", "team");
        ball.setData("rank", rank);
        ball.setData("color", color);
        ball.setData("droppedAt", this.time.now);
        
        // Physics settings for elastic bouncy collisions
        ball.setBounce(0.25);
        ball.setFriction(0.02, 0.01, 0.05); // low friction, allows rolling
        ball.setDensity(0.005 * rank); // dynamic mass scaling

        // Spawn next ball after short delay (500ms)
        this.time.delayedCall(500, () => {
          this.spawnActiveBall();
        });
      }

      private handleCollisions(event: any) {
        event.pairs.forEach((pair: any) => {
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;

          if (!bodyA.gameObject || !bodyB.gameObject) return;

          const goA = bodyA.gameObject as Phaser.Physics.Matter.Image;
          const goB = bodyB.gameObject as Phaser.Physics.Matter.Image;

          if (
            goA.getData("type") === "team" &&
            goB.getData("type") === "team"
          ) {
            const rankA = goA.getData("rank");
            const rankB = goB.getData("rank");

            if (rankA === rankB) {
              this.mergeBalls(goA, goB);
            }
          }
        });
      }

      private mergeBalls(
        goA: Phaser.Physics.Matter.Image,
        goB: Phaser.Physics.Matter.Image
      ) {
        // Prevent double merge
        if (goA.getData("merged") || goB.getData("merged")) return;
        goA.setData("merged", true);
        goB.setData("merged", true);

        // Calculate midpoint
        const midX = (goA.x + goB.x) / 2;
        const midY = (goA.y + goB.y) / 2;
        const rank = goA.getData("rank");

        // Destroy merging balls
        goA.destroy();
        goB.destroy();

        // Calculate score additions (higher rank = more points)
        const pointGain = rank * 2;
        this.score += pointGain;
        onScoreChange(this.score);

        // Spark sound effect
        soundEffects.playMerge();

        // Create circular particle burst using the team's primary color
        this.createMergeParticles(midX, midY, goA.getData("color"));

        // Trigger unlock event for progress album
        onTeamUnlocked(rank);

        // If we haven't reached Argentina (48), spawn next rank
        if (rank < 48) {
          const nextRank = rank + 1;
          if (nextRank > this.highestRankReached) {
            this.highestRankReached = nextRank;
          }
          this.spawnMergedBall(midX, midY, nextRank);
        } else {
          // Ultimate merge (Argentina + Argentina = giant explosion + massive bonus)
          this.score += 1000;
          onScoreChange(this.score);
          this.createMergeParticles(midX, midY, "#ffd700"); // gold particles
          soundEffects.playRecord();
        }
      }

      private spawnMergedBall(x: number, y: number, rank: number) {
        const team = TEAMS[rank - 1];
        const radius = getRadiusForRank(rank);
        const key = `circle-${team.code}`;

        const mergedBall = this.matter.add.image(x, y, key);
        mergedBall.setCircle(radius);

        mergedBall.setData("type", "team");
        mergedBall.setData("rank", rank);
        mergedBall.setData("color", team.color);
        mergedBall.setData("droppedAt", this.time.now);

        mergedBall.setBounce(0.25);
        mergedBall.setFriction(0.02, 0.01, 0.05);
        mergedBall.setDensity(0.005 * rank);

        // Juicy bounce-in scaling effect
        mergedBall.setScale(0);
        this.tweens.add({
          targets: mergedBall,
          scale: 1,
          duration: 200,
          ease: "Back.easeOut",
        });

        // Trigger unlock check
        onTeamUnlocked(rank);
      }

      private createMergeParticles(x: number, y: number, colorStr: string) {
        const color = Phaser.Display.Color.HexStringToColor(colorStr).color;

        if (!this.textures.exists("particle-dot")) {
          const canvas = this.textures.createCanvas("particle-dot", 8, 8);
          if (canvas) {
            const ctx = canvas.context;
            if (ctx) {
              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(4, 4, 4, 0, Math.PI * 2);
              ctx.fill();
              canvas.refresh();
            }
          }
        }

        const emitter = this.add.particles(x, y, "particle-dot", {
          speed: { min: 80, max: 200 },
          scale: { start: 1, end: 0 },
          tint: color,
          lifespan: 500,
          blendMode: "ADD",
          maxParticles: 16,
          gravityY: 150,
        });

        this.time.delayedCall(700, () => {
          emitter.destroy();
        });
      }

      private triggerGameOver() {
        this.isGameOver = true;
        soundEffects.playGameOver();
        
        const highestTeam = TEAMS[this.highestRankReached - 1];
        onGameOver(this.score, highestTeam);
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 480,
      height: 720,
      parent: gameRef.current,
      transparent: true, // Let React CSS display the background
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 0.98 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [MainScene],
    };

    const phaserGame = new Phaser.Game(config);
    phaserGameRef.current = phaserGame;

    // Set sound enabled state on loading
    if (!soundEnabled) {
      if (soundEffects.isSoundEnabled()) soundEffects.toggleSound();
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [restartTrigger]);

  // Helper to generate a random starting team (rank 1 to 5)
  function getRandomDropTeam(): Team {
    // Only drop smallest 5 teams so the player must merge for higher ranks
    const dropPoolSize = 5;
    const randomIndex = Math.floor(Math.random() * dropPoolSize);
    return TEAMS[randomIndex];
  }

  return (
    <div className="relative w-full h-full max-w-[480px] aspect-[2/3] mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-[#1e1b4b] bg-radial from-[#1e3a8a]/70 to-[#030712]/95 backdrop-blur-sm">
      {/* Stadium Soccer Pitch Lines Background Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {/* Pitch outer line */}
        <div className="absolute inset-4 border border-white" />
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 border border-white rounded-full" />
        {/* Center line */}
        <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white -translate-y-1/2" />
        {/* Penalty boxes */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-20 border border-white border-t-0" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-20 border border-white border-b-0" />
      </div>

      {/* Phaser Canvas container */}
      <div ref={gameRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090514] z-50 transition-opacity duration-300">
          <div className="relative w-24 h-24 mb-6">
            {/* Spinning football animation */}
            <div className="absolute inset-0 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <div className="absolute inset-2 flex items-center justify-center text-4xl">⚽</div>
          </div>
          <h2 className="text-xl font-bold tracking-widest text-indigo-200 mb-2 font-mono uppercase">
            Loading World Cup...
          </h2>
          <div className="w-48 h-2 bg-indigo-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-150"
              style={{ width: `${loadProgress * 100}%` }}
            />
          </div>
          <span className="text-xs text-indigo-400/70 mt-2 font-mono">
            {Math.round(loadProgress * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
