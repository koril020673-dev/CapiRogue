// ════════════════════════════════════════════════════════
//  캐피로그 v1.0 — 전체 게임 엔진 & 시스템
// ════════════════════════════════════════════════════════
//
//  이 파일은 모든 Step(1~5) 게임 로직을 통합하고 있습니다
//  - Step 1: 상태 관리 & UI 뼈대
//  - Step 2: Gemini API & 시장 계산
//  - Step 3: 금융/부동산/M&A 모달 시스템  
//  - Step 4: 랜덤 이벤트 & 뉴스 속보
//  - Step 5: 타임라인, 파이 차트, 결재 서류
//
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  전역 상수 (매직 넘버 제거 — P1)
// ════════════════════════════════════════════════════════
const CONSTANTS = {
  // HR
  HR_TRAIN_COST:       500_000,
  HR_SALES_GAIN:       0.02,
  HR_PROD_RISK_REDUCTION: 0.05,
  HR_MAX_TRAININGS:    10,
  HR_RESIST_MAX:       0.50,
  MARKETING_MIN_BUDGET:100_000,
  MARKETING_AWARENESS_MAX: 0.30,

  // 공장
  FACTORY_BUILD_COST:  500_000_000,
  FACTORY_UPGRADE_COST:100_000_000,
  FACTORY_PRODUCT_COST: 50_000_000,
  FACTORY_DISCOUNT:    0.60,
  FACTORY_BUILD_TURNS: 3,
  FACTORY_SAFETY_COST: 5_000_000,
  FACTORY_ACCIDENT_RISK_INC: 0.05,
  FACTORY_ACCIDENT_PENALTY:  100_000_000,
  FACTORY_ACCIDENT_SHUTDOWN: 2,

  // 시장
  BASE_DEMAND:         1000,

  // 재무
  MONTHLY_FIXED_COST:  500_000,
  REALTY_MONTHLY_RENT: 1_000_000,

  // 담합
  CARTEL_REVENUE_MUL:  1.5,
  CARTEL_BUST_PROB:    0.15,
  CARTEL_FINE:         50_000_000,

  // 파산
  BANKRUPTCY_INSOLVENCY_NW: -50_000_000,
  BANKRUPTCY_CONSEC_MONTHS: 4,

  // 블랙스완
  BLACK_SWAN_START_TURN: 80,
  BLACK_SWAN_TURNS:     10,

  // 메타
  META_CAPITAL_BONUS_PER_BANKRUPT: 0.005,
  META_CAPITAL_BONUS_MAX: 0.15,
  META_BOOM_BONUS_PER_CLEAR: 0.02,
  META_BOOM_BONUS_MAX: 0.20,

  // 이벤트
  EVENT_TRIGGER_PROB:  0.15,
};

// ── 유틸 함수들 ──────────────────────────────────────
const fmt  = n => Math.abs(n).toLocaleString('ko-KR');
const fmtW = n => (n < 0 ? '-' : '') + fmt(n) + '원';
const sign = n => (n >= 0 ? '+' : '') + fmtW(n);
const pct  = n => (n * 100).toFixed(1) + '%';

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function addLog(msg, type = 'info') {
  const list = document.getElementById('log-list');
  if (!list) return;
  const item = document.createElement('div');
  item.className = `log-item log-${type}`;
  item.textContent = `T${gameState.turn}  ${msg}`;
  list.prepend(item);
  while (list.children.length > 30) list.lastChild.remove();
}

// ── 게임상태 초기화 ──────────────────────────────────
const gameState = {
  capital: 100_000_000,
  debt: 0,
  interestRate: 0.048,
  propertyValue: 10_000_000,
  brandValue: 0,
  priceResistance: 0,
  turn: 1,
  maxTurns: 120,
  difficulty: 'easy',
  gameStatus: 'playing',
  sellPrice: 0,
  monthlyFixedCost: 500_000,
  marketShare: 0,
  itemCategory: 'normal',
  wholesaleOptions: [],
  selectedVendor: null,
  currentVendorTab: 'cheap',
  rivals: [],
  factory: { built: false, buildTurnsLeft: 0, safetyOn: true, accidentRisk: 0, upgradeLevel: 0, shutdownLeft: 0 },
  salesTraining: { count: 0, max: 10, usedThisTurn: false },
  prodTraining: { count: 0, max: 10, usedThisTurn: false },
  mktThisTurn: false,
  marketing: { totalSpent: 0, awarenessBonus: 0 },
  hr: { trainingThisTurn: 0, totalTrainings: 0, lastTrainTurn: 0 },
  realty: 'monthly',
  mna: { count: 0, opCostMultiplier: 1.0 },
  cartel: { active: false, bustedCount: 0 },
  economy: { phase: 'stable' },
  profitHistory: [],
  cumulativeProfit: 0,
  lastTurnResult: null,
  storyShown: {},
  activeEffects: [],
};

// ── 난이도 설정 ──────────────────────────────────────
const DIFF_CONFIG = {
  easy:   { capital: 100_000_000, debt: 0,          interestRate: 0.048, rivalCount: 1 },
  normal: { capital:  50_000_000, debt: 0,          interestRate: 0.060, rivalCount: 1 },
  hard:   { capital:  30_000_000, debt: 0,          interestRate: 0.060, rivalCount: 2 },
  insane: { capital:  10_000_000, debt: 50_000_000, interestRate: 0.144, rivalCount: 4 },
};
const DIFF_LABEL = { easy:'이지', normal:'노멀', hard:'하드', insane:'인세인' };

function applyDifficulty(diff) {
  const cfg = DIFF_CONFIG[diff];
  gameState.difficulty = diff;
  gameState.capital = cfg.capital;
  gameState.debt = cfg.debt;
  gameState.interestRate = cfg.interestRate;
  gameState.salesTraining = { count: 0, max: 10, usedThisTurn: false };
  gameState.prodTraining = { count: 0, max: 10, usedThisTurn: false };
  gameState.mktThisTurn = false;
  gameState.marketing = { totalSpent: 0, awarenessBonus: 0 };
  gameState.hr = { trainingThisTurn: 0, totalTrainings: 0, lastTrainTurn: 0 };
  gameState.activeEffects = [];
  gameState.rivals = Array.from({ length: cfg.rivalCount }, (_, i) => ({
    name: ['라이벌 A', '라이벌 B', '라이벌 C', '라이벌 D'][i],
    capital: 20_000_000,
    brandValue: Math.floor(Math.random() * 20),
    priceResistance: 0.02,
    marketShare: 0,
    pattern: ['aggressive','premium','copycat'][i % 3],
    sellPrice: 0,
    qualityScore: 80 + Math.floor(Math.random() * 60),
    bankrupt: false,
  }));
}

// ════════════════════════════════════════════════════════
//  DOM 캐시 (P2 성능 최적화 — 자주 쓰는 요소 1회만 조회)
// ════════════════════════════════════════════════════════
const DOM = {};
function _dom(id) {
  if (!DOM[id]) DOM[id] = document.getElementById(id);
  return DOM[id];
}

// ════════════════════════════════════════════════════════
//  updateUI 서브 함수들 (P1 함수 분리)
// ════════════════════════════════════════════════════════

/** 좌측 패널: 재무·신용등급·턴 진행도 */
function _updateUIFinance() {
  const s  = gameState;
  const nw = s.capital + s.propertyValue - s.debt;

  setText('lp-capital',  fmtW(s.capital), s.capital >= 0 ? 'var(--green)' : 'var(--red)');
  setText('lp-debt',     fmtW(s.debt),    'var(--red)');
  setText('lp-networth', fmtW(nw),        nw >= 0 ? 'var(--green)' : 'var(--red)');
  setText('lp-mna',      s.mna.count + '회');
  setText('lp-realty',   { monthly:'월세', jeonse:'전세', owned:'소유' }[s.realty] || '월세');

  const grade = calcCreditGrade(nw);
  const gradeEl = _dom('lp-grade');
  if (gradeEl) { gradeEl.textContent = grade; gradeEl.className = 'grade-letter g' + grade; }
  const GRADE_DETAIL = {
    A: '연 4.8% · 한도 순자산×200%',
    B: '연 6.0% · 한도 순자산×100%',
    C: '연 8.4% · 한도 순자산×50%',
    D: '연 14.4% · 한도 1천만',
  };
  setText('lp-grade-detail', GRADE_DETAIL[grade]);

  setText('turn-badge',    s.turn + '개월 차');
  setText('lp-turn-text',  `진행: ${s.turn} / ${s.maxTurns}개월`);
  setText('lp-diff-label', DIFF_LABEL[s.difficulty] || '');
  const fillEl = _dom('turn-fill');
  if (fillEl) fillEl.style.width = (s.turn / s.maxTurns * 100) + '%';
}

/** 좌측 패널: 브랜드·마케팅·저항성 */
function _updateUIBrand() {
  const s = gameState;
  setText('lp-brand',  s.brandValue + ' pt');
  setText('lp-resist', pct(s.priceResistance));
  setText('lp-share',  pct(s.marketShare), 'var(--blue)');

  const awarenessEl = _dom('lp-awareness');
  if (awarenessEl) {
    const ab = s.marketing?.awarenessBonus || 0;
    awarenessEl.textContent = ab > 0 ? `+${(ab*100).toFixed(1)}% 인지도` : '–';
    awarenessEl.style.color = ab > 0 ? 'var(--purple)' : 'var(--dim)';
  }
}

/** 중앙 패널: 다음달 버튼·담합·블랙스완 뱃지 */
function _updateUIActions() {
  const s  = gameState;
  const nb = _dom('next-btn');
  if (nb) {
    const ready = !!s.selectedVendor && s.sellPrice > 0;
    nb.disabled  = !ready;
    nb.textContent = ready
      ? `▶ 다음 달로 (${s.turn}개월 차)`
      : `▶ 다음 달로 (${!s.selectedVendor ? '도매업체 미선택' : '가격 설정 필요'})`;
  }

  const d    = s.difficulty || '';
  const cBtn = _dom('cartel-btn');
  if (cBtn) {
    cBtn.style.display = (d === 'hard' || d === 'insane') ? 'block' : 'none';
    cBtn.classList.toggle('active', !!s.cartel?.active);
    cBtn.textContent   = s.cartel?.active
      ? '🤝 담합 활성 (클릭하여 해제)'
      : '🤝 담합 활성화 (×1.5 수익 / 적발 15%)';
  }

  const ecoBadge = _dom('eco-badge');
  if (ecoBadge) {
    ecoBadge.textContent = (typeof _bsActive !== 'undefined' && _bsActive)
      ? '⚠️ ' + _bsActive.title.slice(0, 6) + '… ' + _bsTurnsLeft + '턴'
      : 'T' + s.turn + ' / 120';
  }
}

// ── 메인 UI 동기화 함수 (서브 함수 조합) ──────────────
function updateUI() {
  // P0: 난이도 선택 전 / 게임 미시작 상태 가드
  if (!gameState.difficulty) return;

  _updateUIFinance();
  _updateUIBrand();
  _updateUIActions();

  updateContractBox();
  renderProfitChart();
  updateEcoBanner();
  updateBEP();
  updateHRButtons();
  updateFactoryStatus();
  updateBottomPanel();

  if (typeof renderPieChart   === 'function') renderPieChart();
  if (typeof updateHQVisual   === 'function') updateHQVisual();
  if (typeof updateTimeline   === 'function') updateTimeline();
  if (typeof updateDocSection === 'function') updateDocSection();
  if (typeof renderStatusBoard=== 'function') renderStatusBoard();
}

function setText(id, text, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (color) el.style.color = color;
}

function calcCreditGrade(netWorth) {
  if (netWorth >= 500_000_000) return 'A';
  if (netWorth >= 100_000_000) return 'B';
  if (netWorth >=  50_000_000) return 'C';
  return 'D';
}

// ── 경제 배너 & 계산 ──────────────────────────────────
const ECO_META = {
  boom:      { cls:'eco-boom', badgeCls:'badge-boom', icon:'🚀', name:'호황기', desc:'소비 심리 개선 · 수요 증가' },
  stable:    { cls:'eco-stable', badgeCls:'badge-stable', icon:'➡️', name:'평시', desc:'시장이 안정적으로 운영 중' },
  recession: { cls:'eco-recession', badgeCls:'badge-recession', icon:'📉', name:'불황기', desc:'경기 침체 · 수요 위축' },
};

