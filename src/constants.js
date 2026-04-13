// ── Game constants ──────────────────────────────────────────────────────────
export const C = {
  HR_TRAIN_COST:             500_000,
  HR_SALES_GAIN:             0.02,
  HR_PROD_RISK_REDUCTION:    0.05,
  HR_MAX_TRAININGS:          10,
  HR_RESIST_MAX:             0.50,
  MARKETING_MIN_BUDGET:      100_000,
  MARKETING_AWARENESS_MAX:   0.30,

  FACTORY_BUILD_COST:        500_000_000,
  FACTORY_UPGRADE_COST:      100_000_000,
  FACTORY_PRODUCT_COST:       50_000_000,
  FACTORY_DISCOUNT:          0.60,
  FACTORY_BUILD_TURNS:       3,
  FACTORY_SAFETY_COST:       5_000_000,
  FACTORY_ACCIDENT_RISK_INC: 0.05,
  FACTORY_ACCIDENT_PENALTY:  100_000_000,
  FACTORY_ACCIDENT_SHUTDOWN: 2,

  BASE_DEMAND:               1000,
  DEMAND_REF_PRICE_MUL:      2.2,
  DEMAND_ELASTICITY:         1.0,
  DEMAND_MIN_MUL:            0.35,
  DEMAND_MAX_MUL:            1.80,

  INVENTORY_PLAN_RATIO:      1.10,
  INVENTORY_PLAN_MIN_RATIO:  0.70,
  INVENTORY_PLAN_MAX_RATIO:  1.60,
  INVENTORY_BAD_AGE:         3,
  INVENTORY_DISPOSE_AGE:     5,
  INVENTORY_HOLD_COST_RATE:  0.05,
  INVENTORY_DISPOSE_PENALTY_RATE: 0.10,

  MACRO_NEWS_PROB:           0.12,
  INFLATION_BASE:            100,
  INFLATION_MIN:             80,
  INFLATION_MAX:             180,

  MONTHLY_FIXED_COST:        500_000,
  REALTY_MONTHLY_RENT:       1_000_000,
  LOAN_MAX:                  1_000_000_000,

  CARTEL_REVENUE_MUL:        1.5,
  CARTEL_BUST_PROB:          0.15,
  CARTEL_FINE:               50_000_000,

  BANKRUPTCY_INSOLVENCY_NW:  -50_000_000,
  BANKRUPTCY_CONSEC_MONTHS:  4,

  BLACK_SWAN_START_TURN:     80,
  BLACK_SWAN_TURNS:          10,
  BLACK_SWAN_RECOVERY_TURNS: 3,
  BLACK_SWAN_START_PROB:     0.10,
  BLACK_SWAN_PROB_STEP:      0.10,
  BLACK_SWAN_DEMAND_MUL:     0.60,
  BLACK_SWAN_RATE_SHOCK:     0.30,

  META_CAPITAL_BONUS_PER_BANKRUPT: 0.005,
  META_CAPITAL_BONUS_MAX:         0.15,
  META_BOOM_BONUS_PER_CLEAR:      0.02,
  META_BOOM_BONUS_MAX:            0.20,

  EVENT_TRIGGER_PROB:        0.15,
  POLICY_EVENT_PROB:         0.05,
  POLICY_NETWORTH_CAP_RATE:  0.15,
};

export const DEFAULT_MAX_TURNS = 120;

export const CUSTOM_DIFFICULTY_LIMITS = {
  capital: { min: 10_000_000, max: 200_000_000, step: 10_000_000 },
  debt: { min: 0, max: 100_000_000, step: 10_000_000 },
  interestRate: { min: 0.03, max: 0.18, step: 0.002 },
  rivalCount: { min: 1, max: 4, step: 1 },
  demandElasticity: { min: 0.75, max: 1.55, step: 0.05 },
  eventIntensity: { min: 0.70, max: 1.60, step: 0.05 },
};

export const ENDLESS_MODE = {
  cycleLength: DEFAULT_MAX_TURNS,
  demandMulPerCycle: 0.06,
  eventIntensityPerCycle: 0.08,
  rivalAttractionPerCycle: 0.10,
  rivalCapitalPerCycle: 25_000_000,
  rivalBrandPerCycle: 8,
  rivalQualityPerCycle: 10,
  rivalResistancePerCycle: 0.004,
  playerCapitalPerCycle: 20_000_000,
  playerBrandPerCycle: 6,
  playerResistancePerCycle: 0.01,
  playerAwarenessPerCycle: 0.02,
};

// ── Effect type keys ────────────────────────────────────────────────────────
export const EV = {
  BRAND:       'brand_value',
  RESIST:      'price_resistance',
  COST_MUL:    'cost_reduction',
  HR_BOOST:    'hr_boost',
  MARKET_MUL:  'market_demand_mul',
  INTEREST:    'interest_rate',
  CAPITAL:     'capital_once',
  DEBT:        'debt_once',
  QUALITY:     'quality_bonus',
  SHUTDOWN:    'factory_shutdown',
  BRAND_DECAY: 'brand_decay',
  SHARE_BOOST: 'share_once',
};

