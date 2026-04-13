// ── Formatters ───────────────────────────────────────────────────────────────
export const fmt  = n => Math.abs(n).toLocaleString('ko-KR');
export const fmtW = n => (n < 0 ? '-' : '') + fmt(n) + '원';
export const sign = n => (n >= 0 ? '+' : '') + fmtW(n);
export const pct  = n => (n * 100).toFixed(1) + '%';

// ── Credit grade ─────────────────────────────────────────────────────────────
export function calcCreditGrade(nw) {
  if (nw >= 500_000_000) return 'A';
  if (nw >= 100_000_000) return 'B';
  if (nw >=  50_000_000) return 'C';
  return 'D';
}

export function netWorth(s) {
  return s.capital + (s.propertyValue || 0) - s.debt;
}

// ── Meta persistence ─────────────────────────────────────────────────────────
import { DEFAULT_MAX_TURNS, META_KEY, META_DEF } from './constants.js';

export function loadMeta() {
  try { return { ...META_DEF, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') }; }
  catch { return { ...META_DEF }; }
}

export function saveMeta(m) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch (e) {
    if (e instanceof DOMException) {
      try {
        Object.keys(localStorage).filter(k => k !== META_KEY).forEach(k => localStorage.removeItem(k));
        localStorage.setItem(META_KEY, JSON.stringify(m));
      } catch { /* ignore */ }
    }
  }
}

// ── Guess item category from name ────────────────────────────────────────────
export function guessCategoryFromName(name) {
  const luxury    = ['명품','가죽','다이아','황금','수제','수공','고급','비건','오가닉','유기농'];
  const essential = ['식품','쌀','빵','물','소금','기저귀','칫솔','비누','세제','마스크','의약'];
  const n = name.toLowerCase();
  if (luxury.some(k => n.includes(k)))    return 'luxury';
  if (essential.some(k => n.includes(k))) return 'essential';
  return 'normal';
}

export function generateFallbackVendors(itemName) {
  const seed = [...itemName].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (base, range) => base + (seed % range);
  return [
    { name: '대원물산',           type: '실속형', unitCost: r(12000, 8000),  qualityScore: r(55, 20), description: '대량 공급 전문, 빠른 납기' },
    { name: `${itemName} 상사`,    type: '균형형', unitCost: r(30000, 15000), qualityScore: r(100, 30), description: '품질과 가격의 균형' },
    { name: '노바 프라이빗',      type: '고품질형', unitCost: r(70000, 30000), qualityScore: r(160, 25), description: '브랜드 차별화에 유리' },
    { name: '직거래 연합',        type: '변동형', unitCost: r(18000, 22000), qualityScore: r(80, 60), description: '가격 변동 큼, 타이밍 중요' },
  ];
}

// ── Search input guard ───────────────────────────────────────────────────────
export function validateItemInput(raw) {
  const text = (raw || '').trim();
  if (!text) return { ok: false, reason: '아이템명을 입력하세요.' };
  if (text.length < 2) return { ok: false, reason: '아이템명은 2자 이상 입력해주세요.' };
  if (text.length > 24) return { ok: false, reason: '아이템명은 24자 이하로 입력해주세요.' };

  const lower = text.toLowerCase();
  const banned = [
    '씨발', '시발', '병신', '좆', '개새끼', '새끼', 'fuck', 'fck', 'shit', 'bitch', 'asshole',
  ];
  if (banned.some(w => lower.includes(w))) {
    return { ok: false, reason: '부적절한 단어는 사용할 수 없습니다.' };
  }

  const hasLetterOrDigit = /[가-힣a-zA-Z0-9]/.test(text);
  if (!hasLetterOrDigit) {
    return { ok: false, reason: '의미 있는 상품명을 입력해주세요.' };
  }

  const compact = lower.replace(/\s+/g, '');
  if (/^(.)\1{3,}$/.test(compact)) {
    return { ok: false, reason: '의미 없는 반복 문자는 사용할 수 없습니다.' };
  }

  if (compact.length >= 6) {
    const uniq = new Set(compact).size;
    if (uniq <= 2) return { ok: false, reason: '의미 없는 문자열로 판단되어 검색이 차단되었습니다.' };
  }

  return { ok: true, normalized: text };
}

// ── Animated number hook helper ───────────────────────────────────────────────
export function getRunCycle(turn = 1, maxTurns = DEFAULT_MAX_TURNS, infiniteMode = false) {
  if (!infiniteMode) return 1;
  const safeTurn = Math.max(1, Math.floor(turn || 1));
  const safeMaxTurns = Math.max(1, Math.floor(maxTurns || DEFAULT_MAX_TURNS));
  return Math.floor((safeTurn - 1) / safeMaxTurns) + 1;
}

export function getCycleTurn(turn = 1, maxTurns = DEFAULT_MAX_TURNS, infiniteMode = false) {
  if (!infiniteMode) return Math.max(1, Math.floor(turn || 1));
  const safeTurn = Math.max(1, Math.floor(turn || 1));
  const safeMaxTurns = Math.max(1, Math.floor(maxTurns || DEFAULT_MAX_TURNS));
  return ((safeTurn - 1) % safeMaxTurns) + 1;
}

export function isCycleTransitionTurn(turn = 1, maxTurns = DEFAULT_MAX_TURNS) {
  const safeTurn = Math.max(1, Math.floor(turn || 1));
  const safeMaxTurns = Math.max(1, Math.floor(maxTurns || DEFAULT_MAX_TURNS));
  return safeTurn > 1 && ((safeTurn - 1) % safeMaxTurns === 0);
}

export function animateValue(start, end, duration, callback) {
  const startTime = Date.now();
  function tick() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    callback(Math.round(start + (end - start) * ease));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