function updateEcoBanner() {
  const m = ECO_META[gameState.economy.phase] || ECO_META.stable;
  const banner = document.getElementById('eco-banner');
  if (banner) banner.className = 'eco-banner ' + m.cls;
  setText('eco-icon', m.icon);
  setText('eco-name', m.name);
  setText('eco-desc', m.desc);
}

const ECO_WEIGHTS = {
  essential: { boom: 0.9, stable: 1.0, recession: 1.3 },
  normal:    { boom: 1.2, stable: 1.0, recession: 0.8 },
  luxury:    { boom: 1.8, stable: 1.0, recession: 0.4 },
};

function getEcoWeight() {
  return ECO_WEIGHTS[gameState.itemCategory]?.[gameState.economy.phase] ?? 1.0;
}

function updateBEP() {
  const sp = gameState.sellPrice;
  const uc = gameState.selectedVendor?.unitCost || 0;
  const factoryDiscount = gameState.factory.built && gameState.factory.buildTurnsLeft <= 0 ? 0.6 : 1.0;
  const netCost = Math.round(uc * factoryDiscount);
  const margin  = sp - netCost;
  const monthlyInt = Math.round(gameState.debt * gameState.interestRate / 12);
  const realtyRent = gameState.realty === 'monthly' ? 1_000_000 : 0;
  const safetyCost = gameState.factory.built && gameState.factory.safetyOn ? 5_000_000 : 0;
  const totalFixed = Math.round((monthlyInt + gameState.monthlyFixedCost + realtyRent + safetyCost) * gameState.mna.opCostMultiplier);
  const bep = margin > 0 ? Math.ceil(totalFixed / margin) : Infinity;
  const rate = sp > 0 && netCost > 0 ? Math.round((1 - netCost / sp) * 100) : 0;
  
  setText('bep-fixed', fmtW(totalFixed));
  setText('bep-margin', margin > 0 ? sign(margin) : '–');
  setText('bep-qty', isFinite(bep) ? fmt(bep) + '개' : '∞');
  setText('bep-rate', gameState.selectedVendor ? rate + '%' : '–');
  setText('price-cost-hint', gameState.selectedVendor ? '도매가: ' + fmtW(netCost) : '도매가: 선택 전');
  
  const belowCostEl = document.getElementById('below-cost');
  if (belowCostEl) belowCostEl.style.display = (sp > 0 && sp < netCost && netCost > 0) ? 'block' : 'none';
}

function renderProfitChart() {
  const chart = document.getElementById('profit-chart');
  if (!chart) return;
  [...chart.children].forEach(el => { if (!el.classList.contains('chart-baseline')) el.remove(); });
  
  const history = gameState.profitHistory.slice(-12);
  if (history.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = '데이터 없음';
    empty.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:10px;';
    chart.appendChild(empty);
    return;
  }
  
  const maxAbs = Math.max(...history.map(v => Math.abs(v)), 1);
  const HALF = 28;
  
  history.forEach((val, i) => {
    const col = document.createElement('div');
    col.className = 'bar-col';
    col.dataset.tip = `T${gameState.turn - history.length + i}  ${sign(val)}`;
    
    const heightPx = Math.max(2, Math.round(Math.abs(val) / maxAbs * HALF));
    const bar = document.createElement('div');
    bar.className = val >= 0 ? 'bar-pos' : 'bar-neg';
    bar.style.height = heightPx + 'px';
    
    col.appendChild(bar);
    chart.appendChild(col);
  });
}

function updateContractBox() {
  const box = document.getElementById('contract-box');
  if (!box) return;
  const v = gameState.selectedVendor;
  if (!v) {
    box.innerHTML = '<div class="contract-none">아직 도매업체를 선택하지 않았습니다</div>';
    return;
  }
  const typeColor = { cheap: 'var(--green)', standard: 'var(--blue)', premium: 'var(--yellow)' };
  const typeLabel = { cheap: '저가형', standard: '표준형', premium: '고급형' };
  box.innerHTML = `
    <div class="contract-name">${v.name}</div>
    <div class="contract-sub">
      <span style="color:${typeColor[v.type]||'var(--dim)'}">${typeLabel[v.type]||''}</span>
      &nbsp;·&nbsp;단가 ${fmtW(v.unitCost)}&nbsp;·&nbsp;품질 ${v.qualityScore}pt
    </div>
    <div class="contract-sub" style="margin-top:2px;font-style:italic">"${v.description || ''}"</div>`;
}

function updateHRButtons() {
  const s  = gameState;
  const st = s.salesTraining;
  const pt = s.prodTraining;
  
  const salesBtn = document.getElementById('hr-sales');
  if (salesBtn) {
    const salesBlocked = st.usedThisTurn || st.count >= st.max || s.capital < CONSTANTS.HR_TRAIN_COST;
    salesBtn.disabled = salesBlocked;
    const salesEff = salesBtn.closest('.hr-btn')?.querySelector('.hr-eff');
    if (salesEff) salesEff.textContent = st.count >= st.max ? '최대 횟수 도달 (10/10)' : `저항성 +2% (${st.count}/${st.max}회)`;
  }
  
  const prodBtn = document.getElementById('hr-prod');
  if (prodBtn) {
    const prodBlocked = pt.usedThisTurn || pt.count >= pt.max || s.capital < CONSTANTS.HR_TRAIN_COST;
    prodBtn.disabled = prodBlocked;
    const prodEff = prodBtn.closest('.hr-btn')?.querySelector('.hr-eff');
    if (prodEff) prodEff.textContent = pt.count >= pt.max ? '최대 횟수 도달 (10/10)' : `산재위험 -5% (${pt.count}/${pt.max}회)`;
  }
  
  const pipS = document.getElementById('pip-sales');
  const pipP = document.getElementById('pip-prod');
  if (pipS) pipS.className = 'hr-pip' + (st.usedThisTurn ? ' hr-pip-on' : '');
  if (pipP) pipP.className = 'hr-pip' + (pt.usedThisTurn ? ' hr-pip-on' : '');
  
  const limText = document.getElementById('hr-limit-text');
  if (limText) {
    const allDone = st.usedThisTurn && pt.usedThisTurn;
    limText.textContent = allDone ? '이번 달 완료' : '교육 가능';
    limText.className = 'hr-lim' + (allDone ? ' hr-lim-over' : '');
  }
  
  const mktInput = document.getElementById('mkt-budget-input');
  const mktPreview = document.getElementById('mkt-preview');
  const mktBadge = document.getElementById('mkt-used-badge');
  const mktBtn = document.getElementById('hr-mkt');
  if (mktBadge) mktBadge.textContent = s.mktThisTurn ? '이번 달 완료' : '가능';
  if (mktBtn) mktBtn.disabled = s.mktThisTurn;
  if (mktInput) {
    mktInput.disabled = s.mktThisTurn;
    const budget = parseInt(mktInput.value) || 0;
    if (mktPreview && budget > 0 && !s.mktThisTurn) {
      const brandGain = calcMktBrandGain(budget);
      const awarenessGain = calcMktAwarenessGain(budget);
      mktPreview.textContent = `브랜드 +${brandGain.toFixed(1)}pt · 인지도 가중치 +${(awarenessGain*100).toFixed(2)}%`;
      mktPreview.style.color = 'var(--green)';
    } else if (mktPreview) {
      mktPreview.textContent = s.mktThisTurn ? '✓ 이번 달 마케팅 완료' : '예산 입력 시 효과 미리보기';
      mktPreview.style.color = s.mktThisTurn ? 'var(--blue)' : 'var(--dim)';
    }
  }
}

function updateFactoryStatus() {
  const f = gameState.factory;
  const statusEl = document.getElementById('factory-status');
  const upgradeBtn = document.getElementById('factory-upgrade');
  const productBtn = document.getElementById('factory-product');
  
  if (upgradeBtn) upgradeBtn.disabled = !f.built;
  if (productBtn) productBtn.disabled = !f.built;
  
  if (!statusEl) return;
  if (!f.built) {
    statusEl.textContent = '공장 미설립 — 원가 절감 없음';
    statusEl.style.color = 'var(--dim)';
  } else if (f.buildTurnsLeft > 0) {
    statusEl.textContent = `🔨 건설 중… ${f.buildTurnsLeft}턴 후 완공`;
    statusEl.style.color = 'var(--yellow)';
  } else {
    const riskPct = Math.round(f.accidentRisk * 100);
    statusEl.textContent = `✅ 운영 중 · Lv.${f.upgradeLevel} · 산재위험 ${riskPct}%`;
    statusEl.style.color = f.safetyOn ? 'var(--green)' : 'var(--yellow)';
  }
  
  const safetyBtn = document.getElementById('factory-safety-toggle');
  if (safetyBtn) {
    const active = f.built && f.buildTurnsLeft <= 0;
    safetyBtn.style.display = active ? 'block' : 'none';
    if (f.safetyOn) {
      safetyBtn.textContent = '🔒 안전관리비 ON (월 500만원) — 클릭하여 OFF';
      safetyBtn.style.borderColor = 'var(--green)';
      safetyBtn.style.color = 'var(--green)';
      safetyBtn.style.background = 'rgba(63,185,80,.1)';
    } else {
      safetyBtn.textContent = '⚠️ 안전관리비 OFF — 산재 위험 누적 중! 클릭하여 ON';
      safetyBtn.style.borderColor = 'var(--yellow)';
      safetyBtn.style.color = 'var(--yellow)';
      safetyBtn.style.background = 'rgba(210,153,34,.1)';
    }
  }
}

function updateBottomPanel() {
  renderVendorTab();
  renderRivalsPanel();
}

function renderVendorTab() {
  const types = ['cheap', 'standard', 'premium'];
  types.forEach(t => {
    const tab = document.getElementById('tab-' + t);
    if (!tab) return;
    tab.className = 'vendor-tab';
    if (gameState.currentVendorTab === t) {
      tab.className += ' active-' + t;
    }
  });
  
  const area = document.getElementById('vendor-card-area');
  if (!area) return;
  const vendors = gameState.wholesaleOptions;
  if (!vendors || vendors.length === 0) {
    area.innerHTML = '<div style="color:var(--dim);font-size:11px;">아이템을 검색하면 도매업체 정보가 채워집니다</div>';
    return;
  }
  
  const idx = { cheap: 0, standard: 1, premium: 2 }[gameState.currentVendorTab] ?? 0;
  const v = vendors[idx];
  if (!v) return;
  
  const isSelected = gameState.selectedVendor?.name === v.name;
  const factoryCost = gameState.factory.built && gameState.factory.buildTurnsLeft <= 0 ? Math.round(v.unitCost * 0.6) : v.unitCost;
  
  area.innerHTML = `
    <div class="vc-name">${v.name}</div>
    <div class="vc-row"><span class="vc-lbl">도매 단가</span><span class="vc-val">${fmtW(v.unitCost)}</span></div>
    <div class="vc-row"><span class="vc-lbl">실입고가 (공장 적용)</span><span class="vc-val" style="color:var(--green)">${fmtW(factoryCost)}</span></div>
    <div class="vc-row"><span class="vc-lbl">품질 점수</span><span class="vc-val">${v.qualityScore + (gameState.factory.upgradeLevel || 0) * 20}pt</span></div>
    <div class="vc-row"><span class="vc-lbl">설명</span><span class="vc-val" style="color:var(--dim);font-size:10px">${v.description || '–'}</span></div>
    <button class="vc-select-btn ${isSelected ? 'selected' : ''}" data-vendor-idx="${idx}">
      ${isSelected ? '✓ 현재 계약 중' : '이 업체와 계약하기'}
    </button>`;
  
  area.querySelector('[data-vendor-idx]')?.addEventListener('click', e => {
    const i = parseInt(e.currentTarget.dataset.vendorIdx);
    gameState.selectedVendor = vendors[i];
    const newMax = Math.round(vendors[i].unitCost * 8);
    const slider = document.getElementById('price-slider');
    const input = document.getElementById('price-input');
    if (slider) slider.max = newMax;
    if (input) input.max = newMax;
    addLog(`[계약] ${vendors[i].name} — ${vendors[i].type} · 단가 ${fmtW(vendors[i].unitCost)}`, 'contract');
    toast(`${vendors[i].name} 계약 완료!`, 'good');
    updateUI();
  });
}

