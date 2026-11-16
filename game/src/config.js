// Neon Orbit Defender — tuning and palette in one place.
// Every number the game balances on lives here so the other files stay readable.
export const ARENA = { width: 1280, height: 800 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 370,
  accel: 2600,
  drag: 4.5,
  fireInterval: 0.15,
  rapidFireInterval: 0.07,
  maxLives: 3,
  invulnerableSeconds: 2.0,
  bulletSpeed: 780,
};

export const ENEMY = {
  drifter: { radius: 17, hp: 1, speed: 95, score: 50, color: '#ff5d8f' },
  darter: { radius: 13, hp: 1, speed: 265, score: 80, color: '#ffb02e' },
  weaver: { radius: 16, hp: 2, speed: 150, score: 120, color: '#b678ff' },
  splitter: { radius: 26, hp: 3, speed: 70, score: 150, color: '#4dd7ff' },
  shooter: { radius: 18, hp: 2, speed: 110, score: 160, color: '#7dff6a' },
};

export const PICKUP = {
  shardScore: 25,
  shieldAmount: 40,
  rapidSeconds: 8,
};

export const COLORS = {
  background: '#070a1a',
  nebulaA: '#131b4d',
  nebulaB: '#3d1157',
  grid: 'rgba(90, 120, 255, 0.10)',
  player: '#4df3ff',
  playerCore: '#eafcff',
  bullet: '#ffe45e',
  enemyBullet: '#ff4d6d',
  shard: '#ffd94d',
  shield: '#59c2ff',
  rapid: '#ff9df5',
  text: '#eaf6ff',
  dim: '#8fa3c8',
  danger: '#ff4d6d',
};

export const COMBO_WINDOW = 3.0;
export const MAX_MULTIPLIER = 5;
