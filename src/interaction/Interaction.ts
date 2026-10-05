import * as THREE from 'three';

export type InteractKind =
  | 'Evidence' | 'NPC' | 'Door' | 'Container' | 'Computer' | 'Phone' | 'Book' | 'EnvironmentalObject';

export interface Interactable {
  id: string;
  kind: InteractKind;
  label: string;
  position: THREE.Vector3;
  radius: number;
  object: THREE.Object3D;
  /** important objects glow in Detective Vision */
  important: () => boolean;
  /** evidence not yet found shows a glint */
  fresh: () => boolean;
  onInteract: () => void;
}

/** Proximity-based interaction + highlight (emissive) + discoverability glints. */
export class InteractionSystem {
  items: Interactable[] = [];
  focused: Interactable | null = null;
  private mats = new Map<Interactable, THREE.MeshStandardMaterial[]>();
  private glints = new Map<Interactable, THREE.Sprite>();
  private t = 0;
  private glintTex: THREE.Texture;

  constructor(private scene: THREE.Scene) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d')!;
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.25, 'rgba(255,200,110,0.6)'); g.addColorStop(1, 'rgba(255,180,80,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    c.strokeStyle = 'rgba(255,240,210,0.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(32, 4); c.lineTo(32, 60); c.moveTo(4, 32); c.lineTo(60, 32); c.stroke();
    this.glintTex = new THREE.CanvasTexture(cv);
  }

  add(item: Interactable, withGlint = false) {
    this.items.push(item);
    const mats: THREE.MeshStandardMaterial[] = [];
    item.object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const m = (mesh.material as THREE.MeshStandardMaterial).clone();
        m.userData.baseEmissive = m.emissive.clone();
        mesh.material = m;
        mats.push(m);
      }
    });
    this.mats.set(item, mats);
    if (withGlint) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glintTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.copy(item.position).add(new THREE.Vector3(0, 0.45, 0));
      s.scale.setScalar(0.5);
      this.scene.add(s);
      this.glints.set(item, s);
    }
  }

  update(dt: number, player: THREE.Vector3, facing: number, vision: number, enabled: boolean) {
    this.t += dt;
    // pick nearest in range, slightly preferring what the player faces
    let best: Interactable | null = null, bestScore = Infinity;
    if (enabled) {
      for (const it of this.items) {
        const dx = it.position.x - player.x, dz = it.position.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > it.radius) continue;
        const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - facing), Math.cos(Math.atan2(dx, dz) - facing)));
        const score = d + ang * 0.4;
        if (score < bestScore) { bestScore = score; best = it; }
      }
    }
    this.focused = best;

    for (const it of this.items) {
      const mats = this.mats.get(it)!;
      const pulse = 0.5 + Math.sin(this.t * 5) * 0.5;
      let glow = 0, col = 0xffb347;
      if (it === best) glow = it.kind === 'NPC' ? 0.08 + pulse * 0.06 : 0.3 + pulse * 0.2;
      if (vision > 0 && it.important()) { glow = Math.max(glow, vision * (0.4 + pulse * 0.25)); col = it.fresh() ? 0xffc04a : 0x4fd8ff; }
      for (const m of mats) {
        if (glow > 0.001) m.emissive.setHex(col).multiplyScalar(glow);
        else m.emissive.copy(m.userData.baseEmissive);
      }
      const g = this.glints.get(it);
      if (g) {
        const show = it.fresh();
        g.visible = show;
        if (show) {
          const sm = g.material as THREE.SpriteMaterial;
          sm.opacity = (0.3 + Math.sin(this.t * 3 + it.position.x) * 0.3) + vision * 0.3;
          g.scale.setScalar(0.35 + vision * 0.35 + Math.sin(this.t * 3) * 0.05);
          g.position.y = it.position.y + 0.45 + Math.sin(this.t * 2) * 0.05;
        }
      }
    }
  }
}