function renderRivalsPanel() {
  const panel = document.getElementById('rivals-panel');
  if (!panel) return;
  if (!gameState.rivals.length) {
    panel.innerHTML = '<div style="color:var(--dim);font-size:11px;">라이벌 없음</div>';
    return;
  }
  panel.innerHTML = gameState.rivals.map(r => `
    <div class="rival-row ${r.bankrupt ? 'v-dim' : ''}">
      <span class="rival-name">${r.name}${r.bankrupt ? ' 💀' : ''}</span>
      <span class="rival-price">${r.sellPrice > 0 ? fmtW(r.sellPrice) : '–'}</span>
      <span class="rival-share">${pct(r.marketShare)}</span>
    </div>`).join('');
}

// ── 도매업체 탭 클릭 — 이벤트 위임 (P2) ──────────────
document.querySelector('.vendor-tabs')?.addEventListener('click', e => {
  const tab = e.target.closest('.vendor-tab');
  if (!tab) return;
  gameState.currentVendorTab = tab.dataset.type;
  renderVendorTab();
});

// ── 가격 슬라이더 ↔ 입력창 동기화 ─────────────────────
const priceSlider = document.getElementById('price-slider');
const priceInput = document.getElementById('price-input');

function syncPrice(val) {
  const v = Math.max(0, parseInt(val) || 0);
  if (priceSlider) priceSlider.value = v;
  if (priceInput) priceInput.value = v;
  gameState.sellPrice = v;
  updateBEP();
  
  const nb = document.getElementById('next-btn');
  if (nb) {
    const ready = !!gameState.selectedVendor && v > 0;
    nb.disabled = !ready;
    nb.textContent = ready ? `▶ 다음 달로 (${gameState.turn}개월 차)` : `▶ 다음 달로 (${!gameState.selectedVendor ? '도매업체 미선택' : '가격 설정 필요'})`;
  }
}

priceSlider?.addEventListener('input', e => syncPrice(e.target.value));
priceInput?.addEventListener('input', e => syncPrice(e.target.value));

// ════════════════════════════════════════════════════════
//  HR 시스템 (3-트랙 분리)
// ════════════════════════════════════════════════════════

function doSalesTrain() {
  const st = gameState.salesTraining;
  if (st.usedThisTurn)                              { toast('이번 달 영업 교육 완료 (1턴 1회 제한)', 'warn'); return; }
  if (st.count >= st.max)                           { toast('영업 교육 최대 횟수 도달 (10회)', 'warn'); return; }
  if (gameState.capital < CONSTANTS.HR_TRAIN_COST)  { toast('자금 부족 (50만원 필요)', 'warn'); return; }
  
  gameState.capital -= CONSTANTS.HR_TRAIN_COST;
  st.count++;
  st.usedThisTurn = true;
  gameState.hr.lastTrainTurn = gameState.turn;
  gameState.hr.totalTrainings++;
  
  const brandP = Math.min(0.10, gameState.brandValue / 1000);
  const hrGain = CONSTANTS.HR_SALES_GAIN;
  gameState.priceResistance = Math.min(CONSTANTS.HR_RESIST_MAX, gameState.priceResistance + hrGain + brandP);
  
  addLog(`💼 영업/CS 교육 완료 (${st.count}/${st.max}회) — 저항성 +${((hrGain+brandP)*100).toFixed(1)}%`, 'good');
  toast(`영업 교육 완료 (${st.count}/${st.max}회)`, 'good');
  updateUI();
}

function doProdTrain() {
  const pt = gameState.prodTraining;
  if (pt.usedThisTurn) { toast('이번 달 생산 교육 완료 (1턴 1회 제한)', 'warn'); return; }
  if (pt.count >= pt.max) { toast('생산 교육 최대 횟수 도달 (10회)', 'warn'); return; }
  if (gameState.capital < CONSTANTS.HR_TRAIN_COST) { toast('자금 부족 (50만원 필요)', 'warn'); return; }
  
  gameState.capital -= CONSTANTS.HR_TRAIN_COST;
  pt.count++;
  pt.usedThisTurn = true;
  gameState.hr.lastTrainTurn = gameState.turn;
  gameState.hr.totalTrainings++;
  
  if (gameState.factory.built)
    gameState.factory.accidentRisk = Math.max(0, (gameState.factory.accidentRisk || 0) - CONSTANTS.HR_PROD_RISK_REDUCTION);
  
  addLog(`🚛 물류/생산 교육 완료 (${pt.count}/${pt.max}회) — 산재위험 -5%`, 'good');
  toast(`생산 교육 완료 (${pt.count}/${pt.max}회)`, 'good');
  updateUI();
}

function calcMktBrandGain(budget) {
  if (budget <= 0) return 0;
  return Math.round(30 * Math.log10(budget / 10_000_000 + 1) * 10) / 10;
}

function calcMktAwarenessGain(budget) {
  if (budget <= 0) return 0;
  return Math.min(0.30, 0.05 * Math.log10(budget / 10_000_000 + 1));
}

function doMarketing() {
  if (gameState.mktThisTurn) { toast('이번 달 마케팅 완료 (1턴 1회 제한)', 'warn'); return; }
  
  const input = document.getElementById('mkt-budget-input');
  const budget = Math.max(0, parseInt(input?.value || '0') || 0);
  
  if (budget <= 0)                          { toast('마케팅 예산을 입력하세요', 'warn'); return; }
  if (budget < CONSTANTS.MARKETING_MIN_BUDGET) { toast('최소 10만원 이상 입력하세요', 'warn'); return; }
  if (gameState.capital < budget) { toast('현금 부족: ' + fmtW(budget) + ' 필요', 'warn'); return; }
  
  const brandGain = calcMktBrandGain(budget);
  const awarenessGain = calcMktAwarenessGain(budget);
  
  gameState.capital -= budget;
  gameState.brandValue = Math.min(1000, gameState.brandValue + brandGain);
  gameState.marketing.totalSpent += budget;
  gameState.marketing.awarenessBonus = Math.min(0.30, (gameState.marketing.awarenessBonus || 0) + awarenessGain);
  gameState.mktThisTurn = true;
  
  if (input) input.value = '';
  
  addLog(`📢 마케팅 ${fmtW(budget)} 집행 — 브랜드 +${brandGain.toFixed(1)}pt, 인지도 +${(awarenessGain*100).toFixed(2)}%`, 'good');
  toast(`마케팅 완료! 브랜드 +${brandGain.toFixed(1)}pt`, 'good');
  updateUI();
}

document.getElementById('hr-sales')?.addEventListener('click', doSalesTrain);
document.getElementById('hr-prod')?.addEventListener('click', doProdTrain);
document.getElementById('hr-mkt')?.addEventListener('click', doMarketing);

document.getElementById('mkt-budget-input')?.addEventListener('input', () => {
  updateHRButtons();
});

// ── 공장 버튼 ─────────────────────────────────────────
document.getElementById('factory-safety-toggle')?.addEventListener('click', () => {
  if (!gameState.factory.built) return;
  gameState.factory.safetyOn = !gameState.factory.safetyOn;
  const isOn = gameState.factory.safetyOn;
  addLog(isOn ? '🔒 안전관리비 활성화 (월 500만원)' : '⚠️ 안전관리비 비활성화 — 산재 위험 누적 시작', isOn ? 'good' : 'warn');
  toast(isOn ? '안전관리비 ON' : '⚠️ 안전관리비 OFF — 주의!', isOn ? 'good' : 'warn');
  updateUI();
});

document.getElementById('factory-build')?.addEventListener('click', () => {
  if (gameState.factory.built)                                  { toast('이미 공장이 있습니다', 'warn'); return; }
  if (gameState.capital < CONSTANTS.FACTORY_BUILD_COST)         { toast('자금 부족 (5억 필요)', 'warn'); return; }
  gameState.capital -= CONSTANTS.FACTORY_BUILD_COST;
  gameState.factory.built = true;
  gameState.factory.buildTurnsLeft = CONSTANTS.FACTORY_BUILD_TURNS;
  addLog('🏭 공장 건설 시작! 3턴 후 완공 예정', 'good');
  toast('공장 건설 시작 (3턴 소요)', 'good');
  updateUI();
});

document.getElementById('factory-upgrade')?.addEventListener('click', () => {
  if (!gameState.factory.built)                                 { toast('공장 없음', 'warn'); return; }
  if (gameState.capital < CONSTANTS.FACTORY_UPGRADE_COST)       { toast('자금 부족 (1억 필요)', 'warn'); return; }
  gameState.capital -= CONSTANTS.FACTORY_UPGRADE_COST;
  gameState.factory.upgradeLevel++;
  addLog(`⬆️ 공장 업그레이드 Lv.${gameState.factory.upgradeLevel} — 품질 +20pt`, 'good');
  toast('업그레이드 완료!', 'good');
  updateUI();
});

document.getElementById('factory-product')?.addEventListener('click', () => {
  if (!gameState.factory.built)                                { toast('공장 없음', 'warn'); return; }
  const name = prompt('새 생산 품목명을 입력하세요:');
  if (!name) return;
  if (gameState.capital < CONSTANTS.FACTORY_PRODUCT_COST)      { toast('자금 부족 (5천만 필요)', 'warn'); return; }
  gameState.capital -= CONSTANTS.FACTORY_PRODUCT_COST;
  gameState.selectedVendor = null;
  addLog(`🔄 품목 변경: ${name} — 새 도매업체 탐색 필요`, 'info');
  toast('품목 변경 완료. 새 도매업체를 선택하세요.', 'info');
  updateUI();
});

// ── 모달 시스템 ──────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.style.display = '';
  el.style.pointerEvents = '';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
  el.style.pointerEvents = 'none';
}

document.getElementById('modal-close-btn')?.addEventListener('click', () => {
  closeModal('report-modal');
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn && gameState.gameStatus === 'playing') {
    nextBtn.disabled = false;
    nextBtn.innerHTML = '▶ 다음 달로';
  }
  _currentDocCards = [];
  if (typeof generateDocCards === 'function') generateDocCards();
  if (typeof renderDocCards === 'function') renderDocCards(true);
  if (typeof step5PostUI === 'function') step5PostUI();
  updateUI();
});

document.getElementById('report-confirm-btn')?.addEventListener('click', () => {
  closeModal('report-modal');
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.innerHTML = `▶ 다음 달로`;
  }
  _currentDocCards = [];
  if (typeof generateDocCards === 'function') generateDocCards();
  if (typeof renderDocCards === 'function') renderDocCards(true);
  if (typeof step5PostUI === 'function') step5PostUI();
  updateUI();
});

document.getElementById('report-modal')?.addEventListener('click', e => {
  if (e.target !== e.currentTarget) return;
  closeModal('report-modal');
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn && gameState.gameStatus === 'playing') {
    nextBtn.disabled = false;
    nextBtn.innerHTML = '▶ 다음 달로';
  }
  _currentDocCards = [];
  if (typeof generateDocCards === 'function') generateDocCards();
  if (typeof renderDocCards === 'function') renderDocCards(true);
  if (typeof step5PostUI === 'function') step5PostUI();
  updateUI();
});

// ════════════════════════════════════════════════════════
//  Step 2-A: Gemini API 연동
// ════════════════════════════════════════════════════════

// API 설정은 config.js 에서 관리합니다 (P0 보안 처리)
// GEMINI_CONFIG.apiKey / GEMINI_CONFIG.url 을 사용하세요.

function showAILoading(subText = '') {
  const ov = document.getElementById('ai-loading');
  const sub = document.getElementById('ai-loading-sub');
  if (sub && subText) sub.textContent = subText;
  if (ov) { ov.classList.remove('hidden'); ov.style.display = ''; ov.style.pointerEvents = ''; }
}

function hideAILoading() {
  const ov = document.getElementById('ai-loading');
  if (ov) { ov.classList.add('hidden'); ov.style.display = 'none'; ov.style.pointerEvents = 'none'; }
}

