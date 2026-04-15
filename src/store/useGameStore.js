import { create } from 'zustand';
import {
  C, EV, ECO_WEIGHTS, DIFF_CONFIG, DIFF_LABEL, STORIES,
  BLACK_SWANS, CREDIT_GRADES, REALTY_DATA, META_DEF, META_KEY,
  ECO_PHASE_DURATION, TAX_BRACKETS, POLICY_EVENTS, DIFF_EVENT_TUNING,
  ADVISOR_AVATAR, ADVISOR_LABEL, DIFF_DEMAND_ELASTICITY,
  CUSTOM_DIFFICULTY_LIMITS, DEFAULT_MAX_TURNS, ENDLESS_MODE,
  PLAY_HISTORY_KEY, RUN_CHECKPOINTS_KEY, RUN_SAVE_KEY,
  UI_SETTINGS_DEF, UI_SETTINGS_KEY,
} from '../constants.js';
import {
  calculateMarketShare, advanceEconomy, calcTurnResult, estimateBaseDemand,
  getActiveEffectModifier, calcMktBrandGain, calcMktAwarenessGain, getLoanRateByGrade,
} from '../calculations.js';
import { fetchWholesaleData, getOfflineVendors } from '../apiService.js';
import { DEEPSEEK_CONFIG } from '../config.js';
import {
  calcCreditGrade,
  netWorth,
  loadMeta,
  saveMeta,
  fmtW,
  sign,
  validateItemInput,
  getRunCycle,
  isCycleTransitionTurn,
  loadStorageJson,
  saveStorageJson,
} from '../utils.js';
import {
  getApprovalCardPreview,
  getQualityMeta,
  getTierMeta,
  guessIndustryTierFromName,
  pickApprovalCards,
  resolveApprovalChoice,
  syncRivalRoster,
} from '../designData.js';

function clampToRule(value, rule, fallback) {
  const parsed = Number(value);
  const numeric = Number.isFinite(parsed) ? parsed : fallback;
  const stepped = Math.round(numeric / rule.step) * rule.step;
  return Math.max(rule.min, Math.min(rule.max, stepped));
}

function buildChallengeConfig(diff = 'normal', options = {}) {
  const preset = DIFF_CONFIG[diff] ? diff : 'normal';
  const cfg = DIFF_CONFIG[preset];

  return {
    preset,
    startCapital: clampToRule(options.startCapital, CUSTOM_DIFFICULTY_LIMITS.capital, cfg.capital),
    startDebt: clampToRule(options.startDebt, CUSTOM_DIFFICULTY_LIMITS.debt, cfg.debt),
    interestRate: clampToRule(options.interestRate, CUSTOM_DIFFICULTY_LIMITS.interestRate, cfg.interestRate),
    rivalCount: clampToRule(options.rivalCount, CUSTOM_DIFFICULTY_LIMITS.rivalCount, cfg.rivalCount),
    demandElasticity: clampToRule(options.demandElasticity, CUSTOM_DIFFICULTY_LIMITS.demandElasticity, DIFF_DEMAND_ELASTICITY[preset] ?? 1),
    eventIntensity: clampToRule(options.eventIntensity, CUSTOM_DIFFICULTY_LIMITS.eventIntensity, 1),
    infiniteMode: Boolean(options.infiniteMode),
  };
}

function getEventTuning(state) {
  const base = DIFF_EVENT_TUNING[state.difficulty] || DIFF_EVENT_TUNING.normal;
  const challengeMul = state.challenge?.eventIntensity || 1;
  const cycle = getRunCycle(state.turn, state.maxTurns, state.challenge?.infiniteMode);
  const endlessMul = state.challenge?.infiniteMode
    ? 1 + (Math.max(0, cycle - 1) * ENDLESS_MODE.eventIntensityPerCycle)
    : 1;

  return {
    macroProbMul: base.macroProbMul * challengeMul * endlessMul,
    policyProbMul: base.policyProbMul * challengeMul * endlessMul,
    shockMul: base.shockMul * challengeMul * endlessMul,
  };
}

function getRivalSyncOptions(state, turn = state.turn) {
  return {
    rivalCount: state.challenge?.rivalCount,
    cycle: getRunCycle(turn, state.maxTurns, state.challenge?.infiniteMode),
    infiniteMode: state.challenge?.infiniteMode,
  };
}

function syncChallengeRivals(existingRivals = [], state, industryTier = state.industryTier, turn = state.turn) {
  return syncRivalRoster(existingRivals, state.difficulty, industryTier, turn, getRivalSyncOptions(state, turn));
}

function boostRivalsForEndlessCycle(rivals = []) {
  return rivals.map((rival) => {
    if (rival.bankrupt) return rival;
    return {
      ...rival,
      capital: (rival.capital || 0) + ENDLESS_MODE.rivalCapitalPerCycle,
      brandValue: Math.max(0, (rival.brandValue || 0) + ENDLESS_MODE.rivalBrandPerCycle),
      qualityScore: Math.min(260, (rival.qualityScore || 80) + ENDLESS_MODE.rivalQualityPerCycle),
      priceResistance: Math.min(0.12, (rival.priceResistance || 0.02) + ENDLESS_MODE.rivalResistancePerCycle),
    };
  });
}

// ── Initial state factory ─────────────────────────────────────────────────────
const loadUiSettings = () => ({ ...UI_SETTINGS_DEF, ...(loadStorageJson(UI_SETTINGS_KEY, {}) || {}) });
const loadRunSave = () => loadStorageJson(RUN_SAVE_KEY, null);
const loadRunCheckpoints = () => loadStorageJson(RUN_CHECKPOINTS_KEY, []);
const loadPlayHistory = () => loadStorageJson(PLAY_HISTORY_KEY, []);