// ── Economy ─────────────────────────────────────────────────────────────────
export const ECO_WEIGHTS = {
  essential: { boom: 0.9, stable: 1.0, recession: 1.3 },
  normal:    { boom: 1.2, stable: 1.0, recession: 0.8 },
  luxury:    { boom: 1.8, stable: 1.0, recession: 0.4 },
};

export const ECO_TRANSITIONS = {
  boom:      { boom: 0.20, stable: 0.65, recession: 0.15 },
  stable:    { boom: 0.70, stable: 0.00, recession: 0.30 },
  recession: { boom: 0.25, stable: 0.70, recession: 0.05 },
};

export const ECO_PHASE_DURATION = {
  boom: 3,
  stable: 5,
  recession: 4,
  min: 2,
};

export const ECO_RATE_ADJ = { boom: 0.02, stable: 0, recession: -0.015 };

export const ECO_META = {
  boom:      { icon: '🚀', name: '호황기', desc: '소비 심리 개선 · 수요 증가',    cls: 'eco-boom'      },
  stable:    { icon: '→',  name: '평시',   desc: '시장이 안정적으로 운영 중',   cls: 'eco-stable'    },
  recession: { icon: '↘', name: '불황기', desc: '경기 침체 · 수요 위축',       cls: 'eco-recession' },
};

// ── Credit grades ────────────────────────────────────────────────────────────
export const CREDIT_GRADES = {
  A: { minNW: 500_000_000, limitRatio: 2.0,  spread: 0.01, label: 'A등급' },
  B: { minNW: 100_000_000, limitRatio: 1.0,  spread: 0.03, label: 'B등급' },
  C: { minNW:  50_000_000, limitRatio: 0.5,  spread: 0.07, label: 'C등급' },
  D: { minNW:           0, limitFixed: 10_000_000, spread: 0.15, label: 'D등급' },
};