async function fetchWholesaleData(itemName) {
  showAILoading(`"${itemName}" 시장 분석 중…`);
  
  const prompt = `유저가 '${itemName}'을(를) 검색했어. 이 아이템의 경제적 속성을 파악해 'essential', 'normal', 'luxury' 중 하나의 카테고리(itemCategory)를 정하고, 저가형, 표준형, 고급형 도매업체 3곳의 데이터(상호명, 입고단가, 품질점수)를 JSON 배열 형태로만 대답해.

반드시 아래 JSON 형식만 출력해 (마크다운 코드블록 없이):
{
  "itemCategory": "normal",
  "vendors": [
    {"name":"상호명","type":"cheap",   "unitCost":15000,"qualityScore":70, "description":"한 줄 설명"},
    {"name":"상호명","type":"standard","unitCost":35000,"qualityScore":120,"description":"한 줄 설명"},
    {"name":"상호명","type":"premium", "unitCost":80000,"qualityScore":170,"description":"한 줄 설명"}
  ]
}`;
  
  try {
    const res = await fetch(GEMINI_CONFIG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });
    
    if (!res.ok) throw new Error(`API 오류 ${res.status}: ${res.statusText}`);
    
    const data = await res.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    raw = raw.replace(/```json|```/g, '').trim();
    
    const parsed = JSON.parse(raw);
    if (!parsed.vendors || parsed.vendors.length < 3) throw new Error('도매업체 데이터 불완전');
    
    gameState.itemCategory = parsed.itemCategory || 'normal';
    gameState.wholesaleOptions = parsed.vendors.map(v => ({
      name: v.name,
      type: v.type,
      unitCost: Math.round(v.unitCost),
      qualityScore: Math.round(v.qualityScore),
      description: v.description || '',
    }));
    
    hideAILoading();
    addLog(`[AI] "${itemName}" 분석 완료 — ${parsed.itemCategory} 카테고리`, 'good');
    toast(`도매업체 3곳 생성 완료 (${parsed.itemCategory})`, 'good');
    
    gameState.currentVendorTab = 'cheap';
    updateUI();
    setText('search-status', `✅ "${itemName}" — ${{ essential:'필수재', normal:'일반재', luxury:'사치재' }[parsed.itemCategory] || '일반재'} 카테고리`);
    
  } catch (err) {
    hideAILoading();
    console.error('[fetchWholesaleData]', err);
    
    gameState.wholesaleOptions = generateFallbackVendors(itemName);
    gameState.itemCategory = guessCategoryFromName(itemName);
    gameState.currentVendorTab = 'cheap';
    
    addLog(`[AI] API 오류 — 오프라인 데이터 사용 (${err.message})`, 'warn');
    toast('API 연결 실패 → 오프라인 데이터로 대체', 'warn');
    setText('search-status', `⚠️ 오프라인 모드: "${itemName}"`);
    updateUI();
  }
}

function generateFallbackVendors(itemName) {
  const seed = [...itemName].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (base, range) => base + (seed % range);
  return [
    { name: '대원물산', type: 'cheap', unitCost: r(12000, 8000), qualityScore: r(55, 20), description: '대량 공급 전문, 빠른 납기' },
    { name: `${itemName} 표준공업`, type: 'standard', unitCost: r(30000, 15000), qualityScore: r(100, 30), description: '품질과 가격의 균형' },
    { name: '프리미엄코리아', type: 'premium', unitCost: r(70000, 30000), qualityScore: r(160, 25), description: '최고급 소재, 브랜드 차별화' },
  ];
}

function guessCategoryFromName(name) {
  const luxury = ['명품','가죽','다이아','황금','수제','수공','고급','비건','오가닉','유기농'];
  const essential = ['식품','쌀','빵','물','소금','기저귀','칫솔','비누','세제','마스크','의약'];
  const n = name.toLowerCase();
  if (luxury.some(k => n.includes(k))) return 'luxury';
  if (essential.some(k => n.includes(k))) return 'essential';
  return 'normal';
}

// P2: 검색 중복 호출 방지 (debounce — 버튼 비활성 + 1.5초 쿨다운)
let _searchInFlight = false;
document.getElementById('search-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (_searchInFlight) { toast('탐색 중입니다. 잠시 기다려 주세요', 'warn'); return; }
  const input = document.getElementById('item-search-input');
  const name = input?.value.trim();
  if (!name) { toast('아이템명을 입력해 주세요', 'warn'); return; }
  
  _searchInFlight = true;
  const btn = document.getElementById('search-btn');
  if (btn) btn.disabled = true;
  setText('search-status', '⏳ 탐색 중…');
  
  try {
    await fetchWholesaleData(name);
  } finally {
    _searchInFlight = false;
    if (btn) btn.disabled = false;
  }
  generateSecretaryReport();
});

// ════════════════════════════════════════════════════════
//  Step 2-B & 2-C: 시장 점유율 계산
// ════════════════════════════════════════════════════════

function calcAttraction(qualityScore, brandValue, sellPrice, resistance, category, ecoPhase) {
  return calcAttractionWithAwareness(qualityScore, brandValue, sellPrice, resistance, category, ecoPhase, 0);
}

function calcAttractionWithAwareness(qualityScore, brandValue, sellPrice, resistance, category, ecoPhase, awarenessBonus) {
  if (!sellPrice || sellPrice <= 0) return 0;
  const E_base = ECO_WEIGHTS[category]?.[ecoPhase] ?? 1.0;
  const E = E_base * (1 + (awarenessBonus || 0));
  const denominator = sellPrice * (1 - Math.min(resistance, 0.99));
  if (denominator <= 0) return 0;
  return ((qualityScore + brandValue) * E) / denominator;
}

function calcMarketShares(players) {
  const sqList = players.map(p => Math.max(0, p.attraction) ** 2);
  const total = sqList.reduce((a, v) => a + v, 0);
  if (total <= 0) return players.map(() => 0);
  return sqList.map(sq => sq / total);
}

function calculateMarketShare() {
  const s = gameState;
  const vendor = s.selectedVendor;
  if (!vendor) return null;
  
  const evBrand = getActiveEffectModifier(EV.BRAND);
  const evResist = getActiveEffectModifier(EV.RESIST);
  const evQuality = getActiveEffectModifier(EV.QUALITY);
  
  const factoryDiscount = s.factory.built && s.factory.buildTurnsLeft <= 0 ? 0.6 : 1.0;
  const upgradeBonus = (s.factory.built ? s.factory.upgradeLevel * 20 : 0);
  const myQuality = vendor.qualityScore + upgradeBonus + evQuality;
  const effectiveBrand = Math.max(0, s.brandValue + evBrand);
  const effectiveResist = Math.max(0, s.priceResistance + evResist);
  const awarenessBonus = s.marketing?.awarenessBonus || 0;
  
  const myAttraction = calcAttractionWithAwareness(
    myQuality, effectiveBrand, s.sellPrice,
    effectiveResist, s.itemCategory, s.economy.phase, awarenessBonus
  );
  
  const activeRivals = s.rivals.filter(r => !r.bankrupt);
  activeRivals.forEach(rv => {
    if (!rv.sellPrice || rv.sellPrice === 0) {
      const baseCost = vendor.unitCost * 1.8;
      rv.sellPrice = Math.round(
        rv.pattern === 'aggressive' ? baseCost * 0.85 :
        rv.pattern === 'premium' ? baseCost * 1.35 :
        s.sellPrice > 0 ? s.sellPrice * 0.95 : baseCost
      );
    } else {
      rv.sellPrice = Math.round(
        rv.pattern === 'aggressive' ? rv.sellPrice * (0.97 + Math.random() * 0.03) :
        rv.pattern === 'premium' ? rv.sellPrice * (1.00 + Math.random() * 0.02) :
        s.sellPrice * (0.93 + Math.random() * 0.07)
      );
    }
    
    rv.attraction = calcAttraction(
      rv.qualityScore, rv.brandValue, rv.sellPrice,
      rv.priceResistance, s.itemCategory, s.economy.phase
    );
  });
  
  const allPlayers = [
    { attraction: myAttraction, isMe: true },
    ...activeRivals.map(rv => ({ attraction: rv.attraction, isMe: false, rv })),
  ];
  const shares = calcMarketShares(allPlayers);
  
  s.marketShare = shares[0];
  activeRivals.forEach((rv, i) => { rv.marketShare = shares[i + 1]; });
  
  return {
    myShare: shares[0],
    myAttraction,
    rivalsInfo: activeRivals.map((rv, i) => ({
      name: rv.name,
      sellPrice: rv.sellPrice,
      share: shares[i + 1],
      attraction: rv.attraction,
    })),
  };
}

// ════════════════════════════════════════════════════════
//  Step 2-C: 경제 전이
// ════════════════════════════════════════════════════════

const ECO_TRANSITIONS = {
  boom:      { boom: 0.35, stable: 0.50, recession: 0.15 },
  stable:    { boom: 0.20, stable: 0.55, recession: 0.25 },
  recession: { boom: 0.10, stable: 0.45, recession: 0.45 },
};

function advanceEconomy() {
  const t = ECO_TRANSITIONS[gameState.economy.phase] || ECO_TRANSITIONS.stable;
  const r = Math.random();
  let acc = 0;
  for (const [phase, prob] of Object.entries(t)) {
    acc += prob;
    if (r < acc) { gameState.economy.phase = phase; return; }
  }
}

// ════════════════════════════════════════════════════════
//  Step 3: 통합 시스템 상수 & 모달 함수들
// ════════════════════════════════════════════════════════
// ※ BASE_DEMAND → CONSTANTS.BASE_DEMAND (P1 상수 통일)

const META_KEY = 'mm_v7_meta';
const CREDIT_GRADES = {
  A:{ minNW:500_000_000, limitRatio:2.0, rate:0.048, label:'A등급' },
  B:{ minNW:100_000_000, limitRatio:1.0, rate:0.060, label:'B등급' },
  C:{ minNW: 50_000_000, limitRatio:0.5, rate:0.084, label:'C등급' },
  D:{ minNW:         0,  limitFixed:10_000_000, rate:0.144, label:'D등급' },
};
const REALTY_DATA = [
  { id:'monthly', label:'월세', deposit:10_000_000, monthly:1_000_000, assetVal:10_000_000 },
  { id:'jeonse', label:'전세', deposit:100_000_000, monthly:0, assetVal:100_000_000 },
  { id:'owned', label:'자가 소유', deposit:500_000_000, monthly:0, assetVal:500_000_000 },
];

const META_DEF = { bankrupts:0, clears:0, capitalBonus:0, boomBonus:0, plays:0 };

function loadMeta() {
  try { return {...META_DEF,...JSON.parse(localStorage.getItem(META_KEY)||'{}')} } catch { return {...META_DEF} }
}

function saveMeta(m) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch (e) {
    if (e instanceof DOMException && (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      // 용량 초과 — 오래된 키 정리 후 재시도
      try {
        const keys = Object.keys(localStorage);
        keys.filter(k => k !== META_KEY).forEach(k => localStorage.removeItem(k));
        localStorage.setItem(META_KEY, JSON.stringify(m));
        console.warn('[CapiRogue] localStorage 용량 초과 — 불필요한 항목을 정리했습니다.');
      } catch {
        console.error('[CapiRogue] 메타 데이터 저장 실패: localStorage를 사용할 수 없습니다.');
        toast('진행 데이터를 저장할 수 없습니다 (저장공간 부족)', 'warn');
      }
    }
  }
}

function applyMetaBonuses() {
  const m    = loadMeta();
  const capB = Math.min(m.capitalBonus, CONSTANTS.META_CAPITAL_BONUS_MAX);
  if (capB > 0) {
    gameState.capital = Math.round(gameState.capital * (1 + capB));
    addLog('✨ 메타 보너스: 자본 +' + (capB * 100).toFixed(1) + '%', 'good');
  }
  gameState._boomBonus = Math.min(m.boomBonus, CONSTANTS.META_BOOM_BONUS_MAX);
}

function recordMetaEnd(type) {
  const m = loadMeta();
  m.plays++;
  if (type === 'bankrupt' || type === 'hostile') {
    m.bankrupts++;
    m.capitalBonus = Math.min((m.capitalBonus || 0) + CONSTANTS.META_CAPITAL_BONUS_PER_BANKRUPT, CONSTANTS.META_CAPITAL_BONUS_MAX);
  }
  if (type === 'clear') {
    m.clears++;
    m.boomBonus = Math.min((m.boomBonus || 0) + CONSTANTS.META_BOOM_BONUS_PER_CLEAR, CONSTANTS.META_BOOM_BONUS_MAX);
  }
  saveMeta(m);
  return m;
}

function getGrade(nw) {
  if(nw >= 500_000_000) return 'A';
  if(nw >= 100_000_000) return 'B';
  if(nw >=  50_000_000) return 'C';
  return 'D';
}

function getEffRate() {
  const evRate = getActiveEffectModifier ? getActiveEffectModifier(EV.INTEREST) : 0;
  return Math.max(0.005, gameState.interestRate + ((ECO_RATE_ADJ[gameState.economy.phase]||0)) + evRate);
}

const ECO_RATE_ADJ = { boom:0.02, stable:0, recession:-0.015 };

function getMonthlyInterest() {
  return Math.round(gameState.debt * getEffRate() / 12);
}

