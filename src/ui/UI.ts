import type { AIMode, DetectiveAI } from '../ai/DetectiveAI';
import type { AudioManager } from '../audio/AudioManager';
import type { EvidenceDef, Requirement } from '../data/types';
import type { EvidenceManager } from '../evidence/EvidenceManager';
import type { CaseState } from '../investigation/CaseState';
import type { CaseResult } from '../investigation/Scoring';
import type { DialogueManager } from '../npc/DialogueManager';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

const BOARD_POS: Record<string, [number, number, number]> = {
  notebook: [14, 26, -3], phone: [34, 18, 2], clock: [66, 18, -2], guestbook: [86, 26, 3],
  cctv: [86, 72, -2], room_key: [14, 72, 2],
  victim: [50, 46, 0], michael: [32, 85, -1], sarah: [50, 85, 1], emma: [68, 85, -2],
};

export class UI {
  private typing?: number;
  private typingFull = '';
  private dialogueNpc: string | null = null;
  private dialogueBusy = false;
  private foundResolve?: () => void;
  private aiEntries: { el: HTMLElement; retractWhen?: Requirement }[] = [];
  private ded: Record<string, string> = {};
  private lastObjective = '';
  onDeduce?: (a: { who: string; why: string; how: string }) => void;
  onReplay?: () => void;
  onDialogueClose?: () => void;

  constructor(
    private state: CaseState,
    private evidence: EvidenceManager,
    private dialogue: DialogueManager,
    private ai: DetectiveAI,
    private audio: AudioManager,
  ) {
    state.onChange(() => this.refresh());
    this.wire();
  }

