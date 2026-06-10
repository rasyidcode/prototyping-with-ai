# Design Notes and Next Ideas

## Current Game Feel
The current game is playable but likely too hard by wave 3.

Possible reasons:
- Wave 3 adds a brute because every third wave injects extra enemies.
- Brutes take 3 hits and can absorb player fire while faster enemies continue moving left.
- Enemy speed increases by `+9` per wave.
- Spawns are fairly dense compared with the current single-shot fire rate.
- The player has only 3 lives, and a life is lost both on collision and when an enemy exits the left side.
- There are no recovery tools yet: no shields, repairs, upgrades, bombs, or invulnerability windows.

## Enemy Projectiles
Enemies do not currently shoot projectiles.

A good future implementation would add:
- `EnemyBullet` array.
- Fighter/drifter shooting left on cooldown.
- Brutes firing slower, larger shots.
- Player losing a life on enemy projectile collision.
- 1-bit projectile rendering as rectangles or diamonds.

This should probably be added after balance adjustments, because the game is already difficult.

## Recommended Next Balance Pass
Before adding enemy projectiles, consider:
- Move the first brute from wave 3 to wave 5.
- Reduce wave speed scaling from `+9` per wave to around `+5` or `+6`.
- Add a short player invulnerability blink after taking damage.
- Increase lives from 3 to 4, or make missed enemies affect score instead of lives.
- Add a wave-clear bonus or repair every few waves.

## Good Next Feature Order
1. Balance wave 1-5 difficulty.
2. Add player damage invulnerability feedback.
3. Add powerups or repairs.
4. Add enemy projectiles.
5. Add a boss wave.
6. Add high-score persistence.