function getRealtyOpt() {
  return REALTY_DATA.find(r=>r.id===gameState.realty)||REALTY_DATA[0];
}

function openModal2(html) {
  const box = document.getElementById('modal2-box');
  const ov = document.getElementById('modal2-ov');
  if(!box||!ov) return;
  box.innerHTML = html;
  ov.classList.remove('hidden');
  ov.style.display=''; ov.style.pointerEvents='';
  ov.onclick = e => { if(e.target===ov) closeModal2(); };
  box.querySelector('.m2-close')?.addEventListener('click', closeModal2);
}

function closeModal2() {
  const ov = document.getElementById('modal2-ov');
  if(!ov) return;
  ov.classList.add('hidden');
  ov.style.display='none'; ov.style.pointerEvents='none';
}

function openFinanceModal(initTab='borrow') {
  let tab = initTab;
  function render() {
    const s = gameState;
    const nw = s.capital + s.propertyValue - s.debt;
    const gr = getGrade(nw);
    const gc = CREDIT_GRADES[gr];
    const ef = getEffRate();
    const maxBorrow = gr==='D' ? Math.max(0, gc.limitFixed - s.debt) : Math.max(0, Math.floor(nw*gc.limitRatio) - s.debt);
   const maxRepay = Math.min(s.debt, s.capital);
    const isBorrow = tab==='borrow';
    
    openModal2(`
      <div class="modal-head">
        <span class="modal-title">💳 금융 센터</span>
        <button class="modal-close m2-close">✕</button>
      </div>
      <div style="background:var(--s2);padding:9px 11px;border-radius:8px;margin-bottom:12px;">
        <div class="m2-row"><span class="m2-lbl">신용등급</span><span class="m2-val" style="color:var(--${gr==='A'?'green':gr==='B'?'blue':gr==='C'?'yellow':'red'})">${gc.label}</span></div>
        <div class="m2-row"><span class="m2-lbl">실효 금리 (연)</span><span class="m2-val">${(ef*100).toFixed(1)}%</span></div>
        <div class="m2-row"><span class="m2-lbl">현재 부채</span><span class="m2-val m2-neg">${fmtW(s.debt)}</span></div>
        <div class="m2-row"><span class="m2-lbl">월 이자</span><span class="m2-val m2-neg">${fmtW(getMonthlyInterest())}</span></div>
        <div class="m2-row"><span class="m2-lbl">순자산</span><span class="m2-val ${nw>=0?'m2-pos':'m2-neg'}">${fmtW(nw)}</span></div>
      </div>
      <div class="m2-tabs">
        <button class="m2-tab${isBorrow?' on':''}" id="ft-b">💰 대출</button>
        <button class="m2-tab${!isBorrow?' on':''}" id="ft-r">🏦 상환</button>
      </div>
      <div class="m2-row"><span class="m2-lbl">${isBorrow?'추가 대출 가능':'상환 가능액'}</span><span class="m2-val m2-pos">${fmtW(isBorrow?maxBorrow:maxRepay)}</span></div>
      <input type="range" class="m2-range" id="ft-range" min="0" max="${isBorrow?maxBorrow:maxRepay}" step="100000" value="0">
      <input type="number" class="m2-num" id="ft-amt" placeholder="0" min="0" max="${isBorrow?maxBorrow:maxRepay}" step="100000">
      <div id="ft-preview" style="font-size:11px;color:var(--dim);margin-bottom:2px;min-height:14px;"></div>
      <button class="m2-btn ${isBorrow?'m2-btn-blue':'m2-btn-green'}" id="ft-exec">${isBorrow?'대출 실행':'상환 실행'}</button>`);
    
    document.getElementById('ft-b')?.addEventListener('click',()=>{tab='borrow';render();});
    document.getElementById('ft-r')?.addEventListener('click',()=>{tab='repay';render();});
    
    const rng=document.getElementById('ft-range'), amt=document.getElementById('ft-amt');
    const max2=isBorrow?maxBorrow:maxRepay;
    const sync=v=>{
      const n=Math.max(0,Math.min(parseInt(v)||0,max2));
      if(rng)rng.value=n; if(amt)amt.value=n;
      const prev=document.getElementById('ft-preview');
      if(prev){
        prev.textContent=isBorrow ? `대출 후 부채: ${fmtW(s.debt+n)} · 월 이자: ${fmtW(Math.round((s.debt+n)*ef/12))}` : `상환 후 부채: ${fmtW(Math.max(0,s.debt-n))} · 절감: ${fmtW(Math.round(n*ef/12))}/월`;
      }
    };
    
    rng?.addEventListener('input',e=>sync(e.target.value));
    amt?.addEventListener('input',e=>sync(e.target.value));
    
    document.getElementById('ft-exec')?.addEventListener('click',()=>{
      const n=parseInt(amt?.value||'0')||0;
      if(n<=0){toast('금액 입력','warn');return;}
      if(isBorrow){
        if(n>maxBorrow){toast('한도 초과','warn');return;}
        gameState.capital+=n; gameState.debt+=n;
        addLog('💳 대출 '+fmtW(n),'info');
      } else {
        if(n>s.capital){toast('현금 부족','warn');return;}
        if(n>s.debt){toast('부채 초과','warn');return;}
        gameState.capital-=n; gameState.debt-=n;
        addLog('🏦 상환 '+fmtW(n),'good');
      }
      closeModal2(); toast((isBorrow?'대출':'상환')+' 완료','good'); updateUI();
    });
  }
  render();
}

function openRealtyModal() {
  const s=gameState;
  const curOpt=getRealtyOpt();
  const cards=REALTY_DATA.map(opt=>{
    const isCur=opt.id===s.realty;
    const cost=opt.deposit - curOpt.deposit;
    const canUp=!isCur && REALTY_DATA.indexOf(opt)>REALTY_DATA.indexOf(curOpt);
    const canAfford=s.capital >= cost;
    return `<div class="realty-card ${isCur?'realty-active':''}">
      <div class="realty-name">${isCur?'✓ ':''}{${opt.id==='monthly'?'🏠':opt.id==='jeonse'?'🏡':'🏘'}} ${opt.label}${isCur?' (현재)':''}</div>
      <div class="realty-meta">
        <span>보증금 ${fmtW(opt.deposit)}</span>
        <span>월세 ${opt.monthly>0?fmtW(opt.monthly):'없음'}</span>
        <span>자산가치 ${fmtW(opt.assetVal)}</span>
      </div>
      ${canUp?`<button class="m2-btn m2-btn-green" style="font-size:11px;margin-top:6px;" data-rid="${opt.id}" ${!canAfford?'disabled':''}>${canAfford?opt.label+' 변경 (비용 '+fmtW(cost)+')':'현금 부족 ('+fmtW(cost-s.capital)+' 부족)'}</button>`:''}
    </div>`;
  }).join('');
  
  openModal2(`
    <div class="modal-head">
      <span class="modal-title">🏠 부동산</span>
      <button class="modal-close m2-close">✕</button>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:10px;">
      현재: ${curOpt.label} — 보증금 ${fmtW(curOpt.deposit)} · 월세 ${curOpt.monthly>0?fmtW(curOpt.monthly):'없음'}
    </div>
    ${cards}`);
  
  document.querySelectorAll('[data-rid]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const opt=REALTY_DATA.find(r=>r.id===btn.dataset.rid);
      if(!opt)return;
      const cost=opt.deposit-curOpt.deposit;
      gameState.capital -= cost;
      gameState.realty = opt.id;
      gameState.propertyValue = opt.assetVal;
      addLog('🏠 부동산 변경: '+curOpt.label+' → '+opt.label,'good');
      closeModal2(); toast(opt.label+' 변경 완료','good'); updateUI();
    });
  });
}

function openMnaModal() {
  const diff=gameState.difficulty;
  if(diff!=='hard'&&diff!=='insane'){toast('하드/인세인 전용','warn');return;}
  const s=gameState;
  const nw=s.capital+s.propertyValue-s.debt;
  const cost=Math.max(5_000_000,Math.round(nw*0.15));
  
  openModal2(`
    <div class="modal-head">
      <span class="modal-title">🎰 M&A 인수합병</span>
      <button class="modal-close m2-close">✕</button>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:12px;">
      비용 예상: <strong style="color:var(--red)">${fmtW(cost)}</strong> · 순자산의 15%
    </div>
    <div class="mna-cards">
      <div class="mna-card mna-win"><div class="mna-icon">🎉</div><div class="mna-title" style="color:var(--green)">성공</div><div class="mna-desc">점유율 +8%<br>브랜드 +10<br>라이벌 퇴출</div><div style="font-size:10px;margin-top:5px;color:var(--green);font-weight:700">40%</div></div>
      <div class="mna-card mna-mid"><div class="mna-icon">😐</div><div class="mna-title" style="color:var(--yellow)">유지</div><div class="mna-desc">점유율 +3%<br>운영비 +20%</div><div style="font-size:10px;margin-top:5px;color:var(--yellow);font-weight:700">35%</div></div>
      <div class="mna-card mna-loss"><div class="mna-icon">💀</div><div class="mna-title" style="color:var(--red)">실패</div><div class="mna-desc">부채 +3억<br>운영비 +50%</div><div style="font-size:10px;margin-top:5px;color:var(--red);font-weight:700">25%</div></div>
    </div>
    <button class="m2-btn m2-btn-yellow" id="mna-exec" ${s.capital<cost?'disabled':''}>${s.capital>=cost?'🎰 M&A 실행 — '+fmtW(cost):'현금 부족 ('+fmtW(cost-s.capital)+' 부족)'}</button>`);
  
  document.getElementById('mna-exec')?.addEventListener('click',()=>{
    gameState.capital-=cost; gameState.mna.count++;
    const r=Math.random();
    let outcome, msg;
    if(r<0.40){
      outcome='win';
      gameState.marketShare=Math.min(1,gameState.marketShare+0.08);
      gameState.brandValue+=10;
      const tgt=gameState.rivals.find(rv=>!rv.bankrupt);
      if(tgt){tgt.bankrupt=true;tgt.bankruptTurn=gameState.turn;}
      msg='🎉 M&A 성공! 점유율+8%, 브랜드+10';
    } else if(r<0.75){
      outcome='mid';
      gameState.marketShare=Math.min(1,gameState.marketShare+0.03);
      gameState.mna.opCostMultiplier=Math.min(3,gameState.mna.opCostMultiplier*1.20);
      msg='😐 M&A 유지: 점유율+3%, 운영비+20%';
    } else {
      outcome='loss';
      gameState.debt+=300_000_000;
      gameState.mna.opCostMultiplier=Math.min(3,gameState.mna.opCostMultiplier*1.50);
      msg='💀 M&A 실패! 부채+3억, 운영비+50%';
    }
    addLog(msg, outcome==='win'?'good':outcome==='mid'?'warn':'bad');
    closeModal2(); toast(msg,outcome==='win'?'good':outcome==='mid'?'warn':'bad');
    checkBankruptcy(); updateUI();
  });
}

function openMetaModal() {
  const m=loadMeta();
  openModal2(`
    <div class="modal-head">
      <span class="modal-title">✨ 메타 프로그레션</span>
      <button class="modal-close m2-close">✕</button>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:12px;">
      총 플레이 ${m.plays}회 · 파산 ${m.bankrupts}회 · 클리어 ${m.clears}회
    </div>
    <div class="perk-row">
      <span class="perk-icon">💰</span>
      <div class="perk-body">
        <div class="perk-name">자본 보너스</div>
        <div class="perk-desc">파산 1회당 +0.5% (최대 +15%)</div>
        <div class="perk-bar"><div class="perk-fill" style="width:${Math.min((m.capitalBonus||0)/0.15*100,100).toFixed(0)}%;background:var(--green)"></div></div>
      </div>
      <div class="perk-val" style="color:var(--green)">+${((m.capitalBonus||0)*100).toFixed(1)}%</div>
    </div>
    <div class="perk-row">
      <span class="perk-icon">📈</span>
      <div class="perk-body">
        <div class="perk-name">호황기 확률 보너스</div>
        <div class="perk-desc">클리어 1회당 +2% (최대 +20%)</div>
        <div class="perk-bar"><div class="perk-fill" style="width:${Math.min((m.boomBonus||0)/0.20*100,100).toFixed(0)}%;background:var(--blue)"></div></div>
      </div>
      <div class="perk-val" style="color:var(--blue)">+${((m.boomBonus||0)*100).toFixed(1)}%</div>
    </div>
    <div style="margin-top:8px;padding:9px 11px;background:var(--s2);border-radius:7px;font-size:11px;color:var(--dim);">
      ℹ️ 보너스는 다음 게임 시작 시 자동 적용됩니다.
    </div>
    <button id="meta-reset-btn" class="m2-btn m2-btn-red" style="font-size:11px;margin-top:8px;">초기화</button>`);
  
  document.getElementById('meta-reset-btn')?.addEventListener('click',()=>{
    if(!confirm('메타 데이터를 초기화하시겠습니까?'))return;
    saveMeta({...META_DEF});
    toast('초기화 완료','info'); openMetaModal();
  });
}

