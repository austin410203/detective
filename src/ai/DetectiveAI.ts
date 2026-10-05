import type { AIInsight, Requirement } from '../data/types';
import type { CaseState } from '../investigation/CaseState';

export type AIMode = 'summarize' | 'contradictions' | 'suggest' | 'relationships';

export interface AIAnswer {
  mode: AIMode;
  insights: { text: string; confidence: number; hallucination: boolean; retractWhen?: Requirement }[];
}

/**
 * Detective AI assistant. Deterministic MVP driven by case data.
 * It never names the solution directly, and some insights are intentionally
 * wrong (hallucination: true) until newer evidence supersedes them.
 */
export class DetectiveAI {
  constructor(private state: CaseState) {}

  private pick(list: AIInsight[]) {
    return list.filter((i) => this.state.meets(i.requires) && !(i.supersededBy && this.state.meets(i.supersededBy)));
  }

  query(mode: AIMode): AIAnswer {
    this.state.aiQueries++;
    this.state.emit();
    let picked: AIInsight[] = this.pick(this.state.def.ai[mode]);
    if (mode === 'suggest') picked = picked.slice(-1);
    if (mode === 'summarize' && this.state.discovered.size) {
      const n = this.state.discovered.size, total = this.state.def.evidence.length;
      picked = [{ text: `${n}/${total} evidence logged. ${this.state.contradictions.length} contradiction(s) confirmed on the Case Board.`, confidence: 99 }, ...picked];
    }
    if (!picked.length) picked = [{ text: 'Insufficient data. Investigate further.', confidence: 50 }];
    return {
      mode,
      insights: picked.map((p) => ({ text: p.text, confidence: p.confidence, hallucination: !!p.hallucination, retractWhen: p.hallucination ? p.supersededBy : undefined })),
    };
  }
}
