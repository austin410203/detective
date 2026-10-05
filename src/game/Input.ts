/** Unified keyboard + virtual-joystick input. */
export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  joy = { x: 0, y: 0, active: false };
  rotate = 0; // -1..1 camera yaw input from buttons
  isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  enabled = true;

  constructor() {
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
  }

  down(...k: string[]) { return k.some((x) => this.keys.has(x)); }
  /** consumed edge-trigger */
  hit(...k: string[]) {
    let r = false;
    for (const x of k) if (this.pressed.has(x)) { this.pressed.delete(x); r = true; }
    return r;
  }
  press(k: string) { this.pressed.add(k); }
  endFrame() { this.pressed.clear(); }

  /** Movement vector in camera space: x = right, y = forward. mag 0..1, run flag. */
  move(): { x: number; y: number; run: boolean } {
    if (!this.enabled) return { x: 0, y: 0, run: false };
    let x = 0, y = 0;
    if (this.down('w', 'arrowup')) y += 1;
    if (this.down('s', 'arrowdown')) y -= 1;
    if (this.down('a', 'arrowleft')) x -= 1;
    if (this.down('d', 'arrowright')) x += 1;
    let run = this.down('shift');
    if (this.joy.active) {
      x = this.joy.x; y = this.joy.y;
      run = Math.hypot(x, y) > 0.85;
    }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, run };
  }

  /** Virtual joystick bound to a DOM zone */
  bindJoystick(zone: HTMLElement, base: HTMLElement, knob: HTMLElement) {
    let id: number | null = null, cx = 0, cy = 0;
    const R = 52;
    const set = (px: number, py: number) => {
      let dx = px - cx, dy = py - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / R; this.joy.y = -dy / R;
    };
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      id = e.pointerId; zone.setPointerCapture(id);
      const r = zone.getBoundingClientRect();
      cx = e.clientX; cy = e.clientY;
      base.style.left = `${cx - r.left}px`; base.style.top = `${cy - r.top}px`;
      base.classList.add('on');
      this.joy.active = true; set(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientX, e.clientY); });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null; this.joy = { x: 0, y: 0, active: false };
      knob.style.transform = ''; base.classList.remove('on');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }
}