function processHRForgetting() {
  const hr = gameState.hr;
  const st = gameState.salesTraining;
  const pt = gameState.prodTraining;
  const totalCount = (st?.count||0) + (pt?.count||0);
  if (!totalCount) return;
  const gap = gameState.turn - (hr.lastTrainTurn || 0);
  if (gap >= 3) {
    const d = 0.02;
    const pR = gameState.priceResistance;
    const pB = gameState.brandValue;
    gameState.priceResistance = Math.max(0, pR - d);
    gameState.brandValue = Math.max(0, pB - Math.ceil(pB * d));
    if (pR !== gameState.priceResistance || pB !== gameState.brandValue)
      addLog('📉 망각 곡선: 저항성/브랜드 감소', 'warn');
  }
}

function processRivalLifecycle() {
  const s=gameState;
  s.rivals.forEach((rv,i)=>{
    if(!rv.bankrupt)return;
    if(!rv.bankruptTurn)return;
    const delay=2+Math.floor(Math.random()*2);
    if(s.turn - rv.bankruptTurn >= delay){
      s.rivals[i]={
        name:rv.name,
        capital:15_000_000+Math.floor(Math.random()*15_000_000),
        brandValue:Math.floor(Math.random()*15),
        priceResistance:0.02,
        marketShare:0,
        pattern:['aggressive','premium','copycat'][Math.floor(Math.random()*3)],
        sellPrice:0,
        qualityScore:70+Math.floor(Math.random()*70),
        bankrupt:false, bankruptTurn:0, attraction:0,
      };
      addLog('⚡ '+rv.name+' 신규 경쟁사로 재진입!','warn');
    }
  });
}

function checkBankruptcy() {
  const s = gameState;
  if (s.gameStatus !== 'playing') return false;
  
  const last4       = s.profitHistory.slice(-CONSTANTS.BANKRUPTCY_CONSEC_MONTHS);
  const consecutive = last4.length >= CONSTANTS.BANKRUPTCY_CONSEC_MONTHS
                    && last4.every(p => p < 0) && s.capital <= 0 && s.debt > 0;
  
  const nw        = s.capital + s.propertyValue - s.debt;
  const insolvent = nw < CONSTANTS.BANKRUPTCY_INSOLVENCY_NW;
  
  if (consecutive || insolvent) {
    s.gameStatus = 'bankrupt';
    showGameOver('bankrupt');
    return true;
  }
  return false;
}

function showGameOver(type) {
  const s=gameState;
  const nw=s.capital+s.propertyValue-s.debt;
  const meta=recordMetaEnd(type);
  const cfgs={
    bankrupt:{ bg:'radial-gradient(ellipse,#2d0a0a,#0D1117)', title:'💀 파산', sub:'자본이 바닥났습니다.', btnBg:'var(--red)' },
    clear:   { bg:'radial-gradient(ellipse,#0a1a2d,#0D1117)', title:'🏆 클리어!', sub:'120개월을 버텨냈습니다!', btnBg:'var(--blue)' },
    hostile: { bg:'radial-gradient(ellipse,#1a1a0a,#0D1117)', title:'🦅 경영권 탈취', sub:'사모펀드에 인수됐습니다.', btnBg:'var(--yellow)' },
  };
  const cfg=cfgs[type]||cfgs.bankrupt;
  const ov=document.getElementById('go-ov');
  if(!ov)return;
  ov.style.background=cfg.bg;
  ov.classList.remove('hidden'); ov.style.display=''; ov.style.pointerEvents='';
  ov.innerHTML=`
    <div class="go-title">${cfg.title}</div>
    <div class="go-sub">${cfg.sub}</div>
    <div class="go-stats">
      <div class="go-stat"><div class="go-stat-lbl">최종 현금</div><div class="go-stat-val" style="color:${s.capital>=0?'var(--green)':'var(--red)'}">${fmtW(s.capital)}</div></div>
      <div class="go-stat"><div class="go-stat-lbl">순자산</div><div class="go-stat-val">${fmtW(nw)}</div></div>
      <div class="go-stat"><div class="go-stat-lbl">경영 기간</div><div class="go-stat-val">${s.turn}개월</div></div>
      <div class="go-stat"><div class="go-stat-lbl">브랜드</div><div class="go-stat-val">${s.brandValue}pt</div></div>
      <div class="go-stat"><div class="go-stat-lbl">누적 이익</div><div class="go-stat-val" style="color:${s.cumulativeProfit>=0?'var(--green)':'var(--red)'}">${sign(s.cumulativeProfit)}</div></div>
    </div>
    <div class="go-meta">
      <div class="go-meta-title">✨ 메타 프로그레션 업데이트</div>
      ${type!=='clear'?`<div class="go-meta-row"><span class="go-meta-lbl">자본 보너스 누적</span><span class="go-meta-new">+${((meta.capitalBonus||0)*100).toFixed(1)}%</span></div>`:''}
      ${type==='clear'?`<div class="go-meta-row"><span class="go-meta-lbl">호황 확률 보너스</span><span class="go-meta-new">+${((meta.boomBonus||0)*100).toFixed(1)}%</span></div>`:''}
      <div class="go-meta-row"><span class="go-meta-lbl">총 플레이</span><span class="go-meta-new">${meta.plays}회</span></div>
    </div>
    <button class="go-restart" style="background:${cfg.btnBg};color:#0D1117" onclick="location.reload()">🔄 다시 시작</button>`;
}

const STORIES={
  1:  { act:'프롤로그', title:'작은 가게, 큰 꿈',
    text:'당신은 창고 한 켠에서 첫 주문서를 펼쳤다.\n시장은 냉혹하다. 하지만 기회는 항상 있다.\n120개월 뒤, 캐피로그라는 이름이 시장을 지배할 것이다.' },
  37: { act:'2막 — 성장의 고통', title:'라이벌이 나타났다',
    text:'조용히 성장하던 당신 앞에 강력한 경쟁자가 등장했다.\n가격을 내리고, 품질을 올리고, 브랜드를 쌓아라.\n시장은 멈추는 자를 뒤처지게 만든다.' },
  81: { act:'3막 — 거대한 파도', title:'블랙 스완의 경고',
    text:'지평선 너머에서 뭔가가 다가오고 있다.\n예측 불가능한 사건이 시장을 뒤흔들 것이다.\n자본을 쌓고, 부채를 줄이고, 브랜드를 강화하라.' },
  111:{ act:'피날레', title:'마지막 10턴',
    text:'이제 9턴이 남았다.\n당신이 쌓아온 모든 것이 이 마지막 순간에 시험받는다.\n끝까지 버텨라.' },
};

function showStory(turn) {
  const st=STORIES[turn]; if(!st)return;
  const ov=document.getElementById('story-ov');
  if(!ov)return;
  ov.classList.remove('hidden'); ov.style.display=''; ov.style.pointerEvents='';
  document.getElementById('story-act').textContent = st.act;
  document.getElementById('story-title').textContent = st.title;
  const body=document.getElementById('story-body');
  const cont=document.getElementById('story-cont');
  if(!body||!cont)return;
  body.innerHTML=''; cont.style.display='none';
  let i=0;
  const cursor=document.createElement('span'); cursor.className='story-cursor';
  body.appendChild(cursor);
  const iv=setInterval(()=>{
    if(i<st.text.length){ cursor.before(st.text[i++]); }
    else{
      clearInterval(iv); cursor.remove();
      cont.style.display='inline-block';
    }
  }, 28);
  cont.onclick=()=>{
    clearInterval(iv);
    ov.classList.add('hidden'); ov.style.display='none'; ov.style.pointerEvents='none';
  };
}

const BLACK_SWANS=[
  { id:'dumping',
    title:'🦕 글로벌 덤핑 공세', sub:'거대 플랫폼이 원가 이하 판매를 시작했습니다!',
    bg:'radial-gradient(ellipse,#1a0a2d,#0D1117)',
    effs:[{cls:'se-purple',t:'라이벌 판매가 → 원가 ×0.5'},{cls:'se-red',t:'시장 수요 -30%'},{cls:'se-yellow',t:'브랜드가 핵심'}],
    btnColor:'var(--purple)',
    onStart(s){ s._bsType='dumping'; s._bsDemandMul=0.7; },
    onEnd(s)  { s._bsType=null; s._bsDemandMul=null; delete s._bsDumping; },
  },
  { id:'pe',
    title:'🦅 사모펀드 적대적 인수', sub:'순자산 5억 미만이면 즉시 경영권 탈취!',
    bg:'radial-gradient(ellipse,#2d1a0a,#0D1117)',
    effs:[{cls:'se-red',t:'매 턴 순자산 < 5억 → 즉시 인수'},{cls:'se-yellow',t:'10턴 지속'},{cls:'se-purple',t:'자산 확보로 방어'}],
    btnColor:'var(--yellow)',
    onStart(s){ s._bsType='pe'; },
    onEnd(s)  { s._bsType=null; },
  },
  { id:'storm',
    title:'🌊 금리 30% 퍼펙트 스톰', sub:'초긴급 금리 인상 + 경기 침체 동시 발생!',
    bg:'radial-gradient(ellipse,#0a1a1a,#0D1117)',
    effs:[{cls:'se-red',t:'기준 금리 +30%p (10턴)'},{cls:'se-red',t:'불황기 강제 고정'},{cls:'se-yellow',t:'시장 수요 -40%'}],
    btnColor:'var(--red)',
    onStart(s){ s._bsType='storm'; s.interestRate+=0.30; s.economy.phase='recession'; s._bsDemandMul=0.6; addLog('🌊 퍼펙트 스톰: 금리+30%p','bad'); },
    onEnd(s)  { s.interestRate-=0.30; s._bsType=null; s._bsDemandMul=null; },
  },
];

let _bsActive=null, _bsTurnsLeft=0;

function checkBlackSwan() {
  const s = gameState;
  if (s.turn < CONSTANTS.BLACK_SWAN_START_TURN || _bsActive || s.gameStatus !== 'playing') return;
  const prob = 0.01 + (s.turn - CONSTANTS.BLACK_SWAN_START_TURN) * 0.001; // 80턴 1% → 120턴 5%
  if (Math.random() < prob) triggerBlackSwan();
}

function triggerBlackSwan() {
  const sw=BLACK_SWANS[Math.floor(Math.random()*BLACK_SWANS.length)];
  _bsActive=sw; _bsTurnsLeft=10;
  sw.onStart(gameState);
  const ov=document.getElementById('swan-ov');
  if(!ov)return;
  ov.style.background=sw.bg;
  ov.classList.remove('hidden'); ov.style.display=''; ov.style.pointerEvents='';
  ov.innerHTML=`
    <div class="swan-title">${sw.title}</div>
    <div class="swan-sub">${sw.sub}</div>
    <div class="swan-effects">${sw.effs.map(e=>`<div class="swan-eff ${e.cls}">${e.t}</div>`).join('')}</div>
    <button class="swan-ok" style="background:${sw.btnColor};color:#0D1117;" id="swan-ok-btn">확인 — 버텨라!</button>`;
  document.getElementById('swan-ok-btn')?.addEventListener('click',()=>{
    ov.classList.add('hidden'); ov.style.display='none'; ov.style.pointerEvents='none';
    updateUI();
  });
  addLog('⚠️ 블랙 스완: '+sw.title,'bad');
}

function tickBlackSwan() {
  if(!_bsActive)return;
  if(_bsActive.id==='pe'){
    const nw=gameState.capital+gameState.propertyValue-gameState.debt;
    if(nw<500_000_000){ gameState.gameStatus='hostile'; showGameOver('hostile'); return; }
  }
  _bsTurnsLeft--;
  if(_bsTurnsLeft<=0){
    _bsActive.onEnd(gameState);
    addLog('✅ 블랙 스완 종료: '+_bsActive.title,'good');
    _bsActive=null; _bsTurnsLeft=0;
    updateUI();
  }
}

