// Neon Orbit Defender — the whole simulation: player, enemies, bullets,
// pickups, particles, waves, score and combo. Pure logic: no DOM, no canvas,
// no audio here, so it can be stepped deterministically from any seed.
import { ARENA, PLAYER, ENEMY, PICKUP, COMBO_WINDOW, MAX_MULTIPLIER } from './config.js';
import { mulberry32, range, pick, clamp, distanceSquared } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_SHOOT = 1;
export const EVENT_ENEMY_SHOOT = 2;
export const EVENT_KILL = 4;
export const EVENT_HURT = 8;
export const EVENT_PICKUP = 16;
export const EVENT_POWERUP = 32;
export const EVENT_WAVE = 64;
export const EVENT_OVER = 128;

const WAVE_COMPOSITION = [
  ['drifter', 'drifter', 'drifter', 'drifter'],
  ['drifter', 'drifter', 'darter', 'drifter', 'darter', 'weaver'],
  ['darter', 'darter', 'weaver', 'drifter', 'splitter', 'weaver', 'darter'],
  ['weaver', 'weaver', 'shooter', 'darter', 'splitter', 'darter', 'weaver', 'shooter'],
];

function waveQueue(wave, rng) {
  const base = WAVE_COMPOSITION[Math.min(wave - 1, WAVE_COMPOSITION.length - 1)];
  const queue = [...base];
  const extra = Math.min(2 + wave, 10);
  for (let i = 0; i < extra; i += 1) {
    queue.push(pick(rng, ['drifter', 'darter', 'weaver', 'splitter', 'shooter']));
  }
  // Shuffle the tail so the wave never plays the same twice.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

function edgeSpawn(rng, player) {
  for (let tries = 0; tries < 12; tries += 1) {
    const side = Math.floor(rng() * 4);
    const margin = 40;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = range(rng, margin, ARENA.width - margin);
      y = margin;
    } else if (side === 1) {
      x = range(rng, margin, ARENA.width - margin);
      y = ARENA.height - margin;
    } else if (side === 2) {
      x = margin;
      y = range(rng, margin, ARENA.height - margin);
    } else {
      x = ARENA.width - margin;
      y = range(rng, margin, ARENA.height - margin);
    }
    if (distanceSquared(x, y, player.x, player.y) > 320 * 320) return { x, y };
  }
  return { x: 60, y: 60 };
}

export class World {
  constructor(seed = 1) {
    this.rng = mulberry32(seed);
    this.reset();
  }

  reset() {
    this.state = {
      time: 0,
      score: 0,
      best: 0,
      combo: 0,
      comboTimer: 0,
      kills: 0,
      wave: 0,
      lives: PLAYER.maxLives,
      over: false,
      waveState: 'intro',
      waveTimer: 1.2,
      banner: '',
      bannerTimer: 0,
      shake: 0,
      player: {
        x: ARENA.width / 2,
        y: ARENA.height / 2,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        radius: PLAYER.radius,
        fireTimer: 0,
        invulnerable: 0,
        shield: 0,
        rapidTimer: 0,
      },
      bullets: [],
      enemies: [],
      enemyBullets: [],
      particles: [],
      pickups: [],
      floaters: [],
      spawnQueue: [],
      spawnTimer: 0,
      stars: [],
    };
    for (let i = 0; i < 130; i += 1) {
      this.state.stars.push({
        x: this.rng() * ARENA.width,
        y: this.rng() * ARENA.height,
        size: range(this.rng, 0.6, 2.2),
        twinkle: range(this.rng, 0, Math.PI * 2),
        speed: range(this.rng, 0.2, 0.8),
      });
    }
    this.startWave(1);
  }

  get multiplier() {
    return Math.min(1 + Math.floor(this.state.combo / 5), MAX_MULTIPLIER);
  }

  startWave(n) {
    const s = this.state;
    s.wave = n;
    s.waveState = 'intro';
    s.waveTimer = 1.6;
    s.banner = `WAVE ${n}`;
    s.bannerTimer = 1.6;
    s.spawnQueue = waveQueue(n, this.rng);
    s.spawnTimer = 0.4;
  }

  addScore(base, x, y, label) {
    const s = this.state;
    const gained = base * this.multiplier;
    s.score += gained;
    s.floaters.push({ x, y, text: label ? `${label} +${gained}` : `+${gained}`, life: 0.9, max: 0.9 });
    return gained;
  }

