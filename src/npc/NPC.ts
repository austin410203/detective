import * as THREE from 'three';
import type { SuspectDef } from '../data/types';
import { Humanoid } from '../player/Humanoid';
import type { Circle } from '../world/Collision';

/** World-side NPC: visual, idle behaviour, look-at, suspicion ring for Detective Vision. */
export class NPC {
  object = new THREE.Group();
  rig: Humanoid;
  collider: Circle;
  ring: THREE.Mesh;
  talking = false;
  private baseYaw: number;
  private t = Math.random() * 10;
  private label: THREE.Sprite;

  constructor(public def: SuspectDef) {
    this.rig = new Humanoid({ ...def.palette, skirt: def.id !== 'michael', height: def.id === 'michael' ? 1.04 : 0.97 });
    this.object.add(this.rig.object);
    this.object.position.set(...def.position);
    this.baseYaw = def.facing;
    this.rig.object.rotation.y = def.facing;
    this.collider = { x: def.position[0], z: def.position[2], r: 0.45 };

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.03;
    this.object.add(this.ring);

    // floating name tag
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const c = cv.getContext('2d')!;
    c.font = '600 26px "IBM Plex Sans", sans-serif'; c.textAlign = 'center';
    c.fillStyle = 'rgba(8,10,16,0.65)'; c.beginPath(); c.roundRect(28, 8, 200, 44, 10); c.fill();
    c.fillStyle = '#e8dcc0'; c.fillText(def.name.split(' ')[0].toUpperCase(), 128, 40);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    this.label.scale.set(1.2, 0.3, 1); this.label.position.y = 2.35;
    this.object.add(this.label);
  }

  get position() { return this.object.position; }

  update(dt: number, player: THREE.Vector3, vision: number, suspicion: number) {
    this.t += dt;
    const d = this.position.distanceTo(player);
    // look at player when nearby; otherwise idle glance around
    let yaw = this.baseYaw + Math.sin(this.t * 0.3) * 0.35;
    if (d < 4.5 || this.talking) yaw = Math.atan2(player.x - this.position.x, player.z - this.position.z);
    const cur = this.rig.object.rotation.y;
    const delta = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur));
    this.rig.object.rotation.y = cur + delta * (1 - Math.exp(-dt * 4));
    this.rig.setState(this.talking ? 'talk' : 'idle');
    this.rig.update(dt, 0);

    (this.label.material as THREE.SpriteMaterial).opacity += ((d < 6 ? 1 : 0) - (this.label.material as THREE.SpriteMaterial).opacity) * Math.min(1, dt * 6);

    // Detective Vision: ring colored by suspicion (cool → hot)
    const m = this.ring.material as THREE.MeshBasicMaterial;
    m.color.setHSL(0.55 - (suspicion / 100) * 0.55, 0.9, 0.55);
    m.opacity = vision * (0.6 + Math.sin(this.t * 4) * 0.2);
    const s = 1 + Math.sin(this.t * 3) * 0.06 * vision;
    this.ring.scale.set(s, s, s);
  }
}