function animateNum(el, target, dur=600) {
  if(!el)return;
  const abs=Math.abs(target), isPos=target>=0;
  const start=Date.now();
  const tick=()=>{
    const t=Math.min((Date.now()-start)/dur,1);
    const ease=1-Math.pow(1-t,3);
    el.textContent=(isPos?'+':'-')+Math.round(abs*ease).toLocaleString('ko-KR')+'원';
    el.style.color=isPos?'var(--green)':'var(--red)';
    el.classList.add('num-roll');
    if(t<1)requestAnimationFrame(tick);
    else{el.textContent=sign(target);el.style.color=isPos?'var(--green)':'var(--red)';}
  };
  requestAnimationFrame(tick);
}

function checkMonopolyTheme() {
  const layout=document.getElementById('main-layout');
  if(!layout)return;
  if(gameState.marketShare>=0.80){
    if(!layout.classList.contains('gold-panel')){
      layout.classList.add('gold-panel');
      gameState.priceResistance=Math.min(0.5,gameState.priceResistance*1.5);
      addLog('🏆 독점 달성! 골드 테마 활성화, 저항성 페널티 반감','good');
      toast('🏆 독점! 점유율 80% 돌파','good');
    }
  } else {
    layout.classList.remove('gold-panel');
  }
}

function toggleCartel() {
  const d=gameState.difficulty;
  if(d!=='hard'&&d!=='insane'){toast('하드/인세인 전용','warn');return;}
  gameState.cartel=gameState.cartel||{active:false};
  gameState.cartel.active=!gameState.cartel.active;
  const btn=document.getElementById('cartel-btn');
  if(btn){
    btn.classList.toggle('active',gameState.cartel.active);
    btn.textContent=gameState.cartel.active?'🤝 담합 활성 (클릭하여 해제)':'🤝 담합 활성화 (×1.5 수익 / 적발 15%)';
  }
  addLog(gameState.cartel.active?'🤝 담합 활성화':'담합 해제',gameState.cartel.active?'warn':'info');
  toast(gameState.cartel.active?'담합 활성화!':'담합 해제','warn');
}

document.getElementById('cartel-btn')?.addEventListener('click', toggleCartel);

function advanceEconomyV3() {
  if(_bsActive?.id==='storm'){gameState.economy.phase='recession';return;}
  const bb=gameState._boomBonus||0;
  const phase=gameState.economy.phase||'stable';
  const T={
    boom:      {boom:0.35+bb,      stable:0.50,              recession:Math.max(0.05,0.15-bb)},
    stable:    {boom:0.20+bb,      stable:Math.max(0.3,0.55-bb),recession:0.25},
    recession: {boom:0.10+bb,      stable:0.45,              recession:Math.max(0.05,0.45-bb)},
  }[phase]||{boom:0.2,stable:0.55,recession:0.25};
  const r=Math.random(); let acc=0;
  for(const[p,v]of Object.entries(T)){acc+=v;if(r<acc){gameState.economy.phase=p;return;}}
}

(function(){
  const old=document.getElementById('next-btn');
  if(!old)return;
  const clone=old.cloneNode(true);
  old.parentNode.replaceChild(clone,old);
  clone.addEventListener('click', runTurn);
})();

// ── P1: 수익 계산 서브함수 (runTurn 분리) ────────────────────────────────
/**
 * 한 턴의 시장·원가·이익 전체 계산.
 * 담합 적발 시 s.capital / s.cartel 을 직접 수정 (side-effect 허용).
 */
function _calcTurnResult(s, shareResult) {
  // ① 수요
  const ecoMul      = ECO_WEIGHTS[s.itemCategory]?.[s.economy.phase] ?? 1.0;
  const bsMul       = s._bsDemandMul ?? 1.0;
  const evDemandMul = 1 + getActiveEffectModifier(EV.MARKET_MUL);
  const docMul      = 1 + (s._docDemandMul || 0);
  s._docDemandMul   = 0;
  const demand      = Math.round(
    CONSTANTS.BASE_DEMAND * ecoMul * bsMul
    * Math.max(0.1, evDemandMul) * Math.max(0.1, docMul)
    * (0.9 + Math.random() * 0.2)
  );
  // ② 판매량·원가
  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  let sold = (s._shutdownLeft > 0) ? 0 : Math.round(demand * shareResult.myShare);
  if (s._shutdownLeft > 0) s._shutdownLeft--;
  const netCost = Math.round(s.selectedVendor.unitCost * (factoryActive ? CONSTANTS.FACTORY_DISCOUNT : 1.0));
  const revenue = sold * s.sellPrice;
  const cogs    = sold * netCost;
  let   gross   = revenue - cogs;
  // ③ 담합
  let cartelFine = 0;
  if (s.cartel?.active) {
    gross = Math.round(gross * CONSTANTS.CARTEL_REVENUE_MUL);
    if (Math.random() < CONSTANTS.CARTEL_BUST_PROB) {
      cartelFine      = CONSTANTS.CARTEL_FINE;
      s.capital      -= cartelFine;
      s.cartel.active = false;
      const cBtn = document.getElementById('cartel-btn');
      if (cBtn) { cBtn.classList.remove('active'); cBtn.textContent = '🤝 담합 활성화 (×1.5 수익 / 적발 15%)'; }
      addLog('🚨 공정위 적발! 과징금 5천만', 'bad');
      toast('담합 적발! 과징금 5천만 원', 'bad');
    }
  }
  // ④ 고정비
  const monthlyInt = getMonthlyInterest();
  const realtyRent = getRealtyOpt().monthly;
  const safetyCost = factoryActive && s.factory.safetyOn ? CONSTANTS.FACTORY_SAFETY_COST : 0;
  const evCostMul  = 1 + getActiveEffectModifier(EV.COST_MUL);
  const totalFixed = Math.round(
    (monthlyInt + s.monthlyFixedCost + realtyRent + safetyCost)
    * s.mna.opCostMultiplier * Math.max(0.1, evCostMul)
  );
  // ⑤ 산업재해
  let accPenalty = 0;
  if (factoryActive && !s.factory.safetyOn) {
    s.factory.accidentRisk = Math.min(1, (s.factory.accidentRisk || 0) + CONSTANTS.FACTORY_ACCIDENT_RISK_INC);
    if (Math.random() < s.factory.accidentRisk) {
      accPenalty             = CONSTANTS.FACTORY_ACCIDENT_PENALTY;
      s._shutdownLeft        = CONSTANTS.FACTORY_ACCIDENT_SHUTDOWN;
      s.factory.accidentRisk = 0;
      addLog('💥 산업재해! -1억, 2턴 영업정지', 'bad');
      toast('산업재해 발생!', 'bad');
    }
  }
  return {
    ecoMul, demand, sold, factoryActive, netCost, revenue, cogs,
    gross, cartelFine, monthlyInt, realtyRent, safetyCost,
    totalFixed, accPenalty, evDemandMul, evCostMul,
    netProfit: gross - totalFixed - accPenalty,
  };
}

async function runTurn() {
  const s=gameState;
  if(!s.selectedVendor||s.sellPrice<=0)return;
  if(s.gameStatus!=='playing')return;
  
  const btn=document.getElementById('next-btn');
  if(btn){btn.disabled=true;btn.textContent='⏳ 정산 중…';}
  
  tickActiveEffects(s);
  const monthlyEvent = rollMonthlyEvent(s);
  if (monthlyEvent) {
    showNewsBreaking(monthlyEvent);
    await new Promise(res => {
      const chk = setInterval(() => {
        const ov = document.getElementById('news-ov');
        if (ov && ov.classList.contains('hidden')) { clearInterval(chk); res(); }
      }, 150);
    });
  }
  
  if([1,37,81,111].includes(s.turn)&&!s._storyShown?.[s.turn]){
    s._storyShown=s._storyShown||{};
    s._storyShown[s.turn]=true;
    showStory(s.turn);
    await new Promise(res=>{
      const chk=setInterval(()=>{
        const ov=document.getElementById('story-ov');
        if(ov&&ov.classList.contains('hidden')){clearInterval(chk);res();}
      },150);
    });
  }
  
  advanceEconomyV3();
  checkBlackSwan();
  if(_bsActive)tickBlackSwan();
  if(s.gameStatus!=='playing'){if(btn){btn.disabled=true;}return;}
  
  if(_bsActive?.id==='dumping'){
    s.rivals.forEach(rv=>{if(!rv.bankrupt)rv.sellPrice=Math.round((s.selectedVendor.unitCost||30000)*0.5);});
  }
  
  const shareResult=calculateMarketShare();
  if(!shareResult){if(btn){btn.disabled=false;btn.innerHTML=`▶ 다음 달로 (${s.turn}개월 차)`;}return;}
  
  // P1: 수익 계산을 서브함수로 위임
  const { ecoMul, demand, sold, factoryActive, netCost, revenue, cogs,
          gross, cartelFine, monthlyInt, realtyRent, safetyCost,
          totalFixed, accPenalty, netProfit, evDemandMul, evCostMul } = _calcTurnResult(s, shareResult);
  
  s.capital+=netProfit;
  s.cumulativeProfit+=netProfit;
  s.profitHistory.push(netProfit);
  if(s.profitHistory.length>12)s.profitHistory.shift();
  
  if(s.factory.built&&s.factory.buildTurnsLeft>0){
    s.factory.buildTurnsLeft--;
    if(s.factory.buildTurnsLeft===0)addLog('🏭 공장 완공! 원가 -40%','good');
  }
  
  processHRForgetting();
  
  s.rivals.forEach(rv=>{
    if(rv.bankrupt)return;
    const rvSold=Math.round(demand*rv.marketShare);
    rv.capital=(rv.capital||20_000_000)+rvSold*(rv.sellPrice-(s.selectedVendor?.unitCost||30000))-500_000;
    if(rv.capital<=0&&!rv.bankrupt){rv.bankrupt=true;rv.bankruptTurn=s.turn;addLog('💀 '+rv.name+' 파산!','good');}
  });
  processRivalLifecycle();
  
  checkMonopolyTheme();
  
  if(checkBankruptcy())return;
  
  if(s.turn>=s.maxTurns){s.gameStatus='clear';showGameOver('clear');return;}
  
  s.lastTurnResult={sold,demand,revenue,cogs,gross,totalFixed,netProfit,
    shareResult,ecoMul,monthlyInt,realtyRent,safetyCost,cartelFine,accPenalty,
    monthlyEvent, evDemandMul, evCostMul,
    docEventResult: s._lastDocResult || null};
  s._lastDocResult = null;
  
  fillReportV3(s.lastTurnResult);
  openModal('report-modal');
  generateSecretaryReport(s.lastTurnResult);
  
  animateNum(document.getElementById('dash-profit'), netProfit);
  setText('dash-demand',fmt(demand)+'개');
  setText('dash-sold',  fmt(sold)+'개');
  setText('dash-accum', sign(s.cumulativeProfit), s.cumulativeProfit>=0?'var(--green)':'var(--red)');
  
  addLog('T'+s.turn+' | '+sign(netProfit)+' | 점유율 '+(shareResult.myShare*100).toFixed(1)+'% | 판매 '+fmt(sold)+'개', netProfit>=0?'good':'bad');
  
  s.turn++;
  if (s.salesTraining) s.salesTraining.usedThisTurn = false;
  if (s.prodTraining) s.prodTraining.usedThisTurn = false;
  s.mktThisTurn = false;
  s.hr.trainingThisTurn = 0;
  updateUI();
  
  if(btn){btn.disabled=false;btn.innerHTML=`▶ 다음 달로 (${s.turn}개월 차)`;}
}

