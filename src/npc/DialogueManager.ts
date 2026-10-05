import type { DialogueTopic, SuspectDef } from '../data/types';
import type { CaseState } from '../investigation/CaseState';

export interface DialogueContext {
  npc: SuspectDef;
  topic: DialogueTopic;
  discoveredEvidence: string[];
  flags: string[];
  suspicion: number;
  previousTopics: string[];
}

export interface DialogueResponse {
  lines: string[];
  source: 'deterministic' | 'llm';
}

/** Pluggable response source. Swap in an LLM provider without touching game code. */
export interface DialogueProvider {
  respond(ctx: DialogueContext): Promise<DialogueResponse>;
}

export class DeterministicProvider implements DialogueProvider {
  async respond(ctx: DialogueContext): Promise<DialogueResponse> {
    return { lines: ctx.topic.lines, source: 'deterministic' };
  }
}

/**
 * Future: calls a Vercel serverless route (/api/dialogue) that holds the API key.
 * Always falls back to deterministic data so gameplay never blocks on AI.
 */
export class LLMProvider implements DialogueProvider {
  constructor(private endpoint = '/api/dialogue', private fallback = new DeterministicProvider()) {}
  async respond(ctx: DialogueContext): Promise<DialogueResponse> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(this.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({
          npc: { id: ctx.npc.id, name: ctx.npc.name, role: ctx.npc.role, persona: ctx.npc.persona },
          question: ctx.topic.label, canonical: ctx.topic.lines,
          evidence: ctx.discoveredEvidence, flags: ctx.flags,
          suspicion: ctx.suspicion, previous: ctx.previousTopics,
        }),
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { lines?: string[] };
      if (!Array.isArray(data.lines) || !data.lines.length) throw new Error('bad payload');
      return { lines: data.lines, source: 'llm' };
    } catch {
      return this.fallback.respond(ctx);
    }
  }
}

export class DialogueManager {
  constructor(private state: CaseState, public provider: DialogueProvider = new DeterministicProvider()) {}

  npc(id: string) { return this.state.def.suspects.find((s) => s.id === id)!; }

  greeting(npcId: string): string {
    const npc = this.npc(npcId);
    const ok = npc.greetings.filter((g) => this.state.meetsFor(npcId, g.requires));
    return (ok[ok.length - 1] ?? npc.greetings[0]).text;
  }

  /** Topics currently available, newest-unlocked first-class. */
  topics(npcId: string): { topic: DialogueTopic; asked: boolean; isNew: boolean }[] {
    const npc = this.npc(npcId);
    const asked = this.state.dialogueProgress[npcId];
    return npc.topics
      .filter((t) => this.state.meetsFor(npcId, t.requires))
      .map((t) => ({ topic: t, asked: asked.has(t.id), isNew: !!t.requires && !asked.has(t.id) }));
  }

  async ask(npcId: string, topicId: string): Promise<DialogueResponse> {
    const npc = this.npc(npcId);
    const topic = npc.topics.find((t) => t.id === topicId)!;
    const progress = this.state.dialogueProgress[npcId];
    const res = await this.provider.respond({
      npc, topic,
      discoveredEvidence: [...this.state.discovered],
      flags: [...this.state.flags],
      suspicion: this.state.suspicion[npcId],
      previousTopics: [...progress],
    });
    if (!progress.has(topicId)) {
      progress.add(topicId);
      topic.setFlags?.forEach((f) => this.state.flags.add(f));
      if (topic.suspicion) {
        this.state.suspicion[npcId] = Math.max(0, Math.min(100, this.state.suspicion[npcId] + topic.suspicion));
      }
      this.state.emit();
    }
    return res;
  }
}
