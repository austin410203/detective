# AI Detective — Case 001: The 3:17 Incident

A playable Web 3D noir detective game built with **Three.js + TypeScript + Vite**, deployable to **Vercel**.

Walk the Hotel Meridian, investigate evidence, question three suspects, use Detective Vision,
consult an AI partner that is *sometimes wrong*, connect the clues on the Case Board and make your accusation.

> DO NOT BLINDLY TRUST AI.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Deploy to Vercel

**Option A — Git import (recommended)**
1. Push this folder to a GitHub repository.
2. In Vercel: *Add New → Project → Import* the repo.
3. Framework preset **Vite** is detected (build `npm run build`, output `dist`). Click **Deploy**.

**Option B — CLI**
```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

All assets use relative, Vite-compatible paths; nothing depends on localhost or the local file system.

## Controls

| Desktop | Mobile | Action |
|---|---|---|
| WASD / Arrows (Shift = run) | Drag left half of screen | Move |
| E / Space | INVESTIGATE button | Investigate / Talk |
| Q | VISION button | Detective Vision (5 s, 15 s cooldown) |
| Z / C | ⟲ ⟳ | Rotate camera |
| B / I / T | 📌 / 🗂 / AI orb | Case Board / Evidence / AI Detective |
| 1–9, 0 | tap | Dialogue choices / leave |
| M, H, Esc | 🔊, ? | Mute, Help, Close |

## Architecture

```
src/
  main.ts                 boot + case registry (?case=case001)
  game/Game.ts            renderer, loop, orchestration · Input.ts (keyboard + joystick)
  player/                 Player controller · Humanoid placeholder rig · GLBCharacter (AnimationMixer)
  camera/CameraRig.ts     third-person/isometric hybrid, smooth follow/rotation, wall-occlusion fade
  world/                  HotelWorld (rooms, lights, fog, dust, footprints) · Collision (Box/circle) · props
  interaction/            proximity interactables, highlight, discovery glints
  evidence/               EvidenceManager
  npc/                    NPC (world) · DialogueManager + DeterministicProvider / LLMProvider
  investigation/          CaseState (authoritative state + localStorage save) · Scoring · DetectiveVision
  ai/DetectiveAI.ts       assistant with confidence scores + intentional hallucinations
  audio/AudioManager.ts   WebAudio placeholder SFX + ambience, mute/volume
  ui/                     HTML/CSS HUD, dialogue, AI panel, Case Board, deduction, result
  data/case001.ts         ALL story content: evidence, suspects, dialogue, contradictions, AI script, solution
api/dialogue.js           server-side LLM route stub (keys stay on the server)
```

### Adding a case
Create `src/data/case002.ts` exporting a `CaseDefinition`, register it in `CASES` in `main.ts`,
and open `/?case=case002`. The engine reads everything from the definition.

### Replacing the placeholder detective
Put a rigged model at `public/models/detective.glb`, then:
```ts
const rig = await GLBCharacter.load('models/detective.glb', { idle: 'Idle', walk: 'Walk', run: 'Run', investigate: 'Investigate', talk: 'Talk' });
game.player.setRig(rig);
```

### LLM integration (next phase)
`DialogueManager` takes any `DialogueProvider`. Swap in `LLMProvider` (calls `/api/dialogue`) — it times out
and falls back to deterministic lines, so gameplay never blocks. Set `LLM_API_KEY` in Vercel env vars and
implement `api/dialogue.js`.