const INITIAL_GAME = () => ({
  capital: 100_000_000,
  debt: 0,
  interestRate: 0.048,
  propertyValue: 10_000_000,
  brandValue: 0,
  priceResistance: 0,
  turn: 1,
  maxTurns: DEFAULT_MAX_TURNS,
  difficulty: null,
  challenge: buildChallengeConfig('normal'),
  runId: null,
  gameStatus: 'playing',
  industryTier: 1,
  itemTier: 1,
  qualityMode: 'standard',
  sellPrice: 0,
  plannedOrderUnits: 0,
  orderPlanMul: C.INVENTORY_PLAN_RATIO,
  monthlyFixedCost: C.MONTHLY_FIXED_COST,
  marketShare: 0,
  itemCategory: 'normal',
  wholesaleOptions: [],
  selectedVendor: null,
  currentVendorTab: 'cheap',
  rivals: [],
  factory: { built: false, buildTurnsLeft: 0, safetyOn: true, accidentRisk: 0, upgradeLevel: 0, productSelectionOpen: false },
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
  inflationIndex: C.INFLATION_BASE,
  deficitStreak: 0,
  deficitRatePenalty: 0,
  activeEffects: [],
  newsFeed: [],
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
  approvalCardPreview: [],
});

const SERIALIZED_GAME_KEYS = Object.keys(INITIAL_GAME());

function createRunSnapshot(state, label = '') {
  const runState = SERIALIZED_GAME_KEYS.reduce((acc, key) => {
    acc[key] = state[key];
    return acc;
  }, {});

  return {
    id: `${state.runId || `run-${Date.now()}`}-${state.turn}-${Date.now()}`,
    runId: state.runId,
    savedAt: new Date().toISOString(),
    label: label || `${DIFF_LABEL[state.difficulty] || '런'} · ${state.turn}개월 차`,
    turn: state.turn,
    difficulty: state.difficulty,
    infiniteMode: Boolean(state.challenge?.infiniteMode),
    runState,
    logs: (state.logs || []).slice(0, 40),
  };
}

function buildLoadedState(snapshot) {
  const initGame = INITIAL_GAME();
  return {
    ...initGame,
    ...(snapshot?.runState || {}),
    factory: {
      ...initGame.factory,
      ...(snapshot?.runState?.factory || {}),
    },
    logs: snapshot?.logs || [],
    gamePhase: 'playing',
    activeModal: null,
    modalData: null,
    _resumeTurn: null,
    turnProcessing: false,
    aiLoading: false,
    aiLoadingText: '',
    searchStatus: '',
    toasts: [],
  };
}

function buildHistoryEntry(state, outcome) {
  return {
    id: `${state.runId || `run-${Date.now()}`}-${outcome}-${Date.now()}`,
    endedAt: new Date().toISOString(),
    outcome,
    difficulty: state.difficulty,
    infiniteMode: Boolean(state.challenge?.infiniteMode),
    turn: Math.max(1, state.turn),
    maxTurns: state.maxTurns,
    capital: state.capital,
    cumulativeProfit: state.cumulativeProfit,
    marketShare: state.marketShare,
    industryTier: state.industryTier,
  };
}

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

function makeDesignRivals(difficulty, industryTier = 1, turn = 1, challenge = buildChallengeConfig(difficulty)) {
  return syncRivalRoster([], difficulty, industryTier, turn, {
    rivalCount: challenge?.rivalCount,
    cycle: getRunCycle(turn, DEFAULT_MAX_TURNS, challenge?.infiniteMode),
    infiniteMode: challenge?.infiniteMode,
  });
}

function clampShare(value) {
  return Math.max(0, Math.min(1, value));
}

