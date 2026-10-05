import './ui/styles.css';
import { case001 } from './data/case001';
import { Game } from './game/Game';
import { CaseState } from './investigation/CaseState';
import { case001zh } from './data/case001.zh';
import { applyStatic, getLang, onLangChange, t } from './i18n/i18n';
import { localizeCase } from './i18n/localizeCase';

// Case registry — add case002 / case003 here without touching the engine.
const CASES = { case001 };
const TEXT = { case001: { zh: case001zh } };
const params = new URLSearchParams(location.search);
const def = CASES[(params.get('case') ?? 'case001') as keyof typeof CASES] ?? case001;

const $ = (id: string) => document.getElementById(id)!;

// Localize story text now and on every language switch (registered before the UI's own listener)
const overlays = TEXT[def.id as keyof typeof TEXT] ?? {};
localizeCase(def, getLang(), overlays);
onLangChange(() => { localizeCase(def, getLang(), overlays); renderIntro(); });
applyStatic();

function renderIntro() {
  $('intro').innerHTML = def.intro.map((l, i) => `<p style="animation-delay:${0.3 + i * 0.9}s">${l}</p>`).join('');
}

function intro() {
  renderIntro();
  if (new CaseState(def).hasSave()) $('btn-load').classList.remove('hidden');
}

function boot() {
  intro();
  let game: Game;
  try {
    game = new Game($('scene') as HTMLCanvasElement, def);
  } catch (err) {
    console.error(err);
    $('loading').textContent = t('title.nowebgl');
    return;
  }
  $('loading').classList.add('hidden');
  (window as unknown as { __game: Game }).__game = game;

  const start = (load: boolean) => {
    const fade = $('fade');
    fade.classList.add('on');
    setTimeout(() => {
      $('title').classList.add('hidden');
      game.begin(load);
      fade.classList.remove('on');
    }, 700);
  };
  $('btn-start').onclick = () => start(false);
  $('btn-load').onclick = () => start(true);
}

boot();
