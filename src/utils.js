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
import { META_KEY, META_DEF } from './constants.js';

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
    { name: '대원물산',           type: 'cheap',    unitCost: r(12000, 8000),  qualityScore: r(55, 20), description: '대량 공급 전문, 빠른 납기' },
    { name: `${itemName} 표준공업`, type: 'standard', unitCost: r(30000, 15000), qualityScore: r(100, 30), description: '품질과 가격의 균형' },
    { name: '프리미엄코리아',     type: 'premium',  unitCost: r(70000, 30000), qualityScore: r(160, 25), description: '최고급 소재, 브랜드 차별화' },
  ];
}

// ── Animated number hook helper ───────────────────────────────────────────────
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
