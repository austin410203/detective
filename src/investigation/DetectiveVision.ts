/** Detective Vision: 5s active, 15s cooldown. Exposes a 0..1 eased intensity. */
export class DetectiveVision {
  readonly duration = 5;
  readonly cooldown = 15;
  active = 0;    // seconds remaining
  cool = 0;      // seconds remaining
  intensity = 0; // eased 0..1

  get ready() { return this.active <= 0 && this.cool <= 0; }

  trigger(): boolean {
    if (!this.ready) return false;
    this.active = this.duration;
    return true;
  }

  update(dt: number) {
    if (this.active > 0) {
      this.active -= dt;
      if (this.active <= 0) { this.active = 0; this.cool = this.cooldown; }
    } else if (this.cool > 0) this.cool = Math.max(0, this.cool - dt);
    const target = this.active > 0 ? 1 : 0;
    this.intensity += (target - this.intensity) * (1 - Math.exp(-dt * 6));
    if (this.intensity < 0.002) this.intensity = 0;
  }

  /** 0..1 fill for the HUD meter */
  get meter() {
    if (this.active > 0) return this.active / this.duration;
    if (this.cool > 0) return 1 - this.cool / this.cooldown;
    return 1;
  }
}
