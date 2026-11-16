// All drawing: arena, starfield, ships, enemies, bullets, pickups, HUD and
// the title / pause / game-over screens. Canvas 2D only, no images.
import { ARENA, COLORS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

function drawBackground(ctx, state) {
  const bg = ctx.createRadialGradient(
    ARENA.width / 2, ARENA.height / 2, 80,
    ARENA.width / 2, ARENA.height / 2, 900,
  );
  bg.addColorStop(0, '#0d1338');
  bg.addColorStop(0.55, COLORS.background);
  bg.addColorStop(1, '#04050f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Two soft nebula blobs, drawn from code, never an image.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS.nebulaA;
  ctx.beginPath();
  ctx.ellipse(300, 200, 260, 150, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.nebulaB;
  ctx.beginPath();
  ctx.ellipse(1020, 620, 300, 170, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Faint grid.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= ARENA.width; x += 80) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
  }
  for (let y = 0; y <= ARENA.height; y += 80) {
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
  }
  ctx.stroke();

  // Twinkling starfield (positions live in the world state).
  for (const star of state.stars) {
    const alpha = 0.35 + 0.35 * Math.sin(star.twinkle);
    ctx.globalAlpha = Math.max(0.1, alpha);
    ctx.fillStyle = '#cfe4ff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
  // Arena rim.
  ctx.strokeStyle = 'rgba(77, 243, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, ARENA.width - 8, ARENA.height - 8);
}

function drawPlayer(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invulnerable > 0 && Math.floor(p.invulnerable * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(89, 194, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.rotate(p.angle);
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -13);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 13);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 2;
  if (e.kind === 'drifter') {
    ctx.rotate(e.angle);
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.radius;
      const py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'darter') {
    ctx.rotate(e.angle);
    ctx.beginPath();
    ctx.moveTo(e.radius + 6, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.7);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.lineTo(-e.radius, e.radius * 0.7);
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'weaver') {
    ctx.rotate(e.angle * 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#070a1a';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'splitter') {
    ctx.rotate(e.angle);
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? e.radius : e.radius * 0.6;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // shooter: diamond with a core
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-e.radius * 0.75, -e.radius * 0.75, e.radius * 1.5, e.radius * 1.5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (e.maxHp > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(e.x - 16, e.y - e.radius - 10, 32, 4);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - 16, e.y - e.radius - 10, 32 * (e.hp / e.maxHp), 4);
  }
}

function drawWorld(ctx, state) {
  drawBackground(ctx, state);
  const s = state;
  for (const pk of s.pickups) {
    const blink = pk.life < 3 ? (Math.floor(pk.life * 6) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(pk.x, pk.y);
    ctx.shadowBlur = 12;
    if (pk.kind === 'shard') {
      ctx.shadowColor = COLORS.shard;
      ctx.fillStyle = COLORS.shard;
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-6, -6, 12, 12);
    } else if (pk.kind === 'shield') {
      ctx.shadowColor = COLORS.shield;
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLORS.shield;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', 0, 1);
    } else {
      ctx.shadowColor = COLORS.rapid;
      ctx.fillStyle = COLORS.rapid;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R', 0, 1);
      ctx.strokeStyle = COLORS.rapid;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const e of s.enemies) drawEnemy(ctx, e);
  ctx.fillStyle = COLORS.bullet;
  ctx.shadowColor = COLORS.bullet;
  ctx.shadowBlur = 10;
  for (const b of s.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.enemyBullet;
  ctx.shadowColor = COLORS.enemyBullet;
  ctx.shadowBlur = 10;
  for (const b of s.enemyBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (const pt of s.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  if (!s.over) drawPlayer(ctx, s.player);
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of s.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, state, multiplier) {
  const s = state;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE ${s.score}`, 24, 18);
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`BEST ${Math.max(s.best, s.score)}`, 24, 52);
  if (multiplier > 1) {
    ctx.fillStyle = '#ffb02e';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${multiplier}`, 24, 76);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${s.wave}`, ARENA.width - 24, 18);
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`KILLS ${s.kills}`, ARENA.width - 24, 50);
  // Lives as little ships, bottom-left.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SHIPS', 24, ARENA.height - 34);
  for (let i = 0; i < s.lives; i += 1) {
    const x = 92 + i * 28;
    const y = ARENA.height - 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Shield bar, bottom-centre.
  if (s.player.shield > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(ARENA.width / 2 - 110, ARENA.height - 32, 220, 12);
    ctx.fillStyle = COLORS.shield;
    ctx.fillRect(ARENA.width / 2 - 110, ARENA.height - 32, 220 * (s.player.shield / 100), 12);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHIELD', ARENA.width / 2, ARENA.height - 52);
  }
  if (s.player.rapidTimer > 0) {
    ctx.fillStyle = COLORS.rapid;
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`RAPID FIRE ${Math.ceil(s.player.rapidTimer)}s`, ARENA.width / 2, ARENA.height - 76);
  }
  if (s.bannerTimer > 0 && s.banner) {
    ctx.globalAlpha = Math.min(1, s.bannerTimer);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 24;
    ctx.fillText(s.banner, ARENA.width / 2, 150);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function overlay(ctx, lines) {
  ctx.fillStyle = 'rgba(4, 6, 18, 0.72)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let y = 190;
  for (const line of lines) {
    ctx.fillStyle = line.color || COLORS.text;
    ctx.font = line.font;
    ctx.shadowColor = line.glow || 'transparent';
    ctx.shadowBlur = line.glow ? 22 : 0;
    ctx.fillText(line.text, ARENA.width / 2, y);
    y += line.gap;
  }
  ctx.shadowBlur = 0;
}

export function drawTitle(ctx, state, best) {
  drawWorld(ctx, state);
  overlay(ctx, [
    { text: 'NEON ORBIT', font: 'bold 84px "Segoe UI", system-ui, sans-serif', gap: 92, glow: '#4df3ff' },
    { text: 'DEFENDER', font: 'bold 84px "Segoe UI", system-ui, sans-serif', gap: 110, color: '#ff9df5', glow: '#ff9df5' },
    { text: 'Hold the orbit. Blast the swarm. Chain kills for combos.', font: '20px "Segoe UI", system-ui, sans-serif', gap: 44, color: COLORS.dim },
    { text: 'WASD / ARROWS — fly      MOUSE — aim      CLICK / SPACE — fire', font: 'bold 19px "Segoe UI", system-ui, sans-serif', gap: 40 },
    { text: 'P — pause      M — mute      R — restart', font: '17px "Segoe UI", system-ui, sans-serif', gap: 40, color: COLORS.dim },
    { text: 'Grab shards for score, S for shield, R for rapid fire. 3 ships. Survive the waves.', font: '17px "Segoe UI", system-ui, sans-serif', gap: 70, color: COLORS.dim },
    { text: '— CLICK OR PRESS ENTER TO LAUNCH —', font: 'bold 24px "Segoe UI", system-ui, sans-serif', gap: 52, color: '#ffe45e', glow: '#ffe45e' },
    { text: best > 0 ? `BEST SCORE  ${best}` : 'FIRST FLIGHT — GOOD LUCK, PILOT', font: '18px "Segoe UI", system-ui, sans-serif', gap: 0, color: COLORS.dim },
  ]);
}

export function drawPause(ctx, state) {
  drawWorld(ctx, state);
  overlay(ctx, [
    { text: 'PAUSED', font: 'bold 64px "Segoe UI", system-ui, sans-serif', gap: 80, glow: '#4df3ff' },
    { text: 'Press P or click to resume', font: '20px "Segoe UI", system-ui, sans-serif', gap: 0, color: COLORS.dim },
  ]);
}

export function drawGameOver(ctx, state, best, isNewBest) {
  drawWorld(ctx, state);
  overlay(ctx, [
    { text: 'GAME OVER', font: 'bold 72px "Segoe UI", system-ui, sans-serif', gap: 90, color: '#ff5d8f', glow: '#ff5d8f' },
    { text: `FINAL SCORE  ${state.score}`, font: 'bold 34px "Segoe UI", system-ui, sans-serif', gap: 48 },
    { text: `WAVE REACHED  ${state.wave}      KILLS  ${state.kills}`, font: '20px "Segoe UI", system-ui, sans-serif', gap: 48, color: COLORS.dim },
    { text: isNewBest ? '★ NEW BEST SCORE! ★' : `BEST SCORE  ${best}`, font: 'bold 22px "Segoe UI", system-ui, sans-serif', gap: 70, color: '#ffe45e', glow: '#ffe45e' },
    { text: '— PRESS R OR CLICK TO FLY AGAIN —', font: 'bold 22px "Segoe UI", system-ui, sans-serif', gap: 0, color: '#4df3ff', glow: '#4df3ff' },
  ]);
}

/** Draw one frame for the given screen. `multiplier` is the combo multiplier. */
export function render(ctx, state, screen, multiplier, best, isNewBest) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
  else if (screen === SCREEN_OVER) drawGameOver(ctx, state, best, isNewBest);
  else if (screen === SCREEN_PAUSE) drawPause(ctx, state);
  else {
    drawWorld(ctx, state);
    drawHud(ctx, state, multiplier);
  }
  ctx.restore();
}
