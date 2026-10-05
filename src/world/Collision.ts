/** Simplified 2D (XZ) collision: box colliders for the environment, circles for actors. */
export interface AABB { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Circle { x: number; z: number; r: number }

export class CollisionWorld {
  boxes: AABB[] = [];
  circles: Circle[] = [];
  bounds: AABB = { minX: -12, maxX: 12, minZ: -14, maxZ: 14 };

  addBox(cx: number, cz: number, w: number, d: number, pad = 0) {
    this.boxes.push({ minX: cx - w / 2 - pad, maxX: cx + w / 2 + pad, minZ: cz - d / 2 - pad, maxZ: cz + d / 2 + pad });
  }

  private hit(x: number, z: number, r: number, ignore?: Circle) {
    if (x - r < this.bounds.minX || x + r > this.bounds.maxX || z - r < this.bounds.minZ || z + r > this.bounds.maxZ) return true;
    for (const b of this.boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    for (const c of this.circles) {
      if (c === ignore) continue;
      const dx = x - c.x, dz = z - c.z, rr = r + c.r;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }

  /** Move with axis-separated sliding. Returns resolved position. */
  move(x: number, z: number, dx: number, dz: number, r: number): [number, number] {
    // sub-step to avoid tunnelling at high speed
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (r * 0.5)) || 1;
    const sx = dx / steps, sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      if (!this.hit(x + sx, z, r)) x += sx;
      if (!this.hit(x, z + sz, r)) z += sz;
    }
    return [x, z];
  }
}