function fillReportV3(r){
  const{sold,demand,revenue,cogs,gross,totalFixed,netProfit,shareResult,
        monthlyInt,realtyRent,safetyCost,cartelFine,accPenalty,docEventResult}=r;
  setText('rp-sold',`${fmt(sold)}개 / 수요 ${fmt(demand)}개`);
  setText('rp-revenue',fmtW(revenue));
  setText('rp-cogs',   fmtW(cogs));
  setText('rp-fixed', fmtW(totalFixed));
  const fixedSub=document.getElementById('rp-fixed-sub');
  if(fixedSub) fixedSub.textContent=`이자 ${fmtW(monthlyInt)} · 임대 ${fmtW(realtyRent)} · 안전비 ${fmtW(safetyCost)}`;
  const profEl=document.getElementById('rp-profit');
  if(profEl)animateNum(profEl,netProfit);
  setText('rp-share',pct(shareResult.myShare));
  const badge=document.getElementById('rp-profit-badge');
  if(badge)badge.className='profit-badge '+(netProfit>=0?'profit-pos':'profit-neg');
  const sec=document.getElementById('rp-rivals-section');
  if(sec){
    let extra='';
    if(docEventResult) extra+=`<div class="report-row"><span class="report-lbl" style="color:var(--blue)">📋 결재</span><span class="report-val" style="color:var(--dim);font-size:10px;">${docEventResult.slice(0,30)}</span></div>`;
    if(cartelFine>0)extra+=`<div class="report-row"><span class="report-lbl" style="color:var(--red)">🚨 담합 과징금</span><span class="report-val" style="color:var(--red)">-${fmtW(cartelFine)}</span></div>`;
    if(accPenalty>0)extra+=`<div class="report-row"><span class="report-lbl" style="color:var(--red)">💥 산재 벌금</span><span class="report-val" style="color:var(--red)">-${fmtW(accPenalty)}</span></div>`;
    sec.innerHTML=extra+(shareResult.rivalsInfo||[]).map(rv=>
      `<div class="report-row"><span class="report-lbl">${rv.name} (${fmtW(rv.sellPrice)})</span><span class="report-val">${pct(rv.share)}</span></div>`).join('');
  }
}

document.getElementById('btn-realty')?.addEventListener('click', openRealtyModal);
document.getElementById('btn-loan')  ?.addEventListener('click', ()=>openFinanceModal('borrow'));
document.getElementById('btn-mna')   ?.addEventListener('click', openMnaModal);
document.getElementById('btn-meta')  ?.addEventListener('click', openMetaModal);

document.querySelectorAll('.diff-card').forEach(card=>{
  card.addEventListener('click',()=>{
    setTimeout(()=>{ applyMetaBonuses(); updateUI(); }, 50);
  });
});

const ADVISOR_AVATAR = { easy: '🤖', normal: '📋', hard: '📡', insane: '💀' };
const ADVISOR_LABEL = {
  easy:'AI 비서 (Easy)', normal:'정보 담당관 (Normal)', hard:'데이터 분석기 (Hard)', insane:'노이즈 오라클 (Insane)',
};

function generateSecretaryReport(lastResult) {
  const s = gameState;
  const diff = s.difficulty;
  let lines = [];
  
  if (!s.selectedVendor) {
    lines.push('⚠️ 아직 도매업체 계약이 없습니다. 하단 검색창에서 아이템을 탐색해 주세요.');
  } else {
    const cat = s.itemCategory;
    const phase = s.economy.phase;
    const catKR = { essential:'필수재', normal:'일반재', luxury:'사치재' }[cat] || '일반재';
    const ecoKR = { boom:'호황기 🚀', stable:'평시 ➡️', recession:'불황기 📉' }[phase] || '평시';
    const ecoW = ECO_WEIGHTS[cat]?.[phase] ?? 1.0;
    
    if (diff === 'easy') {
      const rv0 = s.rivals[0];
      if (rv0) {
        const nextPrice = Math.round(rv0.sellPrice * (rv0.pattern === 'aggressive' ? 0.93 : rv0.pattern === 'premium' ? 1.02 : 0.97));
        const actionMap = { aggressive: '가격 인하 예정', premium: '품질 강화 집중', copycat: '우리 가격 추적' };
        lines.push(`📊 ${rv0.name}: 다음 달 예상가 ${fmtW(nextPrice)} / 전략: ${actionMap[rv0.pattern]}`);
      }
      lines.push(`💡 현재 시장: ${ecoKR} (${catKR} 수요 배율 ×${ecoW.toFixed(1)})`);
      if (lastResult) {
        const shareStr = (lastResult.shareResult.myShare * 100).toFixed(1);
        if (parseFloat(shareStr) < 20) lines.push(`⚠️ 점유율 ${shareStr}% — 가격 전략 조정이 필요합니다!`);
      }
    } else if (diff === 'normal') {
      s.rivals.filter(r => !r.bankrupt).forEach(rv => {
        const vendorType = { aggressive:'저가 도매업체', premium:'고급 도매업체', copycat:'표준 도매업체' }[rv.pattern] || '–';
        lines.push(`${rv.name}: ${fmtW(rv.sellPrice || 0)} 판매 중 / ${vendorType} 이용 추정 / 점유율 ${pct(rv.marketShare)}`);
      });
      lines.push(`경기: ${ecoKR} | ${catKR} 수요 ×${ecoW.toFixed(1)}`);
    } else if (diff === 'hard') {
      const totalShare = s.rivals.reduce((a, r) => a + r.marketShare, 0);
      lines.push(`거시 지표 브리핑`);
      lines.push(`• 경기: ${ecoKR} | 금리: ${(s.interestRate * 100).toFixed(1)}% | 수요 배율: ×${ecoW.toFixed(1)}`);
      lines.push(`• 내 점유율: ${pct(s.marketShare)} / 경쟁사 합계: ${pct(totalShare)}`);
      lines.push(`• 활성 라이벌: ${s.rivals.filter(r => !r.bankrupt).length}명`);
    } else if (diff === 'insane') {
      lines.push(`[인세인 모드] 데이터 신뢰도 불보증`);
      lines.push(`• 금리: ${(s.interestRate * 100).toFixed(1)}% | 경기: ${ecoKR}`);
      s.rivals.filter(r => !r.bankrupt).forEach(rv => {
        if (Math.random() < 0.30) {
          const fakePrice = Math.round(rv.sellPrice * (0.5 + Math.random()));
          const fakeShare = (Math.random() * 0.6).toFixed(3);
          lines.push(`⚠️ [허위] ${rv.name}: ${fmtW(fakePrice)} / 점유율 ${pct(parseFloat(fakeShare))}`);
        } else {
          lines.push(`• ${rv.name}: 약 ${fmtW(rv.sellPrice || 0)} 추정`);
        }
      });
    }
  }
  
  const avatar = document.getElementById('adv-avatar');
  const modeEl = document.getElementById('adv-mode');
  const bubble = document.getElementById('adv-bubble');
  if (avatar) avatar.textContent = ADVISOR_AVATAR[diff] || '🤖';
  if (modeEl) modeEl.textContent = ADVISOR_LABEL[diff] || 'AI 비서';
  if (bubble) {
    bubble.innerHTML = lines.map(l => `<div style="margin-bottom:3px;">${l}</div>`).join('');
    bubble.className = `advisor-bubble advisor-${diff}`;
  }
}

function updateAdvisor(report) { generateSecretaryReport(report); }

document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => {
    const diff = card.dataset.diff;
    applyDifficulty(diff);
    document.getElementById('diff-screen').classList.add('hidden');
    document.getElementById('main-layout').style.display = '';
    addLog(`게임 시작: ${DIFF_LABEL[diff]}`, 'info');
    updateUI();
    generateSecretaryReport();
    setText('search-status', '아이템명을 입력하고 🔍 탐색 버튼을 눌러 도매업체를 불러오세요');
  });
});

// ════════════════════════════════════════════════════════
//  Step 4: 이벤트 시스템 스텁 (실제 구현은 원본 HTML에 있음)
// ════════════════════════════════════════════════════════

const EV = {
  BRAND: 'brand_value', RESIST: 'price_resistance', COST_MUL: 'cost_reduction',
  HR_BOOST: 'hr_boost', MARKET_MUL: 'market_demand_mul', INTEREST: 'interest_rate',
  CAPITAL: 'capital_once', DEBT: 'debt_once', QUALITY: 'quality_bonus',
  SHUTDOWN: 'factory_shutdown', BRAND_DECAY: 'brand_decay', SHARE_BOOST: 'share_once',
};

const randomEvents = [];
let _currentDocCards = [];

function rollMonthlyEvent(s) { return null; }
function tickActiveEffects(s) {}
function getActiveEffectModifier(type) { return 0; }
function renderStatusBoard() {
  const list = _dom('status-board-list');
  if (!list) return;
  const effects = (gameState.activeEffects || []);
  if (!effects.length) {
    list.innerHTML = '<div class="status-none">활성 상황 없음</div>';
    return;
  }
  list.innerHTML = effects.map(e => {
    const cls = e.positive ? 'status-item-pos turns-pos' : (e.positive === false ? 'status-item-neg turns-neg' : 'status-item-neu turns-neu');
    const itemCls = e.positive ? 'status-item-pos' : (e.positive === false ? 'status-item-neg' : 'status-item-neu');
    return `<div class="status-item ${itemCls}">
      <span class="status-item-name">${e.name || e.label || '–'}</span>
      <span class="status-item-turns ${cls.split(' ')[1]}">${e.turnsLeft ?? '∞'}턴</span>
    </div>`;
  }).join('');
}

function updateTimeline() {
  const s = gameState;
  const pct = s.turn / s.maxTurns;
  const fillEl = _dom('turn-fill');
  const curEl  = _dom('tl-cur');
  const numEl  = _dom('tl-turn-num');
  if (fillEl) fillEl.style.width = (pct * 100).toFixed(2) + '%';
  if (curEl)  curEl.style.left   = (pct * 100).toFixed(2) + '%';
  if (numEl)  numEl.textContent  = s.turn;
}
function updateHQVisual() {
  const s  = gameState;
  const nw = s.capital + (s.propertyValue || 0) - s.debt;
  const STAGES = [
    { min: 500_000_000, emoji:'🏙️', stage:'대기업',   name:'도심 마천루'  },
    { min: 100_000_000, emoji:'🏬', stage:'성장기',   name:'IT 빌딩'     },
    { min:  30_000_000, emoji:'🏢', stage:'초기 성장', name:'임대 사무실' },
    { min:           0, emoji:'🏚️', stage:'창업 초기', name:'허름한 차고지'},
  ];
  const cur = STAGES.find(t => nw >= t.min) || STAGES[3];
  const emojiEl = _dom('hq-emoji');
  const wasEmoji = emojiEl?.textContent;
  if (emojiEl && wasEmoji !== cur.emoji) {
    emojiEl.textContent = cur.emoji;
    emojiEl.classList.remove('evolving');
    // reflow to restart animation
    void emojiEl.offsetWidth;
    emojiEl.classList.add('evolving');
    emojiEl.addEventListener('animationend', () => emojiEl.classList.remove('evolving'), { once: true });
  }
  setText('hq-stage', cur.stage);
  setText('hq-name',  cur.name);
}
function renderPieChart() {
  const s = gameState;
  const PIE_COLORS = ['#58A6FF','#FF6B6B','#51CF66','#FFD43B','#CC5DE8','#FF922B','#20C997'];
  // Collect slices: me + rivals
  const myShare = s.marketShare || 0;
  const rivals  = (s.rivals || []).filter(r => !r.bankrupt);
  let total = myShare + rivals.reduce((a, r) => a + (r.marketShare || 0), 0);
  const other = Math.max(0, 100 - total);
  const slices = [
    { name: '나', pct: myShare, color: PIE_COLORS[0] },
    ...rivals.map((r, i) => ({ name: r.name, pct: r.marketShare || 0, color: PIE_COLORS[1 + i] })),
    { name: '기타', pct: other, color: '#30363D' },
  ].filter(s => s.pct > 0);

  // Conic gradient
  let deg = 0;
  const stops = slices.map(sl => {
    const start = deg;
    deg += sl.pct / 100 * 360;
    return `${sl.color} ${start.toFixed(1)}deg ${deg.toFixed(1)}deg`;
  });
  const canvas = _dom('pie-canvas');
  if (canvas) canvas.style.background = `conic-gradient(${stops.join(', ')})`;
  const center = _dom('pie-center');
  if (center) center.textContent = myShare.toFixed(1) + '%';

  // Legend
  const legend = _dom('pie-legend');
  if (legend) {
    legend.innerHTML = slices.map(sl =>
      `<div class="pie-legend-row">
        <div class="pie-dot" style="background:${sl.color}"></div>
        <span class="pie-name">${sl.name}</span>
        <span class="pie-pct">${sl.pct.toFixed(1)}%</span>
      </div>`
    ).join('');
  }
}
function generateDocCards() {}
function renderDocCards(enabled=true) {}
function updateDocSection() {}
function step5PostUI() {}
function showNewsBreaking(event) {}

document.querySelectorAll('[id^="price-"], [id^="mkt-"]').forEach(el => {
  el?.addEventListener('input', () => step5PostUI());
});

document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => setTimeout(() => step5PostUI(), 120));
});

setTimeout(() => step5PostUI(), 0);
