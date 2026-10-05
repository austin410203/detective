import * as THREE from 'three';

/**
 * Third-person / isometric hybrid. Smooth follow + smooth yaw rotation.
 * Walls between camera and player fade out so the detective is never hidden.
 */
export class CameraRig {
  camera: THREE.PerspectiveCamera;
  yaw = Math.PI * 0.18;
  private targetYaw = this.yaw;
  private pitch = 0.92;
  private dist = 12;
  private targetDist = 12;
  private focus = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private shake = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 120);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    // portrait phones need to see more
    const portrait = w < h;
    if (portrait !== this.portrait) {
      this.portrait = portrait;
      this.userDist = portrait ? 16 : 12;
      if (!this.zoomOverride) this.targetDist = this.userDist;
    }
    this.camera.updateProjectionMatrix();
  }

  rotate(delta: number) { this.targetYaw += delta; }
  /** user zoom level (mouse wheel / pinch); dialogue close-ups return to it */
  private userDist = 12;
  private portrait: boolean | null = null;
  private zoomOverride = false;
  zoomTo(d: number | null) {
    this.zoomOverride = d != null;
    this.targetDist = d ?? this.userDist;
  }
  zoomBy(factor: number) {
    this.userDist = Math.min(24, Math.max(5, this.userDist * factor));
    if (!this.zoomOverride) this.targetDist = this.userDist;
  }
  bump(amount = 0.15) { this.shake = amount; }

  snap(target: THREE.Vector3) {
    this.focus.copy(target);
    this.yaw = this.targetYaw;
    this.dist = this.targetDist;
    this.apply();
  }

  private apply() {
    const off = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    ).multiplyScalar(this.dist);
    this.camera.position.copy(this.focus).add(off);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    this.camera.lookAt(this.focus);
  }

  update(dt: number, target: THREE.Vector3, walls: THREE.Mesh[]) {
    const k = 1 - Math.exp(-dt * 5);
    this.focus.lerp(new THREE.Vector3(target.x, target.y + 1.0, target.z), k);
    this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-dt * 6));
    this.dist += (this.targetDist - this.dist) * (1 - Math.exp(-dt * 3));
    this.shake = Math.max(0, this.shake - dt * 0.6);
    this.apply();

    // occlusion fade: any wall between camera and player (2 sample rays)
    const hits = new Set<THREE.Object3D>();
    for (const h of [0.6, 1.6]) {
      const p = new THREE.Vector3(target.x, h, target.z);
      const dir = p.clone().sub(this.camera.position);
      const len = dir.length();
      this.ray.set(this.camera.position, dir.normalize());
      this.ray.far = len - 0.4;
      for (const i of this.ray.intersectObjects(walls, false)) hits.add(i.object);
    }
    for (const w of walls) {
      const m = w.material as THREE.MeshStandardMaterial;
      const goal = hits.has(w) ? 0.12 : 1;
      m.opacity += (goal - m.opacity) * (1 - Math.exp(-dt * 10));
      // only switch to the transparent pass while actually faded: overlapping transparent walls
      // re-sort every frame and flicker, so opaque walls stay opaque
      const tr = m.opacity < 0.97;
      if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; }
      if (!tr) m.opacity = goal === 1 && m.opacity > 0.97 ? 1 : m.opacity;
    }
  }

  /** Unit vectors on the ground plane for camera-relative movement */
  basis() {
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    return { fwd, right };
  }
}
