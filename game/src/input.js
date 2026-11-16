// Keyboard + mouse input, translated into the arena's logical coordinates.
// The game reads this once per fixed step; keys pressed between steps are kept
// as edge events until the game consumes them (start, restart, pause, mute).
import { ARENA } from './config.js';

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: ARENA.width / 2, y: ARENA.height / 2 - 120, down: false, clicked: false };
    this._onKeyDown = (event) => {
      if (event.code in MOVE_KEYS || event.code === 'Space') event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    };
    this._onKeyUp = (event) => this.keys.delete(event.code);
    this._onMouseMove = (event) => this._trackMouse(event);
    this._onMouseDown = (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
        this._trackMouse(event);
      }
    };
    this._onMouseUp = (event) => {
      if (event.button === 0) this.mouse.down = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouse.down = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  _trackMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / ARENA.width, rect.height / ARENA.height);
    const offsetX = (rect.width - ARENA.width * scale) / 2;
    const offsetY = (rect.height - ARENA.height * scale) / 2;
    this.mouse.x = (event.clientX - rect.left - offsetX) / scale;
    this.mouse.y = (event.clientY - rect.top - offsetY) / scale;
  }

  /** Normalised WASD / arrow movement vector for this step. */
  moveVector() {
    let x = 0;
    let y = 0;
    for (const code of this.keys) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get firing() {
    return this.mouse.down || this.keys.has('Space');
  }

  /** True once when the key was pressed since the last call; consumes it. */
  consumePressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeClick() {
    if (this.mouse.clicked) {
      this.mouse.clicked = false;
      return true;
    }
    return false;
  }

  /** Clear edge events at the end of a frame so a press is never read twice. */
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