function applyApprovalResolutionToState(state, resolution) {
  if (!resolution) return {};
  return {
    capital: state.capital + (resolution.capitalDelta || 0),
    debt: Math.max(0, state.debt + (resolution.debtDelta || 0)),
    brandValue: Math.max(0, state.brandValue + (resolution.brandDelta || 0)),
    priceResistance: Math.max(0, Math.min(C.HR_RESIST_MAX, state.priceResistance + (resolution.resistanceDelta || 0))),
    marketShare: clampShare((state.marketShare || 0) + (resolution.marketShareDelta || 0)),
    marketing: {
      ...(state.marketing || {}),
      awarenessBonus: Math.max(0, Math.min(C.MARKETING_AWARENESS_MAX, (state.marketing?.awarenessBonus || 0) + (resolution.awarenessDelta || 0))),
    },
    _docDemandMul: (state._docDemandMul || 0) + (resolution.docDemandMul || 0),
    activeEffects: [...(state.activeEffects || []), ...(resolution.activeEffects || [])],
    factory: {
      ...state.factory,
      safetyOn: resolution.forceSafetyOn ? true : state.factory.safetyOn,
      accidentRisk: Math.max(0, Math.min(1, (state.factory.accidentRisk || 0) + (resolution.accidentRiskDelta || 0))),
    },
    cartel: resolution.forceCartelOff ? { ...state.cartel, active: false } : state.cartel,
    rivals: (state.rivals || []).map((rival) => {
      if (rival.bankrupt) return rival;
      const capital = Math.max(0, (rival.capital || 0) + (resolution.rivalCapitalDelta || 0));
      return {
        ...rival,
        capital,
        qualityScore: Math.max(40, (rival.qualityScore || 80) + (resolution.rivalQualityDelta || 0)),
        bankrupt: capital <= 0 ? true : rival.bankrupt,
        bankruptTurn: capital <= 0 ? state.turn : rival.bankruptTurn,
      };
    }),
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useGameStore = create((set, get) => ({
  // ── UI state ────────────────────────────────────────────────────────────────
  gamePhase: 'splash',       // 'splash' | 'menu' | 'difficulty' | 'playing'
  activeModal: null,         // includes gameplay modals and menu utility modals
  modalData: null,
  _resumeTurn: null,
  turnProcessing: false,
  toasts: [],
  logs: [],
  aiLoading: false,
  aiLoadingText: '',
  searchStatus: '',
  settings: loadUiSettings(),
  continueSave: loadRunSave(),
  restorePoints: loadRunCheckpoints(),
  playHistory: loadPlayHistory(),

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

  _pushNews: (entry, openAsModal = false) => {
    const payload = {
      id: Date.now() + Math.random(),
      turn: get().turn,
      title: entry?.title || '시장 뉴스',
      body: entry?.body || '',
      type: entry?.type || 'neutral',
      icon: entry?.icon || '📰',
      tag: entry?.tag || 'general',
      effectDesc: entry?.effectDesc || '',
    };
    set(s => ({
      newsFeed: [payload, ...(s.newsFeed || [])].slice(0, 30),
    }));
    if (openAsModal) get().openModal('news', payload);
  },

  // ── Modal control ────────────────────────────────────────────────────────────
  openModal: (modal, data = null) => set({ activeModal: modal, modalData: data }),
  closeModal: () => {
    const resume = get()._resumeTurn;
    set({ activeModal: null, modalData: null, _resumeTurn: null });
    if (resume) resume();
  },

  finishSplash: () => {
    if (get().gamePhase !== 'splash') return;
    set({ gamePhase: 'menu' });
  },

  goToMenu: () => set({ gamePhase: 'menu', activeModal: null, modalData: null, _resumeTurn: null }),
  openNewGame: () => set({ gamePhase: 'difficulty', activeModal: null, modalData: null, _resumeTurn: null }),

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    saveStorageJson(UI_SETTINGS_KEY, next);
    set({ settings: next });
  },

  _persistCurrentRun: (label = '') => {
    const state = get();
    if (state.gamePhase !== 'playing' || state.gameStatus !== 'playing') return;
    const snapshot = createRunSnapshot(state, label);
    const nextCheckpoints = [
      snapshot,
      ...(state.restorePoints || []).filter((item) => item.turn !== snapshot.turn || item.runId !== snapshot.runId),
    ].slice(0, 12);
    saveStorageJson(RUN_SAVE_KEY, snapshot);
    saveStorageJson(RUN_CHECKPOINTS_KEY, nextCheckpoints);
    set({ continueSave: snapshot, restorePoints: nextCheckpoints });
  },

  _clearCurrentRunSave: () => {
    saveStorageJson(RUN_SAVE_KEY, null);
    set({ continueSave: null });
  },

  continueGame: () => {
    const snapshot = get().continueSave || loadRunSave();
    if (!snapshot) {
      get().addToast('이어할 저장 데이터가 없습니다.', 'warn');
      return;
    }
    set(buildLoadedState(snapshot));
    get()._persistCurrentRun(snapshot.label);
  },

  restoreCheckpoint: (checkpointId) => {
    const snapshot = (get().restorePoints || []).find((item) => item.id === checkpointId);
    if (!snapshot) {
      get().addToast('선택한 저장 시점을 찾을 수 없습니다.', 'warn');
      return;
    }
    set(buildLoadedState(snapshot));
    get()._persistCurrentRun(snapshot.label);
  },

  refreshApprovalCards: () => {
    set({ approvalCardPreview: getApprovalCardPreview(get(), 3) });
  },

  chooseApprovalCard: (cardId, choiceId = 'act') => {
    const s = get();
    const cards = s.modalData?.cards || s.approvalCardPreview || [];
    const selected = cards.find((card) => card.id === cardId);
    if (!selected) return;
    const result = resolveApprovalChoice(selected, choiceId, s);
    if (!result) return;

    const tone = result.tone === 'good'
      ? 'good'
      : result.tone === 'bad'
        ? 'bad'
        : result.tone === 'warn'
          ? 'warn'
          : 'info';

    set((state) => ({
      ...applyApprovalResolutionToState(state, result.resolution),
      activeModal: 'docresult',
      modalData: result,
    }));
    get().addLog(`결재: ${selected.title} - ${result.title}`, tone);
    get().addToast(result.title, tone);
  },

  // ── Difficulty selection ──────────────────────────────────────────────────────
  startGame: (diff, options = {}) => {
    const cfg = DIFF_CONFIG[diff];
    const challenge = buildChallengeConfig(diff, options);
    const runId = `run-${Date.now()}`;
    const meta = loadMeta();
    const capBonus = Math.min(meta.capitalBonus || 0, C.META_CAPITAL_BONUS_MAX);
    const boomBonus = Math.min(meta.boomBonus || 0, C.META_BOOM_BONUS_MAX);
    const initGame = INITIAL_GAME();
    const baseCapital = Math.round(challenge.startCapital * (1 + capBonus));
    const initialNW = baseCapital + initGame.propertyValue - challenge.startDebt;
    const initialGrade = calcCreditGrade(initialNW);
    const initialEffectiveRate = getLoanRateByGrade(challenge.interestRate, initialGrade, 0);
    const initialRivals = makeDesignRivals(diff, initGame.industryTier, initGame.turn, challenge);
    const initialPreview = getApprovalCardPreview({
      ...initGame,
      difficulty: diff,
      challenge,
      capital: baseCapital,
      debt: challenge.startDebt,
      interestRate: challenge.interestRate,
      creditGrade: initialGrade,
      effectiveInterestRate: initialEffectiveRate,
      rivals: initialRivals,
    });
    const isCustomRun = (
      challenge.startCapital !== cfg.capital
      || challenge.startDebt !== cfg.debt
      || challenge.interestRate !== cfg.interestRate
      || challenge.rivalCount !== cfg.rivalCount
      || challenge.demandElasticity !== (DIFF_DEMAND_ELASTICITY[diff] ?? 1)
      || challenge.eventIntensity !== 1
      || challenge.infiniteMode
    );
    const runLabel = [
      DIFF_LABEL[diff],
      isCustomRun ? '커스텀' : null,
      challenge.infiniteMode ? '무한모드' : null,
    ].filter(Boolean).join(' · ');

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
      challenge,
      runId,
      capital: baseCapital,
      debt: challenge.startDebt,
      interestRate: challenge.interestRate,
      creditGrade: initialGrade,
      effectiveInterestRate: initialEffectiveRate,
      rivals: initialRivals,
      approvalCardPreview: initialPreview,
      _boomBonus: boomBonus,
      logs: [{ turn: 0, msg: `게임 시작: ${runLabel}`, type: 'info', id: Date.now() }],
      toasts: [],
    });
    get()._persistCurrentRun(`${runLabel} · 시작`);
    if (capBonus > 0) get().addLog(`메타 보너스: 자본 +${(capBonus * 100).toFixed(1)}%`, 'good');
  },

  // ── Vendor search ─────────────────────────────────────────────────────────────
  searchItem: async (itemName) => {
    const s = get();
    if (s.aiLoading) return;
    if (s.factory?.built && s.factory?.buildTurnsLeft <= 0 && !s.factory?.productSelectionOpen) {
      set({ searchStatus: '현재 생산 라인이 고정되어 있습니다. 공장 업그레이드 후 새 라인을 열 수 있습니다.' });
      get().addToast('공장 라인이 고정되어 있습니다. 업그레이드 후 새 상품을 탐색하세요.', 'warn');
      return;
    }
    const check = validateItemInput(itemName);
    if (!check.ok) {
      set({ searchStatus: `⛔ ${check.reason}` });
      get().addToast(check.reason, 'warn');
      return;
    }

    const cleanName = check.normalized;
    const requiredTier = guessIndustryTierFromName(cleanName);
    if (requiredTier > s.industryTier) {
      const targetTier = getTierMeta(requiredTier);
      set({ searchStatus: `${targetTier.code} 시장 상품입니다. R&D 해금 후 다시 탐색할 수 있습니다.` });
      get().addToast(`${targetTier.name} 진입을 위해 산업 티어를 먼저 해금하세요.`, 'warn');
      return;
    }
    set({ aiLoading: true, aiLoadingText: `"${cleanName}" 분석 중…`, searchStatus: '⏳ 탐색 중…' });

    try {
      const result = await fetchWholesaleData(cleanName);
      const marketTier = result.itemTier || requiredTier;
      if (result.rejected) {
        set({
          wholesaleOptions: [],
          aiLoading: false,
          searchStatus: result.reason || '상위 산업 티어 해금이 필요합니다.',
        });
        get().addToast(result.reason || '상위 산업 티어 해금이 필요합니다.', 'warn');
        return;
      }
      set({
        wholesaleOptions: result.vendors,
        itemCategory: result.itemCategory,
        itemTier: marketTier,
        currentVendorTab: 'cheap',
        selectedVendor: null,
        sellPrice: 0,
        plannedOrderUnits: 0,
        aiLoading: false,
        searchStatus: `✅ "${cleanName}" 분석 완료 — 업체 ${result.vendors.length}곳 제안`,
      });
      get().addLog(`AI 분석 완료 — 후보 ${result.vendors.length}곳`, 'good');
      get().addToast('후보 업체가 생성되었습니다. 직접 비교 후 선택하세요.', 'good');
    } catch (err) {
      if (DEEPSEEK_CONFIG.enableOfflineFallback) {
        const fallback = getOfflineVendors(cleanName);
        set({
          wholesaleOptions: fallback.vendors,
          itemCategory: fallback.itemCategory,
          itemTier: requiredTier,
          currentVendorTab: 'cheap',
          selectedVendor: null,
          sellPrice: 0,
          plannedOrderUnits: 0,
          aiLoading: false,
          searchStatus: `⚠️ 오프라인 모드: "${cleanName}"`,
        });
        get().addLog('API 오류 — 오프라인 데이터 사용', 'warn');
        get().addToast('API 연결 실패 → 오프라인 데이터로 대체', 'warn');
        return;
      }

      set({
        wholesaleOptions: [],
        aiLoading: false,
        searchStatus: `⛔ 반려됨: API 연결 실패 (${cleanName})`,
      });
      get().addLog('API 오류 — 탐색 반려 처리', 'bad');
      get().addToast('탐색 반려: API 연결 실패', 'bad');
    }
  },

  // ── Vendor selection ──────────────────────────────────────────────────────────
  selectVendor: (vendor) => {
    const s = get();
    if (s.factory?.built && s.factory?.buildTurnsLeft <= 0 && !s.factory?.productSelectionOpen) {
      get().addToast('현재 생산 라인이 고정되어 있습니다. 공장 업그레이드 후 다시 선택하세요.', 'warn');
      return;
    }
    set((state) => ({
      selectedVendor: vendor,
      plannedOrderUnits: 0,
      sellPrice: 0,
      factory: state.factory?.productSelectionOpen
        ? { ...state.factory, productSelectionOpen: false }
        : state.factory,
      searchStatus: state.factory?.built && state.factory?.buildTurnsLeft <= 0
        ? `${vendor.name} 생산 라인 확정`
        : state.searchStatus,
    }));
    get().refreshApprovalCards();
    get().addLog(`계약: ${vendor.name} — 단가 ${fmtW(vendor.unitCost)}`, 'info');
    get().addToast(`${vendor.name} 계약 완료!`, 'good');
  },

  setVendorTab: (tab) => set({ currentVendorTab: tab }),

  // ── Price ─────────────────────────────────────────────────────────────────────
  setSellPrice: (v) => set({ sellPrice: Math.max(0, parseInt(v) || 0) }),
  setQualityMode: (mode) => {
    const s = get();
    if (!s.factory?.built || s.factory?.buildTurnsLeft > 0) return;
    set({ qualityMode: getQualityMeta(mode).id });
  },
  setPlannedOrderUnits: (value) => set({ plannedOrderUnits: Math.max(0, Math.round(Number(value) || 0)) }),
  setOrderPlanMul: (v) => set({
    orderPlanMul: Math.max(C.INVENTORY_PLAN_MIN_RATIO, Math.min(C.INVENTORY_PLAN_MAX_RATIO, Number(v) || C.INVENTORY_PLAN_RATIO)),
  }),
  unlockIndustryTier: () => {
    const s = get();
    const nextTierId = (s.industryTier || 1) + 1;
    const nextTier = getTierMeta(nextTierId);
    if (!nextTier || !nextTier.unlockCost) {
      get().addToast('이미 최고 산업 티어입니다.', 'warn');
      return;
    }
    if (s.capital < nextTier.unlockCost) {
      get().addToast(`${nextTier.code} 해금 자금이 부족합니다.`, 'warn');
      return;
    }

    set((state) => ({
      capital: state.capital - nextTier.unlockCost,
      industryTier: nextTier.id,
      rivals: syncChallengeRivals(state.rivals, state, nextTier.id, state.turn),
    }));
    get().addLog(`${nextTier.code} 산업 티어 해금`, 'good');
    get().addToast(`${nextTier.name} 시장이 열렸습니다.`, 'good');
    get().refreshApprovalCards();
  },

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
    if (!s.selectedVendor)                        { get().addToast('먼저 현재 생산 라인을 정한 뒤 공장을 설립하세요.', 'warn'); return; }
    if (s.capital < C.FACTORY_BUILD_COST)         { get().addToast('자금 부족 (5억 필요)', 'warn'); return; }
    set(s2 => ({
      capital: s2.capital - C.FACTORY_BUILD_COST,
      factory: { ...s2.factory, built: true, buildTurnsLeft: C.FACTORY_BUILD_TURNS, productSelectionOpen: false },
    }));
    get().addLog('공장 건설 시작! 3턴 후 완공 예정', 'good');
    get().addToast('공장 건설 시작 (3턴 소요)', 'good');
  },

  upgradeFactory: () => {
    const s = get();
    if (!s.factory.built)                         { get().addToast('공장 없음', 'warn'); return; }
    if (s.factory.buildTurnsLeft > 0)            { get().addToast('공장 완공 후 업그레이드할 수 있습니다', 'warn'); return; }
    if (s.capital < C.FACTORY_UPGRADE_COST)       { get().addToast('자금 부족 (1억 필요)', 'warn'); return; }
    set(s2 => ({
      capital: s2.capital - C.FACTORY_UPGRADE_COST,
      selectedVendor: null,
      wholesaleOptions: [],
      sellPrice: 0,
      plannedOrderUnits: 0,
      searchStatus: '업그레이드 완료 — 새 생산 라인을 탐색할 수 있습니다.',
      factory: {
        ...s2.factory,
        upgradeLevel: s2.factory.upgradeLevel + 1,
        productSelectionOpen: true,
      },
    }));
    get().addLog(`공장 업그레이드 Lv.${get().factory.upgradeLevel} — 새 생산 라인 선택 가능`, 'good');
    get().addToast('업그레이드 완료! 새 라인을 고를 수 있습니다.', 'good');
  },

  changeProduct: () => {
    const s = get();
    if (!s.factory.built)                        { get().addToast('공장 없음', 'warn'); return; }
    if (s.factory.buildTurnsLeft > 0)           { get().addToast('공장 완공 후 품목을 변경할 수 있습니다', 'warn'); return; }
    if (s.capital < C.FACTORY_PRODUCT_COST)      { get().addToast('자금 부족 (5천만 필요)', 'warn'); return; }
    set(s2 => ({
      capital: s2.capital - C.FACTORY_PRODUCT_COST,
      selectedVendor: null,
      sellPrice: 0,
      plannedOrderUnits: 0,
      wholesaleOptions: [],
      searchStatus: '라인 재편 완료 — 새 생산 라인을 탐색할 수 있습니다.',
      factory: { ...s2.factory, productSelectionOpen: true },
    }));
    get().addLog('라인 재편 완료 — 새 생산 라인 탐색 필요', 'info');
    get().addToast('라인 재편 완료. 새 상품을 선택하세요.', 'info');
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
    const state = get();
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
    const nextHistory = [buildHistoryEntry(state, type), ...(state.playHistory || [])].slice(0, 24);
    saveStorageJson(PLAY_HISTORY_KEY, nextHistory);
    set({ playHistory: nextHistory });
    get()._clearCurrentRunSave();
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
    const demandMul = sw.demandMul ?? 1;
    const rateShock = sw.rateShock ?? 0;
    set(s2 => {
      let extra = {
        _bsActive: sw,
        _bsTurnsLeft: sw.duration || C.BLACK_SWAN_TURNS,
        _bsRecoveryLeft: 0,
        _bsDemandMul: demandMul < 1 ? demandMul : null,
        _bsRateShock: rateShock,
        _bsTriggerChance: C.BLACK_SWAN_START_PROB,
      };
      if (sw.forcePhase === 'recession') {
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
        const currentDemandMul = s._bsDemandMul ?? 1;
        const currentRateShock = s._bsRateShock || 0;
        const nextRecovery = s._bsRecoveryLeft - 1;
        const nextDemandMul = currentDemandMul < 1
          ? Math.min(1, currentDemandMul + ((1 - currentDemandMul) / s._bsRecoveryLeft))
          : 1;
        const nextRateShock = currentRateShock > 0
          ? Math.max(0, currentRateShock - (currentRateShock / s._bsRecoveryLeft))
          : 0;
        set({
          _bsRecoveryLeft: nextRecovery,
          _bsDemandMul: nextRecovery > 0 && nextDemandMul < 1 ? nextDemandMul : null,
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
      const recoveryNeeded = (s._bsDemandMul ?? 1) < 1 || (s._bsRateShock || 0) > 0;
      set({
        _bsActive: null,
        _bsTurnsLeft: 0,
        _bsRecoveryLeft: recoveryNeeded ? C.BLACK_SWAN_RECOVERY_TURNS : 0,
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
    if (!s.selectedVendor || s.sellPrice <= 0 || (s.plannedOrderUnits || 0) <= 0) return;
    if (s.gameStatus !== 'playing') return;
    if (s.turnProcessing) return;

    set({ turnProcessing: true });
    let queuedNews = null;

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
    if (nextEconomy.phase !== curState.economy.phase) {
      const phaseNames = { boom: '호황기', stable: '평시', recession: '불황기' };
      queuedNews = {
        title: `경기 국면 전환: ${phaseNames[curState.economy.phase] || '평시'} → ${phaseNames[nextEconomy.phase] || '평시'}`,
        body: `시장 심리와 수요 구조가 변하고 있습니다. 다음 ${nextEconomy.turnsLeft}턴 동안 ${phaseNames[nextEconomy.phase] || '평시'} 기조가 유지됩니다.`,
        type: nextEconomy.phase === 'recession' ? 'bad' : nextEconomy.phase === 'boom' ? 'good' : 'neutral',
        icon: nextEconomy.phase === 'recession' ? '📉' : nextEconomy.phase === 'boom' ? '🚀' : '🧭',
        tag: 'macro',
      };
      get()._pushNews(queuedNews, false);
    }

    // Black swan
    get()._checkBlackSwan();
    const gameEnded = get()._tickBlackSwan();
    if (gameEnded || get().gameStatus !== 'playing') { set({ turnProcessing: false }); return; }

    const diffTuning = getEventTuning(get());

    // Random macro news: expose rate/inflation shocks with temporary effects
    if (Math.random() < (C.MACRO_NEWS_PROB * diffTuning.macroProbMul)) {
      const macroNewsPool = [
        {
          title: '중앙은행 긴축 시사',
          body: '시장 금리 인상 기대가 확대되며 자금 조달 부담이 커집니다.',
          icon: '🏦',
          type: 'bad',
          inflationDelta: 2,
          effect: { type: EV.INTEREST, value: 0.01, turnsLeft: 2, source: 'macro_tightening' },
        },
        {
          title: '원자재 가격 급등',
          body: '원가 압박이 확대되어 물가가 상승합니다.',
          icon: '📈',
          type: 'bad',
          inflationDelta: 4,
          effect: { type: EV.COST_MUL, value: 0.04, turnsLeft: 2, source: 'macro_raw_material' },
        },
        {
          title: '소비 진작책 발표',
          body: '민간 소비 심리가 개선되어 단기 수요가 살아납니다.',
          icon: '🛍️',
          type: 'good',
          inflationDelta: 1,
          effect: { type: EV.MARKET_MUL, value: 0.08, turnsLeft: 2, source: 'macro_stimulus' },
        },
        {
          title: '물가 안정 신호',
          body: '인플레이션 압력이 완화되어 금리 부담이 일부 낮아집니다.',
          icon: '🧊',
          type: 'good',
          inflationDelta: -3,
          effect: { type: EV.INTEREST, value: -0.005, turnsLeft: 2, source: 'macro_disinflation' },
        },
      ];
      const m = macroNewsPool[Math.floor(Math.random() * macroNewsPool.length)];
      const tunedInflationDelta = Math.round(m.inflationDelta * diffTuning.shockMul);
      const tunedEffect = {
        ...m.effect,
        value: typeof m.effect.value === 'number' ? m.effect.value * diffTuning.shockMul : m.effect.value,
      };
      set(s2 => ({
        activeEffects: [...s2.activeEffects, tunedEffect],
        inflationIndex: Math.max(C.INFLATION_MIN, Math.min(C.INFLATION_MAX, (s2.inflationIndex || C.INFLATION_BASE) + tunedInflationDelta)),
      }));
      const macroNews = {
        title: m.title,
        body: m.body,
        effectDesc: `물가 지수 ${tunedInflationDelta >= 0 ? '+' : ''}${tunedInflationDelta} / 임시효과 ${tunedEffect.turnsLeft}턴`,
        type: m.type,
        icon: m.icon,
        tag: 'macro',
      };
      get()._pushNews(macroNews, false);
      queuedNews = queuedNews || macroNews;
      get().addLog(`거시 뉴스: ${m.title}`, m.type === 'good' ? 'good' : 'warn');
    }

    // Dumping effect: rivals sell at cost × 0.5
    const curS = get();
    if (curS._bsActive?.id === 'dumping') {
      set(s2 => ({
        rivals: s2.rivals.map(rv =>
          rv.bankrupt ? rv : { ...rv, sellPrice: Math.round((s2.selectedVendor?.unitCost || 30000) * 0.5) }
        ),
      }));
    }

    const approvalCards = pickApprovalCards(get(), 3);
    set({ approvalCardPreview: approvalCards });
    await new Promise(resolve => set({
      activeModal: 'approval',
      modalData: { cards: approvalCards },
      _resumeTurn: resolve,
    }));

    // Market share calculation
    const shareResult = calculateMarketShare(get(), type => getActiveEffectModifier(get().activeEffects, type));
    if (!shareResult) { set({ turnProcessing: false }); return; }

    // Turn result
    const result = calcTurnResult(get(), shareResult);
    const settleState = get();

    // Cartel check
    let cartelFine = 0;
    const cs = get();
    if (cs.cartel?.active) {
      const boostedGross = Math.round(result.gross * C.CARTEL_REVENUE_MUL);
      result.gross = boostedGross;
      result.netProfit = result.gross - result.totalFixed;
      if (Math.random() < C.CARTEL_BUST_PROB) {
        cartelFine = C.CARTEL_FINE;
        set(s2 => ({ cartel: { ...s2.cartel, active: false } }));
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
          _shutdownLeft: C.FACTORY_ACCIDENT_SHUTDOWN,
          factory: { ...s2.factory, accidentRisk: 0 },
        }));
        get().addLog('산업재해! -1억, 2턴 영업정지', 'bad');
        get().addToast('산업재해 발생!', 'bad');
      }
    }

    const disposalPenalty = result.disposalPenalty || 0;
    const disposedUnits = result.disposedUnits || 0;
    const inventoryUnits = 0;
    const staleUnits = 0;
    const inventoryHoldingCost = 0;

    // Policy event (small/frequent, capped to 15% of net worth)
    let policyDelta = 0;
    let policyTitle = '';
    const nwCap = Math.max(1_000_000, Math.round(Math.max(0, netWorth(get())) * C.POLICY_NETWORTH_CAP_RATE));
    if (Math.random() < (C.POLICY_EVENT_PROB * diffTuning.policyProbMul)) {
      const family = Math.random() < 0.5 ? 'regulation' : 'subsidy';
      const pool = POLICY_EVENTS[family] || [];
      const ev = pool[Math.floor(Math.random() * pool.length)];
      if (ev) {
        const shock = ev.shockMin + Math.random() * (ev.shockMax - ev.shockMin);
        const tunedShock = shock * diffTuning.shockMul;
        policyTitle = ev.title;
        policyDelta = Math.round(nwCap * tunedShock) * (family === 'regulation' ? -1 : 1);
        if (ev.effect) {
          const tunedPolicyEffect = {
            ...ev.effect,
            value: typeof ev.effect.value === 'number' ? ev.effect.value * diffTuning.shockMul : ev.effect.value,
          };
          set(s2 => ({
            activeEffects: [...s2.activeEffects, tunedPolicyEffect],
          }));
        }
        get().addLog(
          `정책 이벤트: ${policyTitle} ${policyDelta >= 0 ? '+' : ''}${fmtW(policyDelta)}`,
          policyDelta >= 0 ? 'good' : 'bad'
        );
        const policyNews = {
          title: `정책 속보: ${policyTitle}`,
          body: family === 'regulation'
            ? '정부 규제 강화 조치가 발표되었습니다. 단기 수익성과 비용 구조를 재점검하세요.'
            : '정부 지원 정책이 발표되었습니다. 투자 타이밍을 적극 활용하세요.',
          effectDesc: `${policyDelta >= 0 ? '+' : ''}${fmtW(policyDelta)} / 영향 상한: 순자산 15%`,
          type: policyDelta >= 0 ? 'good' : 'bad',
          icon: family === 'regulation' ? '🏛️' : '💸',
          tag: 'policy',
        };
        get()._pushNews(policyNews, false);
        queuedNews = policyNews;
      }
    }

    const preTaxProfit = result.netProfit - cartelFine - accPenalty - inventoryHoldingCost - disposalPenalty + policyDelta;
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

    const settledNetWorth = netWorth(settleState) + finalNetProfit;
    const settledCreditGrade = calcCreditGrade(settledNetWorth);
    const settledEffectiveRate = getLoanRateByGrade(
      settleState.interestRate,
      settledCreditGrade,
      (settleState._bsRateShock || 0) + nextDeficitPenalty
    );
    if (disposedUnits > 0) get().addLog(`악성 재고 강제 폐기 ${disposedUnits}개`, 'warn');

    // Automatic opportunity-cost comparison log (OEM vs R&D vs Marketing)
    const v = settleState.selectedVendor;
    if (v) {
      const oemDefect = Math.max(1.0, 14 - ((v.qualityScore || 80) / 10));
      const oemStability = (v.type || '').includes('고품질') ? 92 : (v.type || '').includes('변동') ? 66 : 82;
      const oemScore = Math.round(((v.qualityScore || 80) * 0.6) + (oemStability * 0.4) - (v.unitCost / 3000));
      const mktBudget = 10_000_000;
      const rdBudget = C.FACTORY_UPGRADE_COST;
      const mktBrand = calcMktBrandGain(mktBudget).toFixed(1);
      const mktAwareness = (calcMktAwarenessGain(mktBudget) * 100).toFixed(1);
      const actionTag = settleState.mktThisTurn
        ? '이번 턴 선택: 마케팅 집행'
        : settleState.factory?.upgradeLevel > (s.factory?.upgradeLevel || 0)
          ? '이번 턴 선택: R&D/설비 강화'
          : '이번 턴 선택: 보수 운영';
      get().addLog(
        `의사결정 비교 | OEM 점수 ${oemScore}(불량 ${oemDefect.toFixed(1)}%·납기 ${oemStability}%) | R&D ${fmtW(rdBudget)}→품질+20 | 마케팅 ${fmtW(mktBudget)}→브랜드+${mktBrand}/인지도+${mktAwareness}% | ${actionTag}`,
        'info'
      );
    }

    // Apply financial changes
    set(s2 => ({
      capital: s2.capital + finalNetProfit,
      cumulativeProfit: s2.cumulativeProfit + finalNetProfit,
      profitHistory: [...s2.profitHistory, finalNetProfit].slice(-12),
      marketShare: shareResult.myShare,
      inventoryLots: [],
      inventoryUnits: 0,
      creditGrade: settledCreditGrade,
      effectiveInterestRate: settledEffectiveRate,
      deficitStreak: nextDeficitStreak,
      deficitRatePenalty: nextDeficitPenalty,
      // Update rivals from share result
      rivals: (() => {
        const roster = syncChallengeRivals(s2.rivals, s2, s2.industryTier, s2.turn);
        const updRivals = roster.map(rv => {
          const updated = shareResult.updatedRivals?.find(r => r.name === rv.name);
          return updated ? { ...rv, ...updated } : rv;
        });
        // Process rival finances
        return updRivals.map(rv => {
          if (rv.bankrupt) return rv;
          const rvSold = Math.round(result.demand * (rv.marketShare || 0));
          const rvUnitCost = (s2.selectedVendor?.unitCost || 30000) * (
            rv.archetype === 'aggressive'
              ? 0.82
              : rv.archetype === 'premium'
                ? 1.10
                : rv.archetype === 'techmonopoly'
                  ? 1.25
                  : 0.95
          );
          let rvProfit = rvSold * (rv.sellPrice - rvUnitCost) - 500_000;
          if (rv.archetype === 'volatile' && Math.random() < 0.25) rvProfit -= 20_000_000;
          if (rv.archetype === 'premium' && s2.economy.phase === 'recession') rvProfit -= 15_000_000;
          if (rv.archetype === 'techmonopoly' && (s2.itemTier || 1) >= 3) rvProfit += 20_000_000;
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
      rivals: syncChallengeRivals(s2.rivals, s2, s2.industryTier, s2.turn).map(rv => {
        if (!rv.bankrupt || !rv.bankruptTurn) return rv;
        if (s2.turn - rv.bankruptTurn < 2 + Math.floor(Math.random() * 2)) return rv;
        get().addLog(`${rv.name} 신규 경쟁사로 재진입!`, 'warn');
        const revived = syncChallengeRivals([], s2, s2.industryTier, s2.turn)
          .find(item => item.archetype === rv.archetype);
        return revived ? { ...revived, name: rv.name } : rv;
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
    if (!finalS.challenge?.infiniteMode && finalS.turn >= finalS.maxTurns) {
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
      inflationIndex: get().inflationIndex,
      effectiveRate: settledEffectiveRate,
      creditGrade: settledCreditGrade,
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

    const nextTurnStartsCycle = finalS.challenge?.infiniteMode && isCycleTransitionTurn(finalS.turn + 1, finalS.maxTurns);

    // Advance turn counter and reset per-turn flags
    set(s2 => {
      const nextTurn = s2.turn + 1;
      const nextState = {
        turn: nextTurn,
        lastTurnResult: reportData,
        salesTraining: { ...s2.salesTraining, usedThisTurn: false },
        prodTraining:  { ...s2.prodTraining,  usedThisTurn: false },
        mktThisTurn: false,
        hr: { ...s2.hr, trainingThisTurn: 0 },
        plannedOrderUnits: 0,
        _docDemandMul: 0,
      };

      if (!(s2.challenge?.infiniteMode && isCycleTransitionTurn(nextTurn, s2.maxTurns))) {
        return nextState;
      }

      return {
        ...nextState,
        capital: s2.capital + ENDLESS_MODE.playerCapitalPerCycle,
        brandValue: Math.max(0, s2.brandValue + ENDLESS_MODE.playerBrandPerCycle),
        priceResistance: Math.min(C.HR_RESIST_MAX, s2.priceResistance + ENDLESS_MODE.playerResistancePerCycle),
        marketing: {
          ...s2.marketing,
          awarenessBonus: Math.min(C.MARKETING_AWARENESS_MAX, (s2.marketing?.awarenessBonus || 0) + ENDLESS_MODE.playerAwarenessPerCycle),
        },
        rivals: boostRivalsForEndlessCycle(s2.rivals),
      };
    });
    get().refreshApprovalCards();
    get()._persistCurrentRun(`T${get().turn} 체크포인트`);

    if (nextTurnStartsCycle) {
      const cycle = getRunCycle(get().turn, get().maxTurns, true);
      get().addLog(`무한 모드 ${cycle}사이클 돌입: 경쟁사와 본사가 함께 강해집니다.`, 'good');
      get().addToast(`무한 모드 ${cycle}사이클 시작`, 'good');
    }

    if (queuedNews) {
      await new Promise(resolve => set({ activeModal: 'news', modalData: queuedNews, _resumeTurn: resolve }));
    }

    // Show report modal (async: waits for user to close)
    await new Promise(resolve => set({ activeModal: 'report', modalData: reportData, _resumeTurn: resolve }));

    set({ turnProcessing: false });
  },

  // ── Restart ───────────────────────────────────────────────────────────────────
  restart: () => {
    get()._clearCurrentRunSave();
    set({
      ...INITIAL_GAME(),
      gamePhase: 'menu',
      activeModal: null,
      modalData: null,
      _resumeTurn: null,
      turnProcessing: false,
      toasts: [],
      logs: [],
      aiLoading: false,
      searchStatus: '',
    });
  },
}));
