// Screenshot scenes behind ?shot=start|play|wave|end&seed=N.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a real
// game looks like and the same seed always gives the same frame.
//   start: a few seconds of attract play behind the title screen.
//   play:  ~24 s of competent play (wave 1, HUD, combo, pickups).
//   wave:  longer competent play, reaching wave 3 with a bigger score.
//   end:   reckless play (flies into the swarm, never dodges) until game over.
import { ARENA, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;

function nearestEnemy(state) {
  let best = null;
  let bestDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return { enemy: best, dist: bestDist };
}

function nearestBullet(state) {
  let best = null;
  let bestDist = Infinity;
  for (const b of state.enemyBullets) {
    const d = Math.hypot(b.x - state.player.x, b.y - state.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return { bullet: best, dist: bestDist };
}

/** Steer + aim for one step. `dodge` false means the reckless end-scene pilot. */
function autopilot(state, dodge, firing, still = false) {
  const p = state.player;
  if (still) {
    // A pilot that holds position and shoots: it scores a few kills, then
    // the swarm closes in and finishes it — a real game-over frame.
    const { enemy } = nearestEnemy(state);
    const aim = enemy ? { x: enemy.x, y: enemy.y } : { x: p.x, y: p.y - 100 };
    return { moveX: 0, moveY: 0, aimX: aim.x, aimY: aim.y, firing };
  }
  let mx = 0;
  let my = 0;
  const { enemy, dist } = nearestEnemy(state);
  const threat = nearestBullet(state);
  if (dodge && threat.bullet && threat.dist < 150) {
    // Flee the incoming shot.
    mx = (p.x - threat.bullet.x) / threat.dist;
    my = (p.y - threat.bullet.y) / threat.dist;
  } else if (dodge && enemy && dist < 120) {
    // Back away from a ship that is about to ram.
    mx = (p.x - enemy.x) / dist;
    my = (p.y - enemy.y) / dist;
  } else if (enemy) {
    // Close to a firing range of ~260, then hold it.
    const want = dist > 300 ? 1 : dist < 210 ? -1 : 0;
    mx = ((enemy.x - p.x) / dist) * want;
    my = ((enemy.y - p.y) / dist) * want;
    // Strafe sideways a little so the pilot never sits still.
    const strafe = Math.sin(state.time * 1.7) * 0.5;
    mx += (-(enemy.y - p.y) / dist) * strafe;
    my += ((enemy.x - p.x) / dist) * strafe;
  } else {
    // Nothing to shoot: drift back toward the centre.
    mx = (ARENA.width / 2 - p.x) / 400;
    my = (ARENA.height / 2 - p.y) / 400;
  }
  const len = Math.hypot(mx, my) || 1;
  const aim = enemy ? { x: enemy.x, y: enemy.y } : { x: p.x, y: p.y - 100 };
  return { moveX: mx / len, moveY: my / len, aimX: aim.x, aimY: aim.y, firing };
}

function run(world, seconds, dodge, firing, capSeconds, still = false) {
  const limit = Math.min(seconds, capSeconds);
  const steps = Math.floor(limit / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilot(world.state, dodge, firing, still);
    if (world.step(STEP, input) & EVENT_OVER) return true;
  }
  return world.state.over;
}

/**
 * Play until `ready(state)` is true (a busy frame, not a gap between waves),
 * but at least `minSeconds` and at most `maxSeconds`.
 */
function runUntil(world, ready, minSeconds, maxSeconds, dodge, firing) {
  run(world, minSeconds, dodge, firing, minSeconds);
  if (world.state.over) return true;
  const extra = Math.floor((maxSeconds - minSeconds) / STEP);
  for (let i = 0; i < extra; i += 1) {
    if (ready(world.state)) return false;
    const input = autopilot(world.state, dodge, firing);
    if (world.step(STEP, input) & EVENT_OVER) return true;
  }
  return world.state.over;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any unknown name behaves like start.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Busy mid-wave-1 frame: enemies on screen, HUD, combo building.
    runUntil(world, (s) => s.wave >= 1 && s.enemies.length >= 6, 12, 45, true, true);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, score: world.state.score };
  }
  if (name === 'wave') {
    // A genuinely later wave than the play shot: wave 4+, captured mid-action.
    runUntil(world, (s) => s.wave >= 4 && s.enemies.length >= 5, 45, 150, true, true);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, score: world.state.score };
  }
  if (name === 'end') {
    // Stationary pilot: it shoots and scores, but never moves, so the swarm
    // closes in and ends the run — a genuine game-over frame.
    run(world, 600, false, true, 600, true);
    return { screen: SCREEN_OVER, score: world.state.score };
  }
  // Title: attract mode — the pilot dodges but does not shoot, so the swarm
  // drifts behind the title screen and the player keeps all 3 ships.
  run(world, 5, true, false, 5);
  return { screen: SCREEN_TITLE, score: 0 };
}

export { SAMPLE };