export const TAX_BRACKETS = [
  { upTo: 50_000_000, rate: 0.10 },
  { upTo: 200_000_000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
];

export const RIVAL_ARCHETYPES = {
  lowcost: {
    label: '저가 대량형',
    costMul: 0.80,
    qualityCap: 95,
    aggressiveness: 'high',
  },
  premium: {
    label: '프리미엄형',
    recessionResilience: 0.5,
    startSharePenalty: 0.6,
    aggressiveness: 'low',
  },
  innovation: {
    label: '혁신형',
    rdEfficiency: 1.5,
    crisisBankruptRisk: 0.06,
    aggressiveness: 'mid',
  },
  efficient: {
    label: '효율형',
    zeroInventoryCost: true,
    eventResilience: false,
    aggressiveness: 'mid',
  },
};

// ── Realty options ────────────────────────────────────────────────────────────
export const REALTY_DATA = [
  { id: 'monthly', label: '월세',    deposit:  10_000_000, monthly: 1_000_000,   assetVal:  10_000_000 },
  { id: 'jeonse',  label: '전세',    deposit: 100_000_000, monthly: 0,            assetVal: 100_000_000 },
  { id: 'owned',   label: '자가 소유', deposit: 500_000_000, monthly: 0,           assetVal: 500_000_000 },
];

// ── HQ stages ────────────────────────────────────────────────────────────────
export const HQ_STAGES = [
  { min: 500_000_000, emoji: '🏙️', stage: '대기업',    name: '도심 마천루'   },
  { min: 100_000_000, emoji: '🏬', stage: '성장기',    name: 'IT 빌딩'      },
  { min:  30_000_000, emoji: '🏢', stage: '초기 성장', name: '임대 사무실'  },
  { min:           0, emoji: '🏚️', stage: '창업 초기', name: '허름한 차고지' },
];

// ── Difficulty config ────────────────────────────────────────────────────────
export const DIFF_CONFIG = {
  easy:   { capital: 100_000_000, debt: 0,          interestRate: 0.048, rivalCount: 1 },
  normal: { capital:  50_000_000, debt: 0,          interestRate: 0.060, rivalCount: 2 },
  hard:   { capital:  30_000_000, debt: 0,          interestRate: 0.060, rivalCount: 3 },
  insane: { capital:  10_000_000, debt: 50_000_000, interestRate: 0.144, rivalCount: 3 },
};

export const DIFF_LABEL = { easy: '이지', normal: '노멀', hard: '하드', insane: '인세인' };

export const DIFF_DEMAND_ELASTICITY = {
  easy: 0.85,
  normal: 1.00,
  hard: 1.15,
  insane: 1.30,
};

export const DIFF_EVENT_TUNING = {
  easy: {
    macroProbMul: 0.80,
    policyProbMul: 0.80,
    shockMul: 0.75,
  },
  normal: {
    macroProbMul: 1.00,
    policyProbMul: 1.00,
    shockMul: 1.00,
  },
  hard: {
    macroProbMul: 1.20,
    policyProbMul: 1.15,
    shockMul: 1.15,
  },
  insane: {
    macroProbMul: 1.35,
    policyProbMul: 1.25,
    shockMul: 1.30,
  },
};

export const POLICY_EVENTS = {
  regulation: [
    {
      id: 'antitrust_fine',
      title: '독점 규제 과징금',
      shockMin: 0.03,
      shockMax: 0.08,
      effect: { type: EV.MARKET_MUL, value: -0.08, turnsLeft: 2, source: 'policy_antitrust' },
    },
    {
      id: 'safety_audit',
      title: '정부 특별 안전점검',
      shockMin: 0.02,
      shockMax: 0.05,
      effect: { type: EV.COST_MUL, value: 0.05, turnsLeft: 2, source: 'policy_safety' },
    },
    {
      id: 'environment_compliance',
      title: '환경 규제 준수비용',
      shockMin: 0.02,
      shockMax: 0.06,
      effect: { type: EV.COST_MUL, value: 0.04, turnsLeft: 3, source: 'policy_env' },
    },
  ],
  subsidy: [
    {
      id: 'employment_subsidy',
      title: '고용 보조금',
      shockMin: 0.03,
      shockMax: 0.08,
      effect: { type: EV.COST_MUL, value: -0.05, turnsLeft: 2, source: 'policy_employ' },
    },
    {
      id: 'r_and_d_grant',
      title: 'R&D 지원금',
      shockMin: 0.03,
      shockMax: 0.07,
      effect: { type: EV.QUALITY, value: 8, turnsLeft: 3, source: 'policy_rd' },
    },
    {
      id: 'investment_tax_credit',
      title: '투자세액공제',
      shockMin: 0.02,
      shockMax: 0.05,
      effect: { type: EV.MARKET_MUL, value: 0.06, turnsLeft: 2, source: 'policy_tax_credit' },
    },
  ],
};

// ── Stories ──────────────────────────────────────────────────────────────────
export const STORIES = {
  1:   { act: '프롤로그',        title: '작은 가게, 큰 꿈',    text: '당신은 창고 한 켠에서 첫 주문서를 펼쳤다.\n시장은 냉혹하다. 하지만 기회는 항상 있다.\n120개월 뒤, 캐피로그라는 이름이 시장을 지배할 것이다.' },
  37:  { act: '2막 — 성장의 고통', title: '라이벌이 나타났다',  text: '조용히 성장하던 당신 앞에 강력한 경쟁자가 등장했다.\n가격을 내리고, 품질을 올리고, 브랜드를 쌓아라.\n시장은 멈추는 자를 뒤처지게 만든다.' },
  81:  { act: '3막 — 거대한 파도', title: '블랙 스완의 경고',   text: '지평선 너머에서 뭔가가 다가오고 있다.\n예측 불가능한 사건이 시장을 뒤흔들 것이다.\n자본을 쌓고, 부채를 줄이고, 브랜드를 강화하라.' },
  111: { act: '피날레',           title: '마지막 10턴',        text: '이제 9턴이 남았다.\n당신이 쌓아온 모든 것이 이 마지막 순간에 시험받는다.\n끝까지 버텨라.' },
};

// ── Black swans ──────────────────────────────────────────────────────────────
export const BLACK_SWANS = [
  {
    id: 'dumping',
    title: '글로벌 덤핑 공세',
    sub: '거대 플랫폼이 원가 이하 판매를 시작했습니다!',
    effects: ['라이벌 판매가 → 원가 ×0.5', '시장 수요 -30%', '브랜드 가치가 핵심'],
    demandMul: 0.70,
    rateShock: 0,
    duration: C.BLACK_SWAN_TURNS,
    color: 'var(--purple)',
  },
  {
    id: 'pe',
    title: '사모펀드 적대적 인수',
    sub: '순자산 5억 미만이면 즉시 경영권 탈취!',
    effects: ['매 턴 순자산 < 5억 → 즉시 인수', '10턴 지속', '자산 확보로 방어'],
    demandMul: 1,
    rateShock: 0,
    duration: C.BLACK_SWAN_TURNS,
    color: 'var(--yellow)',
  },
  {
    id: 'storm',
    title: '금리 30% 퍼펙트 스톰',
    sub: '초긴급 금리 인상 + 경기 침체 동시 발생!',
    effects: ['기준 금리 +30%p (10턴)', '불황기 강제 고정', '시장 수요 -40%'],
    demandMul: C.BLACK_SWAN_DEMAND_MUL,
    rateShock: C.BLACK_SWAN_RATE_SHOCK,
    duration: C.BLACK_SWAN_TURNS,
    forcePhase: 'recession',
    color: 'var(--red)',
  },
];

// ── Advisor config ────────────────────────────────────────────────────────────
export const ADVISOR_AVATAR = { easy: '🤖', normal: '📋', hard: '📡', insane: '💀' };
export const ADVISOR_LABEL  = {
  easy:   'AI 비서 (Easy)',
  normal: '정보 담당관 (Normal)',
  hard:   '데이터 분석기 (Hard)',
  insane: '노이즈 오라클 (Insane)',
};

export const PIE_COLORS = ['#58A6FF','#FF6B6B','#51CF66','#FFD43B','#CC5DE8','#FF922B','#20C997'];

export const META_KEY = 'mm_v7_meta';
export const META_DEF = { bankrupts: 0, clears: 0, capitalBonus: 0, boomBonus: 0, plays: 0 };