  burst(x, y, color, count, speed) {
    const s = this.state;
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      const v = range(this.rng, speed * 0.3, speed);
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: range(this.rng, 0.3, 0.8),
        max: 0.8,
        size: range(this.rng, 1.5, 4),
        color,
      });
    }
  }

  spawnEnemy(kind) {
    const s = this.state;
    const def = ENEMY[kind];
    const pos = edgeSpawn(this.rng, s.player);
    s.enemies.push({
      kind,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed * range(this.rng, 0.9, 1.15),
      score: def.score,
      color: def.color,
      angle: 0,
      phase: this.rng() * Math.PI * 2,
      stateTimer: range(this.rng, 0.5, 1.5),
      fireTimer: range(this.rng, 1.2, 2.4),
      flash: 0,
    });
  }

  dropPickup(x, y) {
    const roll = this.rng();
    if (roll < 0.55) {
      this.state.pickups.push({ kind: 'shard', x, y, vx: 0, vy: 0, life: 9, radius: 10 });
    } else if (roll < 0.78) {
      this.state.pickups.push({ kind: 'shield', x, y, vx: 0, vy: 0, life: 9, radius: 12 });
    } else {
      this.state.pickups.push({ kind: 'rapid', x, y, vx: 0, vy: 0, life: 9, radius: 12 });
    }
  }

  killEnemy(enemy, index, award = true) {
    const s = this.state;
    s.enemies.splice(index, 1);
    if (award) {
      s.kills += 1;
      s.combo += 1;
      s.comboTimer = COMBO_WINDOW;
      this.addScore(enemy.score, enemy.x, enemy.y);
    }
    this.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'splitter' ? 26 : 14, 260);
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        const angle = this.rng() * Math.PI * 2;
        s.enemies.push({
          kind: 'drifter',
          x: enemy.x + Math.cos(angle) * 20,
          y: enemy.y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * 120,
          vy: Math.sin(angle) * 120,
          radius: ENEMY.drifter.radius,
          hp: 1,
          maxHp: 1,
          speed: ENEMY.drifter.speed * 1.3,
          score: ENEMY.drifter.score,
          color: ENEMY.drifter.color,
          angle: 0,
          phase: this.rng() * Math.PI * 2,
          stateTimer: 1,
          fireTimer: 99,
          flash: 0,
        });
      }
    }
    if (award && this.rng() < 0.42) this.dropPickup(enemy.x, enemy.y);
  }

  hurtPlayer() {
    const s = this.state;
    const p = s.player;
    if (p.invulnerable > 0 || s.over) return EVENT_NONE;
    if (p.shield > 0) {
      p.shield = Math.max(0, p.shield - 34);
      p.invulnerable = 1.0;
      this.burst(p.x, p.y, '#59c2ff', 12, 220);
      s.floaters.push({ x: p.x, y: p.y - 30, text: 'SHIELD ABSORBED', life: 1, max: 1 });
      return EVENT_HURT;
    }
    s.lives -= 1;
    s.combo = 0;
    s.comboTimer = 0;
    p.invulnerable = PLAYER.invulnerableSeconds;
    s.shake = 14;
    this.burst(p.x, p.y, '#4df3ff', 30, 320);
    if (s.lives <= 0) {
      s.over = true;
      this.burst(p.x, p.y, '#ffffff', 50, 420);
      return EVENT_HURT | EVENT_OVER;
    }
    return EVENT_HURT;
  }

  /** Advance the simulation one fixed step. `input` is {moveX, moveY, aimX, aimY, firing}. */
  step(dt, input) {
    const s = this.state;
    if (s.over) {
      this._updateFx(dt);
      return EVENT_NONE;
    }
    let events = EVENT_NONE;
    s.time += dt;
    const p = s.player;

    // --- player movement (acceleration + drag, clamped to the arena) ---
    p.vx += input.moveX * PLAYER.accel * dt;
    p.vy += input.moveY * PLAYER.accel * dt;
    const drag = Math.max(0, 1 - PLAYER.drag * dt);
    p.vx *= drag;
    p.vy *= drag;
    const speed = Math.hypot(p.vx, p.vy);
    const maxSpeed = PLAYER.speed;
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }
    p.x = clamp(p.x + p.vx * dt, p.radius + 6, ARENA.width - p.radius - 6);
    p.y = clamp(p.y + p.vy * dt, p.radius + 6, ARENA.height - p.radius - 6);
    p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (p.rapidTimer > 0) p.rapidTimer -= dt;

    // --- firing ---
    p.fireTimer -= dt;
    const interval = p.rapidTimer > 0 ? PLAYER.rapidFireInterval : PLAYER.fireInterval;
    if (input.firing && p.fireTimer <= 0) {
      p.fireTimer = interval;
      const spread = p.rapidTimer > 0 ? 0.09 : 0;
      const a = p.angle + (this.rng() - 0.5) * spread;
      s.bullets.push({
        x: p.x + Math.cos(a) * (p.radius + 8),
        y: p.y + Math.sin(a) * (p.radius + 8),
        vx: Math.cos(a) * PLAYER.bulletSpeed,
        vy: Math.sin(a) * PLAYER.bulletSpeed,
        radius: 4,
        life: 1.1,
      });
      events |= EVENT_SHOOT;
    }

    // --- wave flow ---
    if (s.waveState === 'intro') {
      s.waveTimer -= dt;
      if (s.waveTimer <= 0) {
        s.waveState = 'active';
        events |= EVENT_WAVE;
      }
    } else if (s.waveState === 'active') {
      if (s.spawnQueue.length > 0) {
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          s.spawnTimer = Math.max(0.28, 0.75 - s.wave * 0.04);
          this.spawnEnemy(s.spawnQueue.shift());
        }
      } else if (s.enemies.length === 0) {
        s.waveState = 'clear';
        s.waveTimer = 2.2;
        const bonus = 100 * s.wave;
        s.score += bonus;
        s.banner = `WAVE ${s.wave} CLEAR  +${bonus}`;
        s.bannerTimer = 2.2;
      }
    } else if (s.waveState === 'clear') {
      s.waveTimer -= dt;
      if (s.waveTimer <= 0) this.startWave(s.wave + 1);
    }
    if (s.bannerTimer > 0) s.bannerTimer -= dt;
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) s.combo = 0;
    }

    this._updateEnemies(dt);
    this._updateBullets(dt);
    this._updatePickups(dt);
    this._updateFx(dt);

    // --- player vs enemies ---
    for (let i = s.enemies.length - 1; i >= 0; i -= 1) {
      const e = s.enemies[i];
      const rr = e.radius + p.radius - 4;
      if (distanceSquared(e.x, e.y, p.x, p.y) < rr * rr) {
        events |= this.hurtPlayer();
        // Ramming destroys the enemy but awards no score or combo:
        // points come from shooting, not from getting hit.
        this.killEnemy(e, i, false);
        if (s.over) return events | EVENT_OVER;
        break;
      }
    }
    // --- player vs enemy bullets ---
    for (let i = s.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = s.enemyBullets[i];
      const rr = b.radius + p.radius - 2;
      if (distanceSquared(b.x, b.y, p.x, p.y) < rr * rr) {
        s.enemyBullets.splice(i, 1);
        events |= this.hurtPlayer();
        if (s.over) return events | EVENT_OVER;
        break;
      }
    }
    return events;
  }

  _updateEnemies(dt) {
    const s = this.state;
    const p = s.player;
    for (let i = s.enemies.length - 1; i >= 0; i -= 1) {
      const e = s.enemies[i];
      e.flash = Math.max(0, e.flash - dt * 6);
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      e.stateTimer -= dt;
      if (e.kind === 'drifter') {
        e.vx += nx * e.speed * 1.6 * dt;
        e.vy += ny * e.speed * 1.6 * dt;
      } else if (e.kind === 'darter') {
        if (e.stateTimer <= 0) {
          e.stateTimer = range(this.rng, 0.9, 1.6);
          e.vx = nx * e.speed * range(this.rng, 1.1, 1.4);
          e.vy = ny * e.speed * range(this.rng, 1.1, 1.4);
        }
      } else if (e.kind === 'weaver') {
        const wobble = Math.sin(s.time * 3 + e.phase) * 140;
        e.vx = nx * e.speed + -ny * wobble;
        e.vy = ny * e.speed + nx * wobble;
      } else if (e.kind === 'splitter') {
        e.vx += nx * e.speed * 1.2 * dt;
        e.vy += ny * e.speed * 1.2 * dt;
      } else if (e.kind === 'shooter') {
        const want = 330;
        const toward = dist > want + 40 ? 1 : dist < want - 40 ? -1 : 0;
        e.vx = nx * e.speed * toward + -ny * Math.sin(s.time + e.phase) * 60;
        e.vy = ny * e.speed * toward + nx * Math.sin(s.time + e.phase) * 60;
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 560) {
          e.fireTimer = range(this.rng, 1.8, 2.6);
          s.enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: nx * 260,
            vy: ny * 260,
            radius: 6,
            life: 4,
          });
          this._lastEnemyShot = true;
        }
      }
      const esp = Math.hypot(e.vx, e.vy);
      const cap = e.kind === 'darter' ? e.speed * 1.5 : e.speed * 1.6;
      if (esp > cap) {
        e.vx = (e.vx / esp) * cap;
        e.vy = (e.vy / esp) * cap;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = clamp(e.x, e.radius, ARENA.width - e.radius);
      e.y = clamp(e.y, e.radius, ARENA.height - e.radius);
      e.angle = Math.atan2(e.vy, e.vx);
    }
    if (this._lastEnemyShot) {
      this._lastEnemyShot = false;
      this._pendingEnemyShoot = true;
    }
  }

  _updateBullets(dt) {
    const s = this.state;
    for (let i = s.bullets.length - 1; i >= 0; i -= 1) {
      const b = s.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
      if (!dead) {
        for (let j = s.enemies.length - 1; j >= 0; j -= 1) {
          const e = s.enemies[j];
          const rr = e.radius + b.radius;
          if (distanceSquared(b.x, b.y, e.x, e.y) < rr * rr) {
            dead = true;
            e.hp -= 1;
            e.flash = 1;
            this.burst(b.x, b.y, '#ffe45e', 4, 140);
            if (e.hp <= 0) {
              this.killEnemy(e, j);
              this._pendingKill = true;
            }
            break;
          }
        }
      }
      if (dead) s.bullets.splice(i, 1);
    }
    for (let i = s.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = s.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20) {
        s.enemyBullets.splice(i, 1);
      }
    }
  }

  _updatePickups(dt) {
    const s = this.state;
    const p = s.player;
    for (let i = s.pickups.length - 1; i >= 0; i -= 1) {
      const pk = s.pickups[i];
      pk.life -= dt;
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 130) {
        pk.x += (dx / dist) * 260 * dt;
        pk.y += (dy / dist) * 260 * dt;
      }
      if (dist < p.radius + pk.radius + 4) {
        s.pickups.splice(i, 1);
        if (pk.kind === 'shard') {
          this.addScore(PICKUP.shardScore, pk.x, pk.y, 'SHARD');
          this._pendingPickup = true;
        } else if (pk.kind === 'shield') {
          p.shield = Math.min(100, p.shield + PICKUP.shieldAmount);
          s.floaters.push({ x: pk.x, y: pk.y - 20, text: 'SHIELD +40', life: 1, max: 1 });
          this._pendingPowerup = true;
        } else {
          p.rapidTimer = PICKUP.rapidSeconds;
          s.floaters.push({ x: pk.x, y: pk.y - 20, text: 'RAPID FIRE!', life: 1, max: 1 });
          this._pendingPowerup = true;
        }
      } else if (pk.life <= 0) {
        s.pickups.splice(i, 1);
      }
    }
  }

  _updateFx(dt) {
    const s = this.state;
    for (let i = s.particles.length - 1; i >= 0; i -= 1) {
      const pt = s.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - 2.4 * dt;
      pt.vy *= 1 - 2.4 * dt;
      pt.life -= dt;
      if (pt.life <= 0) s.particles.splice(i, 1);
    }
    for (let i = s.floaters.length - 1; i >= 0; i -= 1) {
      const f = s.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) s.floaters.splice(i, 1);
    }
    for (const star of s.stars) {
      star.twinkle += dt * 2;
      star.y += star.speed * dt * 6;
      if (star.y > ARENA.height) {
        star.y = 0;
        star.x = this.rng() * ARENA.width;
      }
    }
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 40);
  }

  /** Drain the one-shot sound flags queued by the update helpers. */
  drainSoundFlags() {
    const flags = {
      kill: !!this._pendingKill,
      pickup: !!this._pendingPickup,
      powerup: !!this._pendingPowerup,
      enemyShoot: !!this._pendingEnemyShoot,
    };
    this._pendingKill = false;
    this._pendingPickup = false;
    this._pendingPowerup = false;
    this._pendingEnemyShoot = false;
    return flags;
  }
}
