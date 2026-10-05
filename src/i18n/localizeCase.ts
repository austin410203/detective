import type { CaseText } from '../data/case001.zh';
import type { CaseDefinition } from '../data/types';
import type { Lang } from './i18n';

const snapshots = new WeakMap<CaseDefinition, CaseText>();

/** Capture the English text of a case definition in CaseText shape. */
function extract(def: CaseDefinition): CaseText {
  return {
    title: def.title, tagline: def.tagline, intro: [...def.intro],
    victim: { ...def.victim },
    evidence: Object.fromEntries(def.evidence.map((e) => [e.id, { name: e.name, description: e.description, quote: e.quote, location: e.location }])),
    suspects: Object.fromEntries(def.suspects.map((s) => [s.id, {
      name: s.name, role: s.role, bio: s.bio,
      greetings: s.greetings.map((g) => g.text),
      topics: Object.fromEntries(s.topics.map((t) => [t.id, { label: t.label, lines: [...t.lines] }])),
    }])),
    contradictions: Object.fromEntries(def.contradictions.map((c) => [c.id, { title: c.title, detail: c.detail }])),
    objectives: def.objectives.map((o) => o.text),
    ai: {
      summarize: def.ai.summarize.map((i) => i.text), contradictions: def.ai.contradictions.map((i) => i.text),
      suggest: def.ai.suggest.map((i) => i.text), relationships: def.ai.relationships.map((i) => i.text),
    },
    explanation: [...def.solution.explanation],
  };
}

/**
 * Swap all player-facing story text in `def` to the given language, in place.
 * Ids, requirements and the solution keys are never touched, so a save keeps working across languages.
 */
export function localizeCase(def: CaseDefinition, lang: Lang, overlays: Partial<Record<Lang, CaseText>>) {
  if (!snapshots.has(def)) snapshots.set(def, extract(def));
  const en = snapshots.get(def)!;
  const tx = (lang !== 'en' && overlays[lang]) || en;
  const pick = <T>(a: T | undefined, b: T) => (a ?? b);

  def.title = pick(tx.title, en.title);
  def.tagline = pick(tx.tagline, en.tagline);
  def.intro = pick(tx.intro, en.intro);
  def.victim.name = pick(tx.victim?.name, en.victim.name);
  def.victim.bio = pick(tx.victim?.bio, en.victim.bio);
  for (const e of def.evidence) Object.assign(e, en.evidence[e.id], tx.evidence?.[e.id]);
  for (const s of def.suspects) {
    const a = en.suspects[s.id], b = tx.suspects?.[s.id];
    s.name = pick(b?.name, a.name); s.role = pick(b?.role, a.role); s.bio = pick(b?.bio, a.bio);
    s.greetings.forEach((g, i) => (g.text = pick(b?.greetings[i], a.greetings[i])));
    for (const t of s.topics) {
      t.label = pick(b?.topics[t.id]?.label, a.topics[t.id].label);
      t.lines = pick(b?.topics[t.id]?.lines, a.topics[t.id].lines);
    }
  }
  for (const c of def.contradictions) Object.assign(c, en.contradictions[c.id], tx.contradictions?.[c.id]);
  def.objectives.forEach((o, i) => (o.text = pick(tx.objectives?.[i], en.objectives[i])));
  for (const k of ['summarize', 'contradictions', 'suggest', 'relationships'] as const)
    def.ai[k].forEach((ins, i) => (ins.text = pick(tx.ai?.[k]?.[i], en.ai[k][i])));
  def.solution.explanation = pick(tx.explanation, en.explanation);
}
