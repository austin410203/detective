import * as THREE from 'three';
import type { CollisionWorld } from '../world/Collision';
import { Humanoid, type AnimState, type CharacterRig } from './Humanoid';

export class Player {
  rig: CharacterRig;
  object = new THREE.Group();
  radius = 0.35;
  speed = 0;
  private heading = 0;
  private locked: AnimState | null = null;
  private lockTimer = 0;
  private stepAcc = 0;
  onStep?: (run: boolean) => void;

  constructor(start: [number, number, number]) {
    this.rig = new Humanoid({ coat: 0x5b4a36, accent: 0x1a1a1a, skin: 0xe0b896, hair: 0x2a2420, hat: true });
    this.object.add(this.rig.object);
    // soft blob shadow helps readability on dark floors
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01;
    this.object.add(blob);
    this.object.position.set(...start);
  }

  /** Swap the placeholder for a GLB rig later without touching gameplay code. */
  setRig(rig: CharacterRig) {
    this.object.remove(this.rig.object);
    this.rig = rig;
    this.object.add(rig.object);
  }

  get position() { return this.object.position; }

  face(target: THREE.Vector3) {
    this.heading = Math.atan2(target.x - this.position.x, target.z - this.position.z);
  }

  /** Play a one-shot pose (investigate / talk) */
  pose(s: AnimState, seconds: number) { this.locked = s; this.lockTimer = seconds; }
  hold(s: AnimState | null) { this.locked = s; this.lockTimer = s ? Infinity : 0; }

  update(dt: number, move: { x: number; y: number; run: boolean }, basis: { fwd: THREE.Vector3; right: THREE.Vector3 }, world: CollisionWorld) {
    if (this.lockTimer !== Infinity) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) this.locked = null;
    }
    const mag = Math.hypot(move.x, move.y);
    let targetSpeed = 0;
    if (mag > 0.08 && this.lockTimer !== Infinity) {
      if (this.locked === 'investigate') this.locked = null;
      const dir = basis.fwd.clone().multiplyScalar(move.y).add(basis.right.clone().multiplyScalar(move.x)).normalize();
      targetSpeed = (move.run ? 5.6 : 2.9) * Math.min(1, mag * 1.2);
      this.heading = Math.atan2(dir.x, dir.z);
      this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-dt * 10));
      const [nx, nz] = world.move(this.position.x, this.position.z, dir.x * this.speed * dt, dir.z * this.speed * dt, this.radius);
      this.position.x = nx; this.position.z = nz;
      this.stepAcc += this.speed * dt;
      const stride = move.run ? 1.15 : 0.8;
      if (this.stepAcc > stride) { this.stepAcc = 0; this.onStep?.(move.run); }
    } else {
      this.speed += (0 - this.speed) * (1 - Math.exp(-dt * 14));
    }
    // smooth turn
    const cur = this.rig.object.rotation.y;
    let d = this.heading - cur;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.rig.object.rotation.y = cur + d * (1 - Math.exp(-dt * 14));

    const state: AnimState = this.locked ?? (this.speed > 4 ? 'run' : this.speed > 0.4 ? 'walk' : 'idle');
    this.rig.setState(state);
    this.rig.update(dt, this.speed / 3);
  }
}
