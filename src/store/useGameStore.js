import { create } from 'zustand';
import {
  C, EV, ECO_WEIGHTS, DIFF_CONFIG, DIFF_LABEL, STORIES,
  BLACK_SWANS, CREDIT_GRADES, REALTY_DATA, META_DEF, META_KEY,
  ECO_PHASE_DURATION, TAX_BRACKETS, RIVAL_ARCHETYPES, POLICY_EVENTS,
  ADVISOR_AVATAR, ADVISOR_LABEL,
} from '../constants.js';
import {
  calculateMarketShare, advanceEconomy, calcTurnResult,
  getActiveEffectModifier, calcMktBrandGain, calcMktAwarenessGain, getLoanRateByGrade,
} from '../calculations.js';
import { fetchWholesaleData, getOfflineVendors } from '../apiService.js';
import { calcCreditGrade, netWorth, loadMeta, saveMeta, fmtW, sign, validateItemInput } from '../utils.js';

// ── Initial state factory ─────────────────────────────────────────────────────
const INITIAL_GAME = () => ({
  capital: 100_000_000,
  debt: 0,
  interestRate: 0.048,
  propertyValue: 10_000_000,
  brandValue: 0,
  priceResistance: 0,
  turn: 1,
  maxTurns: 120,
  difficulty: null,
  gameStatus: 'playing',
  sellPrice: 0,
  monthlyFixedCost: C.MONTHLY_FIXED_COST,
  marketShare: 0,
  itemCategory: 'normal',
  wholesaleOptions: [],
  selectedVendor: null,
  currentVendorTab: 'cheap',
  rivals: [],
  factory: { built: false, buildTurnsLeft: 0, safetyOn: true, accidentRisk: 0, upgradeLevel: 0 },
  salesTraining: { count: 0, max: 10, usedThisTurn: false },
  prodTraining:  { count: 0, max: 10, usedThisTurn: false },
  mktThisTurn: false,
  marketing: { totalSpent: 0, awarenessBonus: 0 },
  hr: { trainingThisTurn: 0, totalTrainings: 0, lastTrainTurn: 0 },
  realty: 'monthly',
  mna: { count: 0, opCostMultiplier: 1.0 },
  cartel: { active: false, bustedCount: 0 },
  economy: { phase: 'stable', turnsLeft: ECO_PHASE_DURATION.stable },
  profitHistory: [],
  cumulativeProfit: 0,
  lastTurnResult: null,
  inventoryUnits: 0,
  inventoryLots: [],
  creditGrade: 'D',
  effectiveInterestRate: 0,
  deficitStreak: 0,
  deficitRatePenalty: 0,
  activeEffects: [],
  _storyShown: {},
  _docDemandMul: 0,
  _lastDocResult: null,
  _bsDemandMul: null,
  _bsType: null,
  _shutdownLeft: 0,
  _bsActive: null,
  _bsTurnsLeft: 0,
  _bsRecoveryLeft: 0,
  _bsRateShock: 0,
  _bsTriggerChance: C.BLACK_SWAN_START_PROB,
  _boomBonus: 0,
});

function calcProgressiveTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  let left = taxableIncome;
  let prev = 0;
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    const width = b.upTo - prev;
    const base = b.upTo === Infinity ? left : Math.min(left, width);
    if (base <= 0) break;
    tax += Math.round(base * b.rate);
    left -= base;
    prev = b.upTo;
    if (left <= 0) break;
  }
  return tax;
}

