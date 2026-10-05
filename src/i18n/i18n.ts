/** Minimal runtime i18n: EN / 繁體中文. UI strings live here; story text lives in data/case001.zh.ts. */
export type Lang = 'en' | 'zh';

const KEY = 'ai-detective:lang';
const listeners: (() => void)[] = [];

function detect(): Lang {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'zh') return q;
  try { const s = localStorage.getItem(KEY); if (s === 'en' || s === 'zh') return s; } catch { /* noop */ }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let lang: Lang = detect();
document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';

export const getLang = () => lang;
export function setLang(l: Lang) {
  if (l === lang) return;
  lang = l;
  document.documentElement.lang = l === 'zh' ? 'zh-Hant' : 'en';
  try { localStorage.setItem(KEY, l); } catch { /* noop */ }
  applyStatic();
  listeners.forEach((f) => f());
}
export const onLangChange = (f: () => void) => listeners.push(f);

const D = {
  en: {
    'title.kicker': 'A NOIR INVESTIGATION',
    'title.start': 'Begin Investigation',
    'title.load': 'Continue saved case',
    'title.loading': 'Loading scene…',
    'title.nowebgl': 'WebGL is not available in this browser.',
    'hud.objectiveDone': '',
    'hud.investigation': 'INVESTIGATION',
    'hud.evidence': 'Evidence (I)',
    'hud.board': 'Case Board (B)',
    'hud.sound': 'Sound (M)',
    'hud.help': 'Controls (H)',
    'hud.lang': 'Language (L)',
    'hud.volume': 'VOLUME',
    'hud.mute': 'Mute', 'hud.unmute': 'Unmute',
    'hint.investigate': 'Investigate', 'hint.vision': 'Detective Vision', 'hint.board': 'Board', 'hint.rotate': 'Rotate', 'hint.zoom': 'Zoom',
    'verb.investigate': 'INVESTIGATE', 'verb.talk': 'TALK', 'verb.use': 'USE',
    'touch.vision': 'VISION',
    'ai.button': 'AI DETECTIVE',
    'ai.warn': '⚠ DO NOT BLINDLY TRUST AI',
    'ai.summarize': 'Summarize evidence', 'ai.contradictions': 'Find contradictions', 'ai.suggest': 'Suggest next step', 'ai.relationships': 'Analyze suspects',
    'ai.intro': "Online. I can organize what you've found and propose leads. My analysis depends entirely on the data you give me — and some of that data may be lies.",
    'ai.queries': 'Queries', 'ai.reliance': 'heavy reliance lowers your score',
    'ai.label.summarize': 'SUMMARY', 'ai.label.contradictions': 'CONTRADICTIONS', 'ai.label.suggest': 'NEXT STEP', 'ai.label.relationships': 'SUSPECT ANALYSIS',
    'ai.confidence': 'CONFIDENCE',
    'ai.retracted': '⚠ CONTRADICTED BY EVIDENCE YOU FOUND LATER',
    'ai.count': '{n}/{t} evidence logged. {c} contradiction(s) confirmed on the Case Board.',
    'ai.nodata': 'Insufficient data. Investigate further.',
    'found.kicker': 'EVIDENCE FOUND', 'found.file': 'CASE FILE',
    'found.add': 'Add to case file', 'found.close': 'Close',
    'dlg.suspicion': 'SUSPICION', 'dlg.new': 'NEW EVIDENCE', 'dlg.leave': 'Leave',
    'toast.suspicion': 'Suspicion ↑ {name}',
    'toast.contradiction': '⚡ CONTRADICTION: {t}',
    'toast.allEvidence': 'All evidence collected. Open the Case Board [B] to deduce.',
    'toast.startDesktop': 'WASD to move · E to investigate · Q for Detective Vision · Scroll to zoom',
    'toast.startMobile': 'Drag left side to move · tap INVESTIGATE near clues · pinch to zoom',
    'toast.vision': 'DETECTIVE VISION',
    'toast.elevator': 'Elevator locked down by HPD until the scene is cleared.',
    'toast.pills': 'Sleeping pills — full bottle, seal unbroken. Placed, not taken.',
    'label.elevator': 'Elevator', 'label.pills': 'Pill bottle',
    'ev.title': 'Case File — Evidence', 'ev.notfound': 'Not yet found.', 'ev.linked': 'linked',
    'imp.low': 'LOW', 'imp.medium': 'MEDIUM', 'imp.high': 'HIGH',
    'board.title': 'Case Board', 'board.sub': 'Red string = connection · dashed = contradiction',
    'board.contra': 'CONTRADICTIONS', 'board.suspects': 'SUSPECTS', 'board.deduce': 'Make Final Deduction →',
    'board.victim': 'VICTIM', 'board.evidence': 'EVIDENCE', 'board.room': 'RM 317 · 03:17?',
    'board.empty': 'No contradictions confirmed yet. Collect evidence and question witnesses — contradictions appear here when facts collide.',
    'ded.title': 'Final Deduction', 'ded.desc': 'Name the killer, the motive and the method. You only get one accusation.',
    'ded.who': 'WHO?', 'ded.why': 'WHY?', 'ded.how': 'HOW?', 'ded.accuse': 'Accuse',
    'ded.warn': 'Case file incomplete: {n}/{t} evidence, {c}/{ct} contradictions.',
    'res.evidence': 'EVIDENCE', 'res.deduction': 'DEDUCTION', 'res.investigation': 'INVESTIGATION', 'res.ai': 'AI RELIANCE', 'res.rank': 'RANK',
    'res.replay': 'Replay Case', 'res.continue': 'Keep investigating',
    'res.who': 'WHO', 'res.why': 'WHY', 'res.how': 'HOW',
    'res.wrong': 'The real killer walks free tonight. Replay the case — and check which conclusions you took from the AI without verifying.',
    'outcome.Perfect Case': 'PERFECT CASE', 'outcome.Case Solved': 'CASE SOLVED', 'outcome.Wrong Suspect': 'WRONG SUSPECT', 'outcome.Insufficient Evidence': 'INSUFFICIENT EVIDENCE',
    'rank.MASTER DETECTIVE': 'MASTER DETECTIVE', 'rank.SENIOR INSPECTOR': 'SENIOR INSPECTOR', 'rank.DETECTIVE': 'DETECTIVE', 'rank.JUNIOR INVESTIGATOR': 'JUNIOR INVESTIGATOR', 'rank.ROOKIE': 'ROOKIE',
    'help.title': 'Controls',
    'help.move': 'Move (Shift = run)', 'help.interact': 'Investigate · Talk', 'help.vision': 'Detective Vision (5s, 15s cooldown)',
    'help.rotate': 'Rotate camera', 'help.zoom': 'Zoom in / out', 'help.evidence': 'Evidence file', 'help.board': 'Case Board',
    'help.ai': 'AI Detective', 'help.mute': 'Mute', 'help.lang': 'Switch language', 'help.close': 'Close panels',
    'help.wheel': 'Mouse wheel / + −',
    'help.mobile': 'Mobile: drag the left side to move (push far to run), pinch to zoom. Buttons on the right.',
    'opt.Emma': 'Emma', 'opt.Michael': 'Michael', 'opt.Sarah': 'Sarah', 'opt.Unknown': 'Unknown',
    'opt.Money': 'Money', 'opt.Revenge': 'Revenge', 'opt.Blackmail': 'Blackmail', 'opt.Accident': 'Accident',
    'opt.Poison': 'Poison', 'opt.Staged Suicide': 'Staged Suicide', 'opt.Direct Attack': 'Direct Attack',
  },
  zh: {
    'title.kicker': '黑色電影 · 推理調查',
    'title.start': '開始調查',
    'title.load': '繼續上次的案件',
    'title.loading': '場景載入中…',
    'title.nowebgl': '此瀏覽器不支援 WebGL。',
    'hud.objectiveDone': '',
    'hud.investigation': '調查進度',
    'hud.evidence': '證據 (I)',
    'hud.board': '案件板 (B)',
    'hud.sound': '音效 (M)',
    'hud.help': '操作說明 (H)',
    'hud.lang': '語言 (L)',
    'hud.volume': '音量',
    'hud.mute': '靜音', 'hud.unmute': '取消靜音',
    'hint.investigate': '調查', 'hint.vision': '偵探視覺', 'hint.board': '案件板', 'hint.rotate': '旋轉', 'hint.zoom': '縮放',
    'verb.investigate': '調查', 'verb.talk': '對話', 'verb.use': '使用',
    'touch.vision': '偵探視覺',
    'ai.button': 'AI 偵探',
    'ai.warn': '⚠ 不要盲目相信 AI',
    'ai.summarize': '整理證據', 'ai.contradictions': '找出矛盾', 'ai.suggest': '建議下一步', 'ai.relationships': '分析嫌疑人',
    'ai.intro': '已上線。我能整理你找到的線索並提出方向。但我的分析完全取決於你給我的資料——而其中有些資料可能是謊言。',
    'ai.queries': '查詢次數', 'ai.reliance': '過度依賴會降低評分',
    'ai.label.summarize': '證據摘要', 'ai.label.contradictions': '矛盾分析', 'ai.label.suggest': '下一步建議', 'ai.label.relationships': '嫌疑人分析',
    'ai.confidence': '信心度',
    'ai.retracted': '⚠ 已被你後來找到的證據推翻',
    'ai.count': '已登錄 {n}/{t} 項證據，案件板上已確認 {c} 個矛盾。',
    'ai.nodata': '資料不足，請繼續調查。',
    'found.kicker': '發現證據', 'found.file': '案件檔案',
    'found.add': '加入案件檔案', 'found.close': '關閉',
    'dlg.suspicion': '懷疑度', 'dlg.new': '新證據', 'dlg.leave': '離開',
    'toast.suspicion': '懷疑度 ↑ {name}',
    'toast.contradiction': '⚡ 發現矛盾：{t}',
    'toast.allEvidence': '所有證據已蒐集完畢。打開案件板 [B] 進行推理。',
    'toast.startDesktop': 'WASD 移動 · E 調查 · Q 偵探視覺 · 滾輪縮放',
    'toast.startMobile': '拖曳左半邊移動 · 靠近線索點「調查」· 雙指縮放',
    'toast.vision': '偵探視覺',
    'toast.elevator': '警方封鎖電梯，現場清查完畢前無法使用。',
    'toast.pills': '安眠藥——整瓶未動，封口完整。是被擺上去的，不是被吃掉的。',
    'label.elevator': '電梯', 'label.pills': '藥瓶',
    'ev.title': '案件檔案 — 證據', 'ev.notfound': '尚未發現。', 'ev.linked': '相關人物',
    'imp.low': '低', 'imp.medium': '中', 'imp.high': '高',
    'board.title': '案件板', 'board.sub': '紅線＝關聯 · 虛線＝矛盾',
    'board.contra': '矛盾', 'board.suspects': '嫌疑人', 'board.deduce': '進行最終推理 →',
    'board.victim': '死者', 'board.evidence': '證據', 'board.room': '317 號房 · 03:17?',
    'board.empty': '尚未確認任何矛盾。蒐集證據並詢問證人——當事實互相衝突時，矛盾會出現在這裡。',
    'ded.title': '最終推理', 'ded.desc': '指出兇手、動機與手法。你只有一次指認的機會。',
    'ded.who': '誰？', 'ded.why': '為什麼？', 'ded.how': '怎麼做？', 'ded.accuse': '指認',
    'ded.warn': '案件檔案不完整：證據 {n}/{t}，矛盾 {c}/{ct}。',
    'res.evidence': '證據', 'res.deduction': '推理', 'res.investigation': '調查', 'res.ai': 'AI 依賴度', 'res.rank': '評等',
    'res.replay': '重玩本案', 'res.continue': '繼續調查',
    'res.who': '兇手', 'res.why': '動機', 'res.how': '手法',
    'res.wrong': '真兇今晚逍遙法外。重玩一次——並檢查哪些結論是你未經查證就從 AI 那裡接受的。',
    'outcome.Perfect Case': '完美破案', 'outcome.Case Solved': '破案', 'outcome.Wrong Suspect': '指認錯誤', 'outcome.Insufficient Evidence': '證據不足',
    'rank.MASTER DETECTIVE': '神探', 'rank.SENIOR INSPECTOR': '資深督察', 'rank.DETECTIVE': '偵探', 'rank.JUNIOR INVESTIGATOR': '見習調查員', 'rank.ROOKIE': '菜鳥',
    'help.title': '操作說明',
    'help.move': '移動(Shift 奔跑)', 'help.interact': '調查 · 對話', 'help.vision': '偵探視覺(持續 5 秒，冷卻 15 秒)',
    'help.rotate': '旋轉鏡頭', 'help.zoom': '拉近 / 拉遠', 'help.evidence': '證據檔案', 'help.board': '案件板',
    'help.ai': 'AI 偵探', 'help.mute': '靜音', 'help.lang': '切換語言', 'help.close': '關閉面板',
    'help.wheel': '滑鼠滾輪 / + −',
    'help.mobile': '手機：拖曳左半邊移動(推到底奔跑)，雙指縮放。右側為操作按鈕。',
    'opt.Emma': '艾瑪', 'opt.Michael': '麥可', 'opt.Sarah': '莎拉', 'opt.Unknown': '不明',
    'opt.Money': '金錢', 'opt.Revenge': '報復', 'opt.Blackmail': '勒索', 'opt.Accident': '意外',
    'opt.Poison': '下毒', 'opt.Staged Suicide': '偽裝自殺', 'opt.Direct Attack': '直接攻擊',
  },
} as const;

export type Key = keyof typeof D.en;

export function t(k: Key | string, vars?: Record<string, string | number>): string {
  let s: string = (D[lang] as Record<string, string>)[k] ?? (D.en as Record<string, string>)[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.split(`{${a}}`).join(String(b));
  return s;
}

/** Fill every [data-i18n] / [data-i18n-title] element in the static HTML */
export function applyStatic() {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n!)));
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle!)));
  document.querySelectorAll<HTMLElement>('.lang-toggle').forEach((el) => (el.textContent = lang === 'zh' ? 'EN' : '中文'));
}