  // ------------------------------------------------------------ wiring
  private wire() {
    $('found-close').onclick = () => this.closeFound();
    $('dlg-close').onclick = () => this.closeDialogue();
    $('btn-ai').onclick = () => this.toggleAI();
    $('ai-close').onclick = () => this.toggleAI(false);
    $('btn-evidence').onclick = () => this.openModal('evidence-panel');
    $('btn-board').onclick = () => this.openModal('board');
    $('btn-help').onclick = () => this.openModal('help');
    $('btn-sound').onclick = () => $('sound-pop').classList.toggle('hidden');
    $('btn-mute').onclick = () => this.toggleMute();
    $<HTMLInputElement>('volume').oninput = (e) => this.audio.setVolume(Number((e.target as HTMLInputElement).value));
    $('btn-deduce').onclick = () => { this.closeModals(); this.openModal('deduction'); };
    $('btn-accuse').onclick = () => {
      if (!this.ded.who || !this.ded.why || !this.ded.how) return;
      this.closeModals();
      this.onDeduce?.({ who: this.ded.who, why: this.ded.why, how: this.ded.how });
    };
    $('btn-replay').onclick = () => this.onReplay?.();
    $('btn-continue').onclick = () => { $('result').classList.add('hidden'); };
    document.querySelectorAll<HTMLElement>('[data-close]').forEach((b) => (b.onclick = () => this.closeModals()));
    document.querySelectorAll<HTMLElement>('.modal').forEach((m) => m.addEventListener('pointerdown', (e) => { if (e.target === m) this.closeModals(); }));
    document.querySelectorAll<HTMLButtonElement>('.ai-modes button').forEach((b) => (b.onclick = () => this.queryAI(b.dataset.mode as AIMode)));
    document.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.audio.click()));
    $('dlg-text').onclick = () => this.skipTyping();

    // deduction chips
    const d = this.state.def.deduction;
    for (const q of ['who', 'why', 'how'] as const) {
      const box = document.querySelector<HTMLElement>(`.chips[data-q="${q}"]`)!;
      box.innerHTML = d[q].map((o) => `<button data-v="${esc(o)}">${esc(o)}</button>`).join('');
      box.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => {
        this.ded[q] = b.dataset.v!;
        box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        this.audio.click();
        $<HTMLButtonElement>('btn-accuse').disabled = !(this.ded.who && this.ded.why && this.ded.how);
      }));
    }
  }

  // ------------------------------------------------------------ HUD
  showHUD() { $('hud').classList.remove('hidden'); this.refresh(); }

  refresh() {
    const s = this.state;
    const obj = s.objective;
    const el = $('objective-text');
    if (obj !== this.lastObjective) {
      el.textContent = obj;
      if (this.lastObjective) { el.parentElement!.classList.remove('flash'); void el.offsetWidth; el.parentElement!.classList.add('flash'); }
      this.lastObjective = obj;
    }
    $('progress-pct').textContent = `${s.progress}%`;
    $('progress-bar').style.width = `${s.progress}%`;
    $('ev-count').textContent = `${s.discovered.size}/${s.def.evidence.length}`;
    $('ai-count').textContent = String(s.aiQueries);
    for (const e of this.aiEntries) if (e.retractWhen && s.meets(e.retractWhen)) e.el.classList.add('retracted');
    if (!$('evidence-panel').classList.contains('hidden')) this.renderEvidence();
    if (!$('board').classList.contains('hidden')) this.renderBoard();
    if (this.dialogueNpc && !this.dialogueBusy) this.renderOptions();
  }

  setPrompt(text: string | null, verb = 'INVESTIGATE') {
    const p = $('prompt');
    const act = $('t-act');
    if (!text) { p.classList.add('hidden'); act.classList.remove('ready'); act.textContent = 'INVESTIGATE'; return; }
    $('prompt-text').innerHTML = `${verb}<small>${esc(text)}</small>`;
    p.classList.remove('hidden');
    act.classList.add('ready');
    act.textContent = verb;
  }

  setVision(meter: number, active: boolean, intensity: number) {
    for (const id of ['vision-meter', 'vision-meter-m']) {
      const b = $(id); b.style.width = `${meter * 100}%`;
      b.style.background = active ? 'var(--cyan)' : meter >= 1 ? 'var(--gold)' : '#4a5160';
    }
    $('vision-fx').style.opacity = String(intensity);
  }

  toast(msg: string, warn = false, ms = 2600) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('warn', warn);
    t.classList.remove('hidden');
    clearTimeout((t as unknown as { _t: number })._t);
    (t as unknown as { _t: number })._t = window.setTimeout(() => t.classList.add('hidden'), ms);
  }

  ping(id: string) { const b = $(id); b.classList.remove('ping'); void b.offsetWidth; b.classList.add('ping'); }

  toggleMute() {
    const m = this.audio.toggleMute();
    $('sound-icon').textContent = m ? '🔇' : '🔊';
    $('btn-mute').textContent = m ? 'Unmute' : 'Mute';
  }

  /** true when gameplay input should pause */
  get blocking() {
    return !$('found').classList.contains('hidden') || !!this.dialogueNpc ||
      [...document.querySelectorAll('.modal')].some((m) => !m.classList.contains('hidden')) ||
      !$('result').classList.contains('hidden') || !$('title').classList.contains('hidden');
  }
  get foundOpen() { return !$('found').classList.contains('hidden'); }
  get dialogueOpen() { return !!this.dialogueNpc; }

  // ------------------------------------------------------------ evidence found
  showFound(e: EvidenceDef, isNew: boolean): Promise<void> {
    $('found-no').textContent = `#${String(this.evidence.index(e.id)).padStart(2, '0')} · ${e.location.toUpperCase()}`;
    $('found-name').textContent = e.name.toUpperCase();
    $('found-quote').textContent = e.quote;
    $('found-desc').textContent = e.description;
    document.querySelector('.found-kicker')!.textContent = isNew ? 'EVIDENCE FOUND' : 'CASE FILE';
    $('found-close').innerHTML = isNew ? 'Add to case file <kbd>E</kbd>' : 'Close <kbd>E</kbd>';
    $('found').classList.remove('hidden');
    return new Promise((r) => (this.foundResolve = r));
  }
  closeFound() {
    $('found').classList.add('hidden');
    this.foundResolve?.();
    this.foundResolve = undefined;
  }

  // ------------------------------------------------------------ dialogue
  openDialogue(npcId: string) {
    const npc = this.dialogue.npc(npcId);
    this.dialogueNpc = npcId;
    $('dlg-name').textContent = npc.name;
    $('dlg-role').textContent = npc.role.toUpperCase();
    const p = $('dlg-portrait');
    p.textContent = npc.name[0];
    p.style.background = `linear-gradient(135deg, ${hex(npc.palette.accent)}, ${hex(npc.palette.coat)})`;
    p.style.color = '#fff';
    $('dialogue').classList.remove('hidden');
    $('ai-panel').classList.add('hidden');
    this.type(this.dialogue.greeting(npcId));
    this.renderOptions();
  }

  closeDialogue() {
    if (!this.dialogueNpc) return;
    this.dialogueNpc = null;
    this.skipTyping();
    $('dialogue').classList.add('hidden');
    this.onDialogueClose?.();
  }

  private renderOptions() {
    const id = this.dialogueNpc!;
    $('dlg-sus').style.width = `${this.state.suspicion[id]}%`;
    const opts = this.dialogue.topics(id);
    // unasked first, evidence-unlocked first among them
    opts.sort((a, b) => Number(a.asked) - Number(b.asked) || Number(b.isNew) - Number(a.isNew));
    const box = $('dlg-options');
    box.innerHTML = opts.map((o, i) => `
      <button data-t="${o.topic.id}" class="${o.asked ? 'asked' : ''}">
        <span class="num">${i + 1}</span>
        <span>${esc(o.topic.label)}</span>
        ${o.isNew ? '<span class="tag ev">NEW EVIDENCE</span>' : ''}
      </button>`).join('') + `<button data-t="__bye"><span class="num">0</span><span>Leave</span></button>`;
    box.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => this.choose(b.dataset.t!)));
  }

  dialogueKey(n: number) {
    if (!this.dialogueNpc || this.dialogueBusy) return;
    const btns = [...$('dlg-options').querySelectorAll<HTMLButtonElement>('button')];
    if (n === 0) return this.closeDialogue();
    btns[n - 1]?.click();
  }

  private async choose(topicId: string) {
    if (topicId === '__bye') return this.closeDialogue();
    if (this.dialogueBusy) return;
    this.dialogueBusy = true;
    const npc = this.dialogueNpc!;
    const before = this.state.suspicion[npc];
    const flagsBefore = this.state.flags.size;
    const res = await this.dialogue.ask(npc, topicId);
    this.dialogueBusy = false;
    if (this.dialogueNpc !== npc) return;
    const html = res.lines.map((l) => (l.startsWith('(') ? `<span class="stage">${esc(l)}</span>` : esc(l))).join(' ');
    this.type(html, true);
    this.renderOptions();
    const after = this.state.suspicion[npc];
    if (after > before) this.toast(`Suspicion ↑ ${this.dialogue.npc(npc).name.split(' ')[0]}`);
    else if (this.state.flags.size > flagsBefore && this.state.contradictions.length) this.ping('btn-board');
  }

  private type(text: string, html = false) {
    const el = $('dlg-text');
    this.skipTyping();
    const plain = html ? text : esc(text);
    this.typingFull = plain;
    // type out text nodes only (keep tags intact)
    const tmp = document.createElement('div'); tmp.innerHTML = plain;
    const total = tmp.textContent!.length;
    let i = 0;
    el.innerHTML = '';
    this.typing = window.setInterval(() => {
      i += 2;
      if (i >= total) { this.skipTyping(); return; }
      el.innerHTML = this.truncateHTML(plain, i);
      if (i % 6 === 0) this.audio.dialogue();
    }, 16);
  }
  private truncateHTML(html: string, n: number) {
    let out = '', count = 0, inTag = false;
    for (const ch of html) {
      if (ch === '<') inTag = true;
      if (inTag) { out += ch; if (ch === '>') inTag = false; continue; }
      if (count >= n) break;
      out += ch; if (ch !== '&') count++;
    }
    return out + '<span class="typing"></span>';
  }
  skipTyping() {
    if (this.typing) { clearInterval(this.typing); this.typing = undefined; $('dlg-text').innerHTML = this.typingFull; }
  }

  // ------------------------------------------------------------ AI panel
  toggleAI(force?: boolean) {
    const p = $('ai-panel');
    const show = force ?? p.classList.contains('hidden');
    p.classList.toggle('hidden', !show);
  }

  private queryAI(mode: AIMode) {
    const ans = this.ai.query(mode);
    const labels: Record<AIMode, string> = { summarize: 'SUMMARY', contradictions: 'CONTRADICTIONS', suggest: 'NEXT STEP', relationships: 'SUSPECT ANALYSIS' };
    const log = $('ai-log');
    const el = document.createElement('div');
    el.className = 'ai-msg';
    el.innerHTML = `<span class="q">▸ ${labels[mode]}</span><p class="typing"></p>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    // short "thinking" delay sells the assistant
    setTimeout(() => {
      el.innerHTML = `<span class="q">▸ ${labels[mode]}</span>` + ans.insights.map((i) => `
        <div class="ins"><p>${esc(i.text)}</p>
        <div class="conf">CONFIDENCE ${i.confidence}% <i><b style="width:${i.confidence}%"></b></i></div></div>`).join('') +
        `<div class="flag">⚠ CONTRADICTED BY EVIDENCE YOU FOUND LATER</div>`;
      log.scrollTop = log.scrollHeight;
      const retract = ans.insights.find((i) => i.retractWhen)?.retractWhen;
      this.aiEntries.push({ el, retractWhen: retract });
      this.audio.dialogue();
    }, 650);
  }

  // ------------------------------------------------------------ modals
  openModal(id: string) {
    this.closeModals();
    if (this.dialogueNpc) this.closeDialogue();
    $(id).classList.remove('hidden');
    if (id === 'evidence-panel') this.renderEvidence();
    if (id === 'board') requestAnimationFrame(() => this.renderBoard());
    if (id === 'deduction') {
      const n = this.state.discovered.size, t = this.state.def.evidence.length;
      $('ded-warn').textContent = n < t ? `Case file incomplete: ${n}/${t} evidence, ${this.state.contradictions.length}/${this.state.def.contradictions.length} contradictions.` : '';
    }
  }
  closeModals() { document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden')); $('sound-pop').classList.add('hidden'); }
  toggleModal(id: string) { if ($(id).classList.contains('hidden')) this.openModal(id); else this.closeModals(); }

  private renderEvidence() {
    $('ev-grid').innerHTML = this.evidence.list().map((e, i) => {
      const def = this.evidence.get(e.id)!;
      return e.discovered ? `
        <div class="ev-card found">
          <div class="no"><span>#${String(i + 1).padStart(2, '0')}</span><span class="imp ${e.importance}">${e.importance.toUpperCase()}</span></div>
          <h4>${esc(e.name)}</h4>
          <p>${esc(e.description)}</p>
          <div class="loc">📍 ${esc(e.location)}${e.relatedCharacters.length ? ' · linked: ' + e.relatedCharacters.map((c) => this.dialogue.npc(c).name.split(' ')[0]).join(', ') : ''}</div>
        </div>` : `
        <div class="ev-card locked">
          <div class="no"><span>#${String(i + 1).padStart(2, '0')}</span><span class="imp">???</span></div>
          <h4>${esc(def.name)}</h4>
          <p>Not yet found.</p>
        </div>`;
    }).join('');
  }

  private renderBoard() {
    const cork = $('cork');
    const s = this.state;
    cork.querySelectorAll('.pin').forEach((p) => p.remove());
    const pin = (id: string, cls: string, html: string) => {
      const [x, y, r] = BOARD_POS[id] ?? [50, 50, 0];
      const el = document.createElement('div');
      el.className = `pin ${cls}`;
      el.style.left = `${x}%`; el.style.top = `${y}%`;
      el.style.setProperty('--r', `${r}deg`);
      el.innerHTML = html;
      cork.appendChild(el);
    };
    pin('victim', 'victim', `<small>VICTIM</small><b>${esc(s.def.victim.name)}</b><small>RM 317 · 03:17?</small>`);
    for (const e of s.def.evidence) {
      const f = s.discovered.has(e.id);
      pin(e.id, f ? '' : 'locked', f ? `<small>#${String(this.evidence.index(e.id)).padStart(2, '0')} EVIDENCE</small><b>${esc(e.name)}</b>${esc(e.quote)}` : `<small>#${String(this.evidence.index(e.id)).padStart(2, '0')}</small><b>? ? ?</b>`);
    }
    for (const sp of s.def.suspects)
      pin(sp.id, 'person', `<small>${esc(sp.role.toUpperCase())}</small><b>${esc(sp.name)}</b><div class="sus"><i style="width:${s.suspicion[sp.id]}%"></i></div>`);

    // strings
    const W = cork.clientWidth, H = cork.clientHeight;
    const pt = (id: string) => { const p = BOARD_POS[id]; return [(p[0] / 100) * W, (p[1] / 100) * H]; };
    const lines: string[] = [];
    const line = (a: string, b: string, color: string, dash = '', w = 2) => {
      const [x1, y1] = pt(a), [x2, y2] = pt(b);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 18;
      lines.push(`<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" stroke="${color}" stroke-width="${w}" fill="none" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity=".9"/>`);
    };
    for (const sp of s.def.suspects) line('victim', sp.id, 'rgba(230,230,230,.25)', '', 1);
    const seen = new Set<string>();
    for (const e of s.def.evidence) {
      if (!s.discovered.has(e.id)) continue;
      line('victim', e.id, 'rgba(200,40,40,.35)', '', 1);
      for (const c of e.relatedCharacters) line(e.id, c, '#b3241f');
      for (const r of e.relatedEvidence) {
        const k = [e.id, r].sort().join('|');
        if (s.discovered.has(r) && !seen.has(k)) { seen.add(k); line(e.id, r, '#b3241f'); }
      }
    }
    for (const c of s.contradictions) if (c.between.length === 2) line(c.between[0], c.between[1], '#ffcf5a', '7 6', 3);
    $('cork-svg').innerHTML = `<defs><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="1.2" flood-opacity=".6"/></filter></defs><g filter="url(#sh)">${lines.join('')}</g>`;

    const cs = s.contradictions;
    $('contra-list').innerHTML = cs.length
      ? cs.map((c) => `<li><b>${esc(c.title)}</b>${esc(c.detail)}</li>`).join('')
      : '<li class="empty">No contradictions confirmed yet. Collect evidence and question witnesses — contradictions appear here when facts collide.</li>';
    $('sus-list').innerHTML = s.def.suspects.map((sp) => `
      <li><span>${esc(sp.name)}<small>${esc(sp.role)}</small></span><i class="meter red"><b style="width:${s.suspicion[sp.id]}%"></b></i><span class="mono">${s.suspicion[sp.id]}</span></li>`).join('');
  }

  // ------------------------------------------------------------ result
  showResult(r: CaseResult, answer: { who: string; why: string; how: string }) {
    const h = $('res-outcome');
    h.textContent = r.outcome.toUpperCase();
    h.className = r.outcome === 'Wrong Suspect' || r.outcome === 'Insufficient Evidence' ? 'bad' : 'good';
    $('res-total').textContent = String(r.total);
    $('res-ev').textContent = String(r.evidence);
    $('res-ded').textContent = String(r.deduction);
    $('res-inv').textContent = String(r.investigation);
    $('res-ai').textContent = String(r.aiReliance);
    $('res-rank').textContent = r.rank;
    const mark = (ok: boolean, v: string) => `<span class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${esc(v)}</span>`;
    $('res-answer').innerHTML = `WHO ${mark(r.correct.who, answer.who)} · WHY ${mark(r.correct.why, answer.why)} · HOW ${mark(r.correct.how, answer.how)}`;
    $('res-truth').innerHTML = r.correct.who
      ? this.state.def.solution.explanation.map((p) => `<p>${esc(p)}</p>`).join('')
      : `<p>The real killer walks free tonight. Replay the case — and check which conclusions you took from the AI without verifying.</p>`;
    $('result').classList.remove('hidden');
  }
}