function makeRivals(count) {
  const archetypes = ['lowcost', 'premium', 'innovation', 'efficient'];
  return Array.from({ length: count }, (_, i) => {
    const archetype = archetypes[i % archetypes.length];
    return {
      name: ['라이벌 A', '라이벌 B', '라이벌 C', '라이벌 D'][i],
      capital: archetype === 'premium' ? 12_000_000 : 20_000_000,
      brandValue: archetype === 'premium' ? 30 : Math.floor(Math.random() * 20),
      priceResistance: archetype === 'premium' ? 0.03 : 0.02,
      marketShare: 0,
      archetype,
      ...RIVAL_ARCHETYPES[archetype],
      sellPrice: 0,
      qualityScore: archetype === 'lowcost' ? 90 : 80 + Math.floor(Math.random() * 60),
      bankrupt: false,
      bankruptTurn: 0,
      attraction: 0,
    };
  });
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useGameStore = create((set, get) => ({
  // ── UI state ────────────────────────────────────────────────────────────────
  gamePhase: 'difficulty',   // 'difficulty' | 'playing'
  activeModal: null,         // 'report'|'finance'|'realty'|'mna'|'meta'|'news'|'story'|'gameover'|'blackswan'
  modalData: null,
  _resumeTurn: null,
  turnProcessing: false,
  toasts: [],
  logs: [],
  aiLoading: false,
  aiLoadingText: '',
  searchStatus: '',

  // ── Game state ───────────────────────────────────────────────────────────────
  ...INITIAL_GAME(),

  // ── Toast helpers ────────────────────────────────────────────────────────────
  addToast: (msg, type = 'info') => set(s => ({
    toasts: [...s.toasts, { id: Date.now() + Math.random(), msg, type }],
  })),
  removeToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Log helper ───────────────────────────────────────────────────────────────
  addLog: (msg, type = 'info') => {
    const turn = get().turn;
    const line = `[T${turn}] ${msg}`;
    if (type === 'bad') console.error(line);
    else if (type === 'warn') console.warn(line);
    else console.log(line);

    set(s => ({
      logs: [{ turn: s.turn, msg, type, id: Date.now() + Math.random() }, ...s.logs].slice(0, 40),
    }));
  },

  // ── Modal control ────────────────────────────────────────────────────────────
  openModal: (modal, data = null) => set({ activeModal: modal, modalData: data }),
  closeModal: () => {
    const resume = get()._resumeTurn;
    set({ activeModal: null, modalData: null, _resumeTurn: null });
    if (resume) resume();
  },

  // ── Difficulty selection ──────────────────────────────────────────────────────
  startGame: (diff) => {
    const cfg = DIFF_CONFIG[diff];
    const meta = loadMeta();
    const capBonus = Math.min(meta.capitalBonus || 0, C.META_CAPITAL_BONUS_MAX);
    const boomBonus = Math.min(meta.boomBonus || 0, C.META_BOOM_BONUS_MAX);
    const baseCapital = Math.round(cfg.capital * (1 + capBonus));
    const initialNW = baseCapital + 10_000_000 - cfg.debt;
    const initialGrade = calcCreditGrade(initialNW);
    const initialEffectiveRate = getLoanRateByGrade(cfg.interestRate, initialGrade, 0);

    const initGame = INITIAL_GAME();
    set({
      ...initGame,
      activeModal: null,
      modalData: null,
      _resumeTurn: null,
      turnProcessing: false,
      aiLoading: false,
      aiLoadingText: '',
      searchStatus: '',
      gamePhase: 'playing',
      difficulty: diff,
      capital: baseCapital,
      debt: cfg.debt,
      interestRate: cfg.interestRate,
      creditGrade: initialGrade,
      effectiveInterestRate: initialEffectiveRate,
      rivals: makeRivals(cfg.rivalCount),
      _boomBonus: boomBonus,
      logs: [{ turn: 0, msg: `게임 시작: ${DIFF_LABEL[diff]}`, type: 'info', id: Date.now() }],
      toasts: [],
    });
    if (capBonus > 0) get().addLog(`메타 보너스: 자본 +${(capBonus * 100).toFixed(1)}%`, 'good');
  },

  // ── Vendor search ─────────────────────────────────────────────────────────────
  searchItem: async (itemName) => {
    const s = get();
    if (s.aiLoading) return;
    const check = validateItemInput(itemName);
    if (!check.ok) {
      set({ searchStatus: `⛔ ${check.reason}` });
      get().addToast(check.reason, 'warn');
      return;
    }

    const cleanName = check.normalized;
    set({ aiLoading: true, aiLoadingText: `"${cleanName}" 분석 중…`, searchStatus: '⏳ 탐색 중…' });

    try {
      const result = await fetchWholesaleData(cleanName);
      set({
        wholesaleOptions: result.vendors,
        itemCategory: result.itemCategory,
        currentVendorTab: 'cheap',
        aiLoading: false,
        searchStatus: `✅ "${cleanName}" 분석 완료 — 업체 ${result.vendors.length}곳 제안`,
      });
      get().addLog(`AI 분석 완료 — 후보 ${result.vendors.length}곳`, 'good');
      get().addToast('후보 업체가 생성되었습니다. 직접 비교 후 선택하세요.', 'good');
    } catch (err) {
      const fallback = getOfflineVendors(cleanName);
      set({
        wholesaleOptions: fallback.vendors,
        itemCategory: fallback.itemCategory,
        currentVendorTab: 'cheap',
        aiLoading: false,
        searchStatus: `⚠️ 오프라인 모드: "${cleanName}"`,
      });
      get().addLog('API 오류 — 오프라인 데이터 사용', 'warn');
      get().addToast('API 연결 실패 → 오프라인 데이터로 대체', 'warn');
    }
  },

  // ── Vendor selection ──────────────────────────────────────────────────────────
  selectVendor: (vendor) => {
    set({ selectedVendor: vendor });
    get().addLog(`계약: ${vendor.name} — 단가 ${fmtW(vendor.unitCost)}`, 'info');
    get().addToast(`${vendor.name} 계약 완료!`, 'good');
  },

  setVendorTab: (tab) => set({ currentVendorTab: tab }),

  // ── Price ─────────────────────────────────────────────────────────────────────
  setSellPrice: (v) => set({ sellPrice: Math.max(0, parseInt(v) || 0) }),

  // ── HR ────────────────────────────────────────────────────────────────────────
  doSalesTrain: () => {
    const s = get();
    const st = s.salesTraining;
    if (st.usedThisTurn)                          { get().addToast('이번 달 영업 교육 완료 (1턴 1회 제한)', 'warn'); return; }
    if (st.count >= st.max)                       { get().addToast('영업 교육 최대 횟수 도달 (10회)', 'warn'); return; }
    if (s.capital < C.HR_TRAIN_COST)              { get().addToast('자금 부족 (50만원 필요)', 'warn'); return; }
    const brandP = Math.min(0.10, s.brandValue / 1000);
    const gain   = C.HR_SALES_GAIN + brandP;
    set(st2 => ({
      capital: st2.capital - C.HR_TRAIN_COST,
      priceResistance: Math.min(C.HR_RESIST_MAX, st2.priceResistance + gain),
      salesTraining: { ...st2.salesTraining, count: st2.salesTraining.count + 1, usedThisTurn: true },
      hr: { ...st2.hr, lastTrainTurn: st2.turn, totalTrainings: st2.hr.totalTrainings + 1 },
    }));
    const cnt = get().salesTraining.count;
    get().addLog(`영업 교육 완료 (${cnt}/10회)`, 'good');
    get().addToast(`영업 교육 완료 (${cnt}/10회)`, 'good');
  },

  doProdTrain: () => {
    const s = get();
    const pt = s.prodTraining;
    if (pt.usedThisTurn)                          { get().addToast('이번 달 생산 교육 완료 (1턴 1회 제한)', 'warn'); return; }
    if (pt.count >= pt.max)                       { get().addToast('생산 교육 최대 횟수 도달 (10회)', 'warn'); return; }
    if (s.capital < C.HR_TRAIN_COST)              { get().addToast('자금 부족 (50만원 필요)', 'warn'); return; }
    set(s2 => ({
      capital: s2.capital - C.HR_TRAIN_COST,
      factory: { ...s2.factory, accidentRisk: Math.max(0, (s2.factory.accidentRisk || 0) - C.HR_PROD_RISK_REDUCTION) },
      prodTraining: { ...s2.prodTraining, count: s2.prodTraining.count + 1, usedThisTurn: true },
      hr: { ...s2.hr, lastTrainTurn: s2.turn, totalTrainings: s2.hr.totalTrainings + 1 },
    }));
    const cnt = get().prodTraining.count;
    get().addLog(`생산 교육 완료 (${cnt}/10회) — 산재위험 -5%`, 'good');
    get().addToast(`생산 교육 완료 (${cnt}/10회)`, 'good');
  },

  doMarketing: (budget) => {
    const s = get();
    if (s.mktThisTurn)             { get().addToast('이번 달 마케팅 완료 (1턴 1회 제한)', 'warn'); return; }
    if (budget <= 0)               { get().addToast('마케팅 예산을 입력하세요', 'warn'); return; }
    if (budget < C.MARKETING_MIN_BUDGET) { get().addToast('최소 10만원 이상 입력하세요', 'warn'); return; }
    if (s.capital < budget)        { get().addToast(`현금 부족: ${fmtW(budget)} 필요`, 'warn'); return; }
    const brandGain     = calcMktBrandGain(budget);
    const awarenessGain = calcMktAwarenessGain(budget);
    set(s2 => ({
      capital: s2.capital - budget,
      brandValue: Math.min(1000, s2.brandValue + brandGain),
      marketing: {
        totalSpent: s2.marketing.totalSpent + budget,
        awarenessBonus: Math.min(0.30, (s2.marketing.awarenessBonus || 0) + awarenessGain),
      },
      mktThisTurn: true,
    }));
    get().addLog(`마케팅 ${fmtW(budget)} 집행 — 브랜드 +${brandGain.toFixed(1)}pt`, 'good');
    get().addToast(`마케팅 완료! 브랜드 +${brandGain.toFixed(1)}pt`, 'good');
  },

  // ── Factory ───────────────────────────────────────────────────────────────────
  buildFactory: () => {
    const s = get();
    if (s.factory.built)                          { get().addToast('이미 공장이 있습니다', 'warn'); return; }
    if (s.capital < C.FACTORY_BUILD_COST)         { get().addToast('자금 부족 (5억 필요)', 'warn'); return; }
    set(s2 => ({
      capital: s2.capital - C.FACTORY_BUILD_COST,
      factory: { ...s2.factory, built: true, buildTurnsLeft: C.FACTORY_BUILD_TURNS },
    }));
    get().addLog('공장 건설 시작! 3턴 후 완공 예정', 'good');
    get().addToast('공장 건설 시작 (3턴 소요)', 'good');
  },

  upgradeFactory: () => {
    const s = get();
    if (!s.factory.built)                         { get().addToast('공장 없음', 'warn'); return; }
    if (s.capital < C.FACTORY_UPGRADE_COST)       { get().addToast('자금 부족 (1억 필요)', 'warn'); return; }
    set(s2 => ({
      capital: s2.capital - C.FACTORY_UPGRADE_COST,
      factory: { ...s2.factory, upgradeLevel: s2.factory.upgradeLevel + 1 },
    }));
    get().addLog(`공장 업그레이드 Lv.${get().factory.upgradeLevel} — 품질 +20pt`, 'good');
    get().addToast('업그레이드 완료!', 'good');
  },

  changeProduct: () => {
    const s = get();
    if (!s.factory.built)                        { get().addToast('공장 없음', 'warn'); return; }
    if (s.capital < C.FACTORY_PRODUCT_COST)      { get().addToast('자금 부족 (5천만 필요)', 'warn'); return; }
    set(s2 => ({ capital: s2.capital - C.FACTORY_PRODUCT_COST, selectedVendor: null }));
    get().addLog('품목 변경 — 새 도매업체 탐색 필요', 'info');
    get().addToast('품목 변경 완료. 새 도매업체를 선택하세요.', 'info');
  },

  toggleSafety: () => {
    const s = get();
    if (!s.factory.built) return;
    const next = !s.factory.safetyOn;
    set(s2 => ({ factory: { ...s2.factory, safetyOn: next } }));
    get().addLog(next ? '안전관리비 활성화' : '안전관리비 비활성화 — 산재 위험 누적', next ? 'good' : 'warn');
    get().addToast(next ? '안전관리비 ON' : '안전관리비 OFF — 주의!', next ? 'good' : 'warn');
  },

  // ── Finance modal actions ─────────────────────────────────────────────────────
  borrow: (amount) => {
    const s = get();
    const nw = netWorth(s);
    const gr = calcCreditGrade(nw);
    const gc = CREDIT_GRADES[gr];
    const maxBorrow = gr === 'D'
      ? Math.max(0, gc.limitFixed - s.debt)
      : Math.max(0, Math.floor(nw * gc.limitRatio) - s.debt);
    if (amount <= 0 || amount > maxBorrow) { get().addToast('한도 초과 또는 잘못된 금액', 'warn'); return; }
    set(s2 => ({ capital: s2.capital + amount, debt: s2.debt + amount }));
    get().addLog(`대출 ${fmtW(amount)}`, 'info');
    get().addToast('대출 완료', 'good');
    get().closeModal();
  },

  repay: (amount) => {
    const s = get();
    if (amount <= 0 || amount > s.capital || amount > s.debt) { get().addToast('상환 금액이 잘못됐습니다', 'warn'); return; }
    set(s2 => ({ capital: s2.capital - amount, debt: s2.debt - amount }));
    get().addLog(`상환 ${fmtW(amount)}`, 'good');
    get().addToast('상환 완료', 'good');
    get().closeModal();
  },

  // ── Realty modal actions ──────────────────────────────────────────────────────
  changeRealty: (optId) => {
    const s = get();
    const curOpt = REALTY_DATA.find(r => r.id === s.realty);
    const newOpt = REALTY_DATA.find(r => r.id === optId);
    if (!newOpt || !curOpt) return;
    const cost = newOpt.deposit - curOpt.deposit;
    if (s.capital < cost) { get().addToast(`현금 부족 (${fmtW(cost - s.capital)} 부족)`, 'warn'); return; }
    set(s2 => ({ capital: s2.capital - cost, realty: optId, propertyValue: newOpt.assetVal }));
    get().addLog(`부동산 변경: ${curOpt.label} → ${newOpt.label}`, 'good');
    get().addToast(`${newOpt.label} 변경 완료`, 'good');
    get().closeModal();
  },

  // ── M&A ───────────────────────────────────────────────────────────────────────
  executeMna: () => {
    const s = get();
    if (s.difficulty !== 'hard' && s.difficulty !== 'insane') { get().addToast('하드/인세인 전용', 'warn'); return; }
    const nw   = netWorth(s);
    const cost = Math.max(5_000_000, Math.round(nw * 0.15));
    if (s.capital < cost) { get().addToast(`현금 부족 (${fmtW(cost - s.capital)} 부족)`, 'warn'); return; }

    const r = Math.random();
    let outcome, msg;
    set(s2 => {
      const base = { capital: s2.capital - cost, mna: { ...s2.mna, count: s2.mna.count + 1 } };
      if (r < 0.40) {
        outcome = 'win'; msg = 'M&A 성공! 점유율+8%, 브랜드+10';
        const tgtIdx = s2.rivals.findIndex(rv => !rv.bankrupt);
        const newRivals = tgtIdx >= 0
          ? s2.rivals.map((rv, i) => i === tgtIdx ? { ...rv, bankrupt: true, bankruptTurn: s2.turn } : rv)
          : s2.rivals;
        return { ...base, marketShare: Math.min(1, s2.marketShare + 0.08), brandValue: s2.brandValue + 10, rivals: newRivals };
      } else if (r < 0.75) {
        outcome = 'mid'; msg = 'M&A 유지: 점유율+3%, 운영비+20%';
        return { ...base, marketShare: Math.min(1, s2.marketShare + 0.03), mna: { ...base.mna, opCostMultiplier: Math.min(3, s2.mna.opCostMultiplier * 1.20) } };
      } else {
        outcome = 'loss'; msg = 'M&A 실패! 부채+3억, 운영비+50%';
        return { ...base, debt: s2.debt + 300_000_000, mna: { ...base.mna, opCostMultiplier: Math.min(3, s2.mna.opCostMultiplier * 1.50) } };
      }
    });
    get().addLog(msg, outcome === 'win' ? 'good' : outcome === 'mid' ? 'warn' : 'bad');
    get().addToast(msg, outcome === 'win' ? 'good' : outcome === 'mid' ? 'warn' : 'bad');
    get().closeModal();
    get()._checkBankruptcy();
  },

  // ── Cartel ────────────────────────────────────────────────────────────────────
  toggleCartel: () => {
    const s = get();
    if (s.difficulty !== 'hard' && s.difficulty !== 'insane') { get().addToast('하드/인세인 전용', 'warn'); return; }
    const next = !s.cartel.active;
    set(s2 => ({ cartel: { ...s2.cartel, active: next } }));
    get().addLog(next ? '담합 활성화' : '담합 해제', 'warn');
    get().addToast(next ? '담합 활성화!' : '담합 해제', 'warn');
  },

  // ── Meta modal ───────────────────────────────────────────────────────────────
  resetMeta: () => {
    saveMeta({ ...META_DEF });
    get().addToast('메타 초기화 완료', 'info');
    get().openModal('meta');
  },

  // ── Internal: bankruptcy check ────────────────────────────────────────────────
  _checkBankruptcy: () => {
    const s = get();
    if (s.gameStatus !== 'playing') return false;
    const last4    = s.profitHistory.slice(-C.BANKRUPTCY_CONSEC_MONTHS);
    const consec   = last4.length >= C.BANKRUPTCY_CONSEC_MONTHS && last4.every(p => p < 0) && s.capital <= 0 && s.debt > 0;
    const insolvent = netWorth(s) < C.BANKRUPTCY_INSOLVENCY_NW;
    if (consec || insolvent) {
      set({ gameStatus: 'bankrupt' });
      get()._recordMetaEnd('bankrupt');
      get().openModal('gameover', { type: 'bankrupt' });
      return true;
    }
    return false;
  },

  _recordMetaEnd: (type) => {
    const m = loadMeta();
    m.plays++;
    if (type === 'bankrupt' || type === 'hostile') {
      m.bankrupts++;
      m.capitalBonus = Math.min((m.capitalBonus || 0) + C.META_CAPITAL_BONUS_PER_BANKRUPT, C.META_CAPITAL_BONUS_MAX);
    }
    if (type === 'clear') {
      m.clears++;
      m.boomBonus = Math.min((m.boomBonus || 0) + C.META_BOOM_BONUS_PER_CLEAR, C.META_BOOM_BONUS_MAX);
    }
    saveMeta(m);
  },

  // ── Internal: Black Swan ──────────────────────────────────────────────────────
  _checkBlackSwan: () => {
    const s = get();
    if (s.turn < C.BLACK_SWAN_START_TURN || s._bsActive || s.gameStatus !== 'playing') return;
    const chance = Math.min(1, s._bsTriggerChance || C.BLACK_SWAN_START_PROB);
    if (Math.random() < chance) {
      get()._triggerBlackSwan();
      return;
    }
    set({ _bsTriggerChance: Math.min(1, chance + C.BLACK_SWAN_PROB_STEP) });
  },

  _triggerBlackSwan: () => {
    const sw = BLACK_SWANS[Math.floor(Math.random() * BLACK_SWANS.length)];
    set(s2 => {
      let extra = {
        _bsActive: sw,
        _bsTurnsLeft: C.BLACK_SWAN_TURNS,
        _bsRecoveryLeft: 0,
        _bsDemandMul: C.BLACK_SWAN_DEMAND_MUL,
        _bsRateShock: C.BLACK_SWAN_RATE_SHOCK,
        _bsTriggerChance: C.BLACK_SWAN_START_PROB,
      };
      if (sw.id === 'storm') {
        extra = {
          ...extra,
          economy: { phase: 'recession', turnsLeft: Math.max(ECO_PHASE_DURATION.min, s2.economy.turnsLeft || ECO_PHASE_DURATION.recession) },
        };
      }
      return extra;
    });
    get().addLog(`블랙 스완: ${sw.title}`, 'bad');
    get().openModal('blackswan', sw);
  },

  _tickBlackSwan: () => {
    const s = get();
    if (!s._bsActive) {
      if (s._bsRecoveryLeft > 0) {
        const demandStep = (1 - C.BLACK_SWAN_DEMAND_MUL) / C.BLACK_SWAN_RECOVERY_TURNS;
        const rateStep = C.BLACK_SWAN_RATE_SHOCK / C.BLACK_SWAN_RECOVERY_TURNS;
        const nextRecovery = s._bsRecoveryLeft - 1;
        const nextDemandMul = Math.min(1, (s._bsDemandMul ?? 1) + demandStep);
        const nextRateShock = Math.max(0, (s._bsRateShock || 0) - rateStep);
        set({
          _bsRecoveryLeft: nextRecovery,
          _bsDemandMul: nextRecovery > 0 ? nextDemandMul : null,
          _bsRateShock: nextRecovery > 0 ? nextRateShock : 0,
        });
      }
      return false;
    }
    if (s._bsActive.id === 'pe') {
      if (netWorth(s) < 500_000_000) {
        set({ gameStatus: 'hostile' });
        get()._recordMetaEnd('hostile');
        get().openModal('gameover', { type: 'hostile' });
        return true;
      }
    }
    const newLeft = s._bsTurnsLeft - 1;
    if (newLeft <= 0) {
      set({
        _bsActive: null,
        _bsTurnsLeft: 0,
        _bsRecoveryLeft: C.BLACK_SWAN_RECOVERY_TURNS,
      });
      get().addLog(`블랙 스완 종료: ${s._bsActive.title}`, 'good');
    } else {
      set({ _bsTurnsLeft: newLeft });
    }
    return false;
  },

  // ── Main turn flow ────────────────────────────────────────────────────────────
  runTurn: async () => {
    const s = get();
    if (!s.selectedVendor || s.sellPrice <= 0) return;
    if (s.gameStatus !== 'playing') return;
    if (s.turnProcessing) return;

    set({ turnProcessing: true });

    // Tick effects
    set(s2 => ({
      activeEffects: s2.activeEffects
        .map(e => ({ ...e, turnsLeft: e.turnsLeft - 1 }))
        .filter(e => e.turnsLeft > 0),
    }));

    // Story events
    const storyTurn = [1, 37, 81, 111].find(t => t === s.turn && !s._storyShown?.[t]);
    if (storyTurn) {
      set(s2 => ({ _storyShown: { ...s2._storyShown, [storyTurn]: true } }));
      await new Promise(resolve => set({ activeModal: 'story', modalData: STORIES[storyTurn], _resumeTurn: resolve }));
    }

    // Advance economy
    const curState = get();
    const nextEconomy = advanceEconomy(curState.economy, curState._boomBonus || 0, curState._bsActive?.id === 'storm');
    set({ economy: nextEconomy });

    // Black swan
    get()._checkBlackSwan();
    const gameEnded = get()._tickBlackSwan();
    if (gameEnded || get().gameStatus !== 'playing') { set({ turnProcessing: false }); return; }

    // Dumping effect: rivals sell at cost × 0.5
    const curS = get();
    if (curS._bsActive?.id === 'dumping') {
      set(s2 => ({
        rivals: s2.rivals.map(rv =>
          rv.bankrupt ? rv : { ...rv, sellPrice: Math.round((s2.selectedVendor?.unitCost || 30000) * 0.5) }
        ),
      }));
    }

    // Market share calculation
    const shareResult = calculateMarketShare(get(), type => getActiveEffectModifier(get().activeEffects, type));
    if (!shareResult) { set({ turnProcessing: false }); return; }

    // Turn result
    const result = calcTurnResult(get(), shareResult);
    const settleState = get();
    const turnGrade = calcCreditGrade(netWorth(settleState));

    // Cartel check
    let cartelFine = 0;
    const cs = get();
    if (cs.cartel?.active) {
      const boostedGross = Math.round(result.gross * C.CARTEL_REVENUE_MUL);
      result.gross = boostedGross;
      result.netProfit = result.gross - result.totalFixed;
      if (Math.random() < C.CARTEL_BUST_PROB) {
        cartelFine = C.CARTEL_FINE;
        set(s2 => ({ capital: s2.capital - cartelFine, cartel: { ...s2.cartel, active: false } }));
        get().addLog('공정위 적발! 과징금 5천만', 'bad');
        get().addToast('담합 적발! 과징금 5천만 원', 'bad');
      }
    }

    // Accident check
    let accPenalty = 0;
    const fs = get();
    if (result.factoryActive && !fs.factory.safetyOn) {
      const newRisk = Math.min(1, (fs.factory.accidentRisk || 0) + C.FACTORY_ACCIDENT_RISK_INC);
      set(s2 => ({ factory: { ...s2.factory, accidentRisk: newRisk } }));
      if (Math.random() < get().factory.accidentRisk) {
        accPenalty = C.FACTORY_ACCIDENT_PENALTY;
        set(s2 => ({
          capital: s2.capital - accPenalty,
          _shutdownLeft: C.FACTORY_ACCIDENT_SHUTDOWN,
          factory: { ...s2.factory, accidentRisk: 0 },
        }));
        get().addLog('산업재해! -1억, 2턴 영업정지', 'bad');
        get().addToast('산업재해 발생!', 'bad');
      }
    }

    // Inventory aging / holding / disposal
    const baseLots = (get().inventoryLots || []).map(lot => ({
      ...lot,
      age: (lot.age || 0) + 1,
    }));
    if (result.plannedProduction > 0) {
      baseLots.push({ units: result.plannedProduction, age: 0, unitCost: result.netCost });
    }
    baseLots.sort((a, b) => b.age - a.age);

    let toSell = result.sold;
    const lotsAfterSell = [];
    for (const lot of baseLots) {
      if (toSell <= 0) {
        lotsAfterSell.push(lot);
        continue;
      }
      const used = Math.min(lot.units, toSell);
      toSell -= used;
      const left = lot.units - used;
      if (left > 0) lotsAfterSell.push({ ...lot, units: left });
    }

    let disposalPenalty = 0;
    let disposedUnits = 0;
    const keptLots = [];
    for (const lot of lotsAfterSell) {
      if (lot.age >= C.INVENTORY_DISPOSE_AGE) {
        disposedUnits += lot.units;
        disposalPenalty += Math.round(lot.units * lot.unitCost * C.INVENTORY_DISPOSE_PENALTY_RATE);
        continue;
      }
      keptLots.push(lot);
    }
    const inventoryUnits = keptLots.reduce((sum, lot) => sum + lot.units, 0);
    const staleUnits = keptLots
      .filter(lot => lot.age >= C.INVENTORY_BAD_AGE)
      .reduce((sum, lot) => sum + lot.units, 0);
    const inventoryHoldingCost = keptLots.reduce(
      (sum, lot) => sum + Math.round(lot.units * lot.unitCost * C.INVENTORY_HOLD_COST_RATE),
      0
    );

    // Policy event (small/frequent, capped to 15% of net worth)
    let policyDelta = 0;
    let policyTitle = '';
    const nwCap = Math.max(1_000_000, Math.round(Math.max(0, netWorth(get())) * C.POLICY_NETWORTH_CAP_RATE));
    if (Math.random() < C.POLICY_EVENT_PROB) {
      const family = Math.random() < 0.5 ? 'regulation' : 'subsidy';
      const pool = POLICY_EVENTS[family] || [];
      const ev = pool[Math.floor(Math.random() * pool.length)];
      if (ev) {
        const shock = ev.shockMin + Math.random() * (ev.shockMax - ev.shockMin);
        policyTitle = ev.title;
        policyDelta = Math.round(nwCap * shock) * (family === 'regulation' ? -1 : 1);
        if (ev.effect) {
          set(s2 => ({
            activeEffects: [...s2.activeEffects, { ...ev.effect }],
          }));
        }
        get().addLog(
          `정책 이벤트: ${policyTitle} ${policyDelta >= 0 ? '+' : ''}${fmtW(policyDelta)}`,
          policyDelta >= 0 ? 'good' : 'bad'
        );
      }
    }

    const preTaxProfit = result.netProfit - accPenalty - inventoryHoldingCost - disposalPenalty + policyDelta;
    const corporateTax = calcProgressiveTax(Math.max(0, preTaxProfit));
    const finalNetProfit = preTaxProfit - corporateTax;

    const prevDeficitStreak = settleState.deficitStreak || 0;
    const nextDeficitStreak = finalNetProfit < 0 ? prevDeficitStreak + 1 : 0;
    let nextDeficitPenalty = settleState.deficitRatePenalty || 0;
    if (nextDeficitStreak >= 2) {
      nextDeficitPenalty = Math.min(0.04, nextDeficitPenalty + 0.01);
    } else if (nextDeficitStreak === 0 && nextDeficitPenalty > 0) {
      nextDeficitPenalty = Math.max(0, nextDeficitPenalty - 0.01);
    }

    if (nextDeficitStreak >= 2 && nextDeficitStreak !== prevDeficitStreak) {
      get().addLog(`연속 적자 ${nextDeficitStreak}턴: 신용 경계 강화, 금리 가산 +${(nextDeficitPenalty * 100).toFixed(1)}%p`, 'warn');
    }
    if (prevDeficitStreak > 0 && nextDeficitStreak === 0) {
      get().addLog('적자 연속 상태 해소: 신용 경계 완화', 'good');
    }

    const settledEffectiveRate = getLoanRateByGrade(
      settleState.interestRate,
      turnGrade,
      (settleState._bsRateShock || 0) + nextDeficitPenalty
    );
    if (disposedUnits > 0) get().addLog(`악성 재고 강제 폐기 ${disposedUnits}개`, 'warn');

    // Apply financial changes
    set(s2 => ({
      capital: s2.capital + finalNetProfit,
      cumulativeProfit: s2.cumulativeProfit + finalNetProfit,
      profitHistory: [...s2.profitHistory, finalNetProfit].slice(-12),
      marketShare: shareResult.myShare,
      inventoryLots: keptLots,
      inventoryUnits,
      creditGrade: turnGrade,
      effectiveInterestRate: settledEffectiveRate,
      deficitStreak: nextDeficitStreak,
      deficitRatePenalty: nextDeficitPenalty,
      // Update rivals from share result
      rivals: (() => {
        const updRivals = s2.rivals.map(rv => {
          const updated = shareResult.updatedRivals?.find(r => r.name === rv.name);
          return updated ? { ...rv, ...updated } : rv;
        });
        // Process rival finances
        return updRivals.map(rv => {
          if (rv.bankrupt) return rv;
          const rvSold = Math.round(result.demand * (rv.marketShare || 0));
          const rvUnitCost = (s2.selectedVendor?.unitCost || 30000) * (rv.archetype === 'lowcost' ? 0.8 : 1.0);
          let rvProfit = rvSold * (rv.sellPrice - rvUnitCost) - 500_000;
          if (rv.archetype === 'innovation' && s2._bsActive && Math.random() < (rv.crisisBankruptRisk || 0.04)) {
            rvProfit -= 50_000_000;
          }
          const newCapital = (rv.capital || 20_000_000) + rvProfit;
          if (newCapital <= 0) return { ...rv, capital: 0, bankrupt: true, bankruptTurn: s2.turn };
          return { ...rv, capital: newCapital };
        });
      })(),
    }));

    // Process factory build progress
    set(s2 => {
      if (!s2.factory.built || s2.factory.buildTurnsLeft <= 0) return {};
      const left = s2.factory.buildTurnsLeft - 1;
      if (left === 0) get().addLog('공장 완공! 원가 -40%', 'good');
      return { factory: { ...s2.factory, buildTurnsLeft: left } };
    });

    // Shutdown progress
    if (get()._shutdownLeft > 0) set(s2 => ({ _shutdownLeft: s2._shutdownLeft - 1 }));

    // HR forgetting
    const hrs = get();
    const totalTrainCount = (hrs.salesTraining?.count || 0) + (hrs.prodTraining?.count || 0);
    if (totalTrainCount > 0) {
      const gap = hrs.turn - (hrs.hr.lastTrainTurn || 0);
      if (gap >= 3) {
        set(s2 => ({
          priceResistance: Math.max(0, s2.priceResistance - 0.02),
          brandValue: Math.max(0, s2.brandValue - Math.ceil(s2.brandValue * 0.02)),
        }));
        get().addLog('망각 곡선: 저항성/브랜드 감소', 'warn');
      }
    }

    // Rival lifecycle
    set(s2 => ({
      rivals: s2.rivals.map(rv => {
        if (!rv.bankrupt || !rv.bankruptTurn) return rv;
        if (s2.turn - rv.bankruptTurn < 2 + Math.floor(Math.random() * 2)) return rv;
        get().addLog(`${rv.name} 신규 경쟁사로 재진입!`, 'warn');
        const archetypes = ['lowcost', 'premium', 'innovation', 'efficient'];
        const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
        return {
          name: rv.name, capital: 15_000_000 + Math.floor(Math.random() * 15_000_000),
          brandValue: Math.floor(Math.random() * 15), priceResistance: 0.02, marketShare: 0,
          archetype,
          ...RIVAL_ARCHETYPES[archetype],
          sellPrice: 0, qualityScore: 70 + Math.floor(Math.random() * 70),
          bankrupt: false, bankruptTurn: 0, attraction: 0,
        };
      }),
    }));

    // Newly bankrupt rival log
    const prev = s.rivals;
    get().rivals.forEach(rv => {
      const was = prev.find(p => p.name === rv.name);
      if (rv.bankrupt && was && !was.bankrupt) get().addLog(`${rv.name} 파산!`, 'good');
    });

    // Check game end
    if (get()._checkBankruptcy()) { set({ turnProcessing: false }); return; }

    const finalS = get();
    if (finalS.turn >= finalS.maxTurns) {
      set({ gameStatus: 'clear' });
      get()._recordMetaEnd('clear');
      get().openModal('gameover', { type: 'clear' });
      set({ turnProcessing: false });
      return;
    }

    // Store result for report
    const reportData = {
      sold: result.sold,
      demand: result.demand,
      targetSold: result.targetSold,
      revenue: result.revenue,
      cogs: result.cogs,
      gross: result.gross,
      totalFixed: result.totalFixed,
      netProfit: finalNetProfit,
      corporateTax,
      inventoryHoldingCost,
      disposalPenalty,
      staleUnits,
      inventoryUnits,
      policyDelta,
      policyTitle,
      effectiveRate: settledEffectiveRate,
      creditGrade: turnGrade,
      deficitStreak: nextDeficitStreak,
      deficitRatePenalty: nextDeficitPenalty,
      priceDemandMul: result.priceDemandMul,
      monthlyInt: result.monthlyInt,
      realtyRent: result.realtyRent,
      safetyCost: result.safetyCost,
      cartelFine,
      accPenalty,
      shareResult,
      turn: get().turn,
    };

    get().addLog(`T${get().turn} | ${sign(finalNetProfit)} | 점유율 ${(shareResult.myShare * 100).toFixed(1)}% | 판매 ${result.sold}개`, finalNetProfit >= 0 ? 'good' : 'bad');

    // Advance turn counter and reset per-turn flags
    set(s2 => ({
      turn: s2.turn + 1,
      lastTurnResult: reportData,
      salesTraining: { ...s2.salesTraining, usedThisTurn: false },
      prodTraining:  { ...s2.prodTraining,  usedThisTurn: false },
      mktThisTurn: false,
      hr: { ...s2.hr, trainingThisTurn: 0 },
      _docDemandMul: 0,
    }));

    // Show report modal (async: waits for user to close)
    await new Promise(resolve => set({ activeModal: 'report', modalData: reportData, _resumeTurn: resolve }));

    set({ turnProcessing: false });
  },

  // ── Restart ───────────────────────────────────────────────────────────────────
  restart: () => set({
    ...INITIAL_GAME(),
    gamePhase: 'difficulty',
    activeModal: null,
    modalData: null,
    _resumeTurn: null,
    turnProcessing: false,
    toasts: [],
    logs: [],
    aiLoading: false,
    searchStatus: '',
  }),
}));
