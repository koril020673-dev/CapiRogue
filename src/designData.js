import { EV } from './constants.js';

const safeNetWorth = (state) => (state.capital || 0) + (state.propertyValue || 0) - (state.debt || 0);
const safeCapital = (state) => Math.max(0, state.capital || 0);

const effect = (type, value, turnsLeft, label, positive, source) => ({
  type,
  value,
  turnsLeft,
  label,
  positive,
  source,
});

const choice = (id, label, outcomes) => ({ id, label, outcomes });

function combine(...parts) {
  return (state) => parts.reduce((acc, part) => {
    const next = typeof part === 'function' ? part(state) : part;
    if (!next) return acc;
    return {
      capitalDelta: (acc.capitalDelta || 0) + (next.capitalDelta || 0),
      debtDelta: (acc.debtDelta || 0) + (next.debtDelta || 0),
      brandDelta: (acc.brandDelta || 0) + (next.brandDelta || 0),
      resistanceDelta: (acc.resistanceDelta || 0) + (next.resistanceDelta || 0),
      awarenessDelta: (acc.awarenessDelta || 0) + (next.awarenessDelta || 0),
      marketShareDelta: (acc.marketShareDelta || 0) + (next.marketShareDelta || 0),
      docDemandMul: (acc.docDemandMul || 0) + (next.docDemandMul || 0),
      rivalCapitalDelta: (acc.rivalCapitalDelta || 0) + (next.rivalCapitalDelta || 0),
      rivalQualityDelta: (acc.rivalQualityDelta || 0) + (next.rivalQualityDelta || 0),
      accidentRiskDelta: (acc.accidentRiskDelta || 0) + (next.accidentRiskDelta || 0),
      activeEffects: [...(acc.activeEffects || []), ...(next.activeEffects || [])],
      forceSafetyOn: acc.forceSafetyOn || next.forceSafetyOn,
      forceCartelOff: acc.forceCartelOff || next.forceCartelOff,
    };
  }, {
    capitalDelta: 0,
    debtDelta: 0,
    brandDelta: 0,
    resistanceDelta: 0,
    awarenessDelta: 0,
    marketShareDelta: 0,
    docDemandMul: 0,
    rivalCapitalDelta: 0,
    rivalQualityDelta: 0,
    accidentRiskDelta: 0,
    activeEffects: [],
    forceSafetyOn: false,
    forceCartelOff: false,
  });
}

const addCapital = (value) => ({ capitalDelta: value });
const addCapitalFromCapital = (ratio, min = 0) => (state) => ({ capitalDelta: Math.max(min, Math.round(safeCapital(state) * ratio)) });
const addCapitalFromNetWorth = (ratio, min = 0) => (state) => ({ capitalDelta: Math.max(min, Math.round(Math.max(0, safeNetWorth(state)) * ratio)) });
const addDebt = (value) => ({ debtDelta: value });
const addBrand = (value) => ({ brandDelta: value });
const addResistance = (value) => ({ resistanceDelta: value });
const addAwareness = (value) => ({ awarenessDelta: value });
const addShare = (value) => ({ marketShareDelta: value });
const addDocDemand = (value) => ({ docDemandMul: value });
const hitRivals = (value) => ({ rivalCapitalDelta: value });
const hitRivalQuality = (value) => ({ rivalQualityDelta: value });
const addAccidentRisk = (value) => ({ accidentRiskDelta: value });
const forceSafetyOn = () => ({ forceSafetyOn: true });
const forceCartelOff = () => ({ forceCartelOff: true });
const addEffect = (kind, value, turnsLeft, label, positive, source) => ({
  activeEffects: [effect(kind, value, turnsLeft, label, positive, source)],
});

function outcome(title, desc, tone, apply) {
  return { title, desc, tone, apply };
}

function passiveCard({
  id,
  grade,
  title,
  summary,
  minTurn = 1,
  maxTurn = 120,
  tags = [],
  when,
  weight,
  actionLabel,
  actionOutcomes,
  safeLabel = '보류',
  safeOutcome,
}) {
  return {
    id,
    grade,
    title,
    summary,
    minTurn,
    maxTurn,
    tags,
    when,
    weight,
    choices: [
      choice('act', actionLabel, actionOutcomes),
      choice('hold', safeLabel, [safeOutcome || outcome('보수 운영', '변화 없이 넘긴다.', 'neutral', null)]),
    ],
  };
}

function gambleCard({
  id,
  grade,
  title,
  summary,
  minTurn = 1,
  tags = [],
  when,
  weight,
  actionLabel = '추진한다',
  successChance,
  success,
  failure,
  safeLabel = '보류한다',
  safeOutcome,
}) {
  return passiveCard({
    id,
    grade,
    title,
    summary,
    minTurn,
    tags,
    when,
    weight,
    actionLabel,
    actionOutcomes: [
      { chance: successChance, ...success },
      { chance: 1 - successChance, ...failure },
    ],
    safeLabel,
    safeOutcome,
  });
}

function stabilityCard({
  id,
  grade,
  title,
  summary,
  minTurn = 1,
  tags = [],
  when,
  weight,
  actionLabel = '선제 조치',
  paidOutcome,
  delayLabel = '미룬다',
  delayedOutcome,
}) {
  return {
    id,
    grade,
    title,
    summary,
    minTurn,
    tags,
    when,
    weight,
    choices: [
      choice('act', actionLabel, [{ chance: 1, ...paidOutcome }]),
      choice('hold', delayLabel, [{ chance: 1, ...delayedOutcome }]),
    ],
  };
}

export const INDUSTRY_TIERS = [
  { id: 1, code: 'T1', icon: '🧺', name: '기초 소비재', unlockCost: 0, marginText: '~15%', recessionDemandMul: 1.0, examples: ['생활용품', '식품'] },
  { id: 2, code: 'T2', icon: '🔧', name: '일반 경공업재', unlockCost: 50_000_000, marginText: '~30%', recessionDemandMul: 0.85, examples: ['소형 가전', '잡화'] },
  { id: 3, code: 'T3', icon: '⚙️', name: '정밀 공산품', unlockCost: 500_000_000, marginText: '~50%', recessionDemandMul: 0.55, examples: ['스마트폰', '노트북'] },
  { id: 4, code: 'T4', icon: '🚀', name: '첨단재', unlockCost: 2_000_000_000, marginText: '~80%', recessionDemandMul: 0.10, examples: ['AI 칩', '첨단의료'] },
];

export const QUALITY_MODES = {
  budget: { id: 'budget', label: '보급형', costMul: 0.8, qualityMul: 0.75, summary: '원가 절감과 빠른 회전에 집중한다.' },
  standard: { id: 'standard', label: '표준형', costMul: 1, qualityMul: 1, summary: '가장 균형적인 기본 운영 모드다.' },
  premium: { id: 'premium', label: '프리미엄형', costMul: 1.5, qualityMul: 1.4, summary: '품질과 브랜드 차별화에 집중한다.' },
};

const TIER_KEYWORDS = {
  4: ['ai', 'chip', 'gpu', 'semiconductor', 'robot', 'medical', 'bio', 'quantum', 'satellite', 'battery', '반도체', '칩', '첨단', '의료', '바이오', '로봇', '양자', '위성', '배터리'],
  3: ['smartphone', 'laptop', 'tablet', 'camera', 'drone', 'server', 'sensor', 'wearable', '스마트폰', '노트북', '태블릿', '카메라', '드론', '서버', '센서', '웨어러블'],
  2: ['appliance', 'vacuum', 'fan', 'speaker', 'keyboard', 'mouse', 'earphone', 'mixer', 'drill', '가전', '청소기', '선풍기', '스피커', '키보드', '마우스', '이어폰', '믹서', '공구', '드라이기'],
};

export function guessIndustryTierFromName(name = '') {
  const normalized = String(name).toLowerCase();
  for (const tier of [4, 3, 2]) {
    if (TIER_KEYWORDS[tier].some((keyword) => normalized.includes(keyword))) return tier;
  }
  return 1;
}

export function getTierMeta(tier) {
  return INDUSTRY_TIERS.find((item) => item.id === tier) || null;
}

export function getTierDemandModifier(tier, ecoPhase) {
  const meta = getTierMeta(tier) || INDUSTRY_TIERS[0];
  return ecoPhase === 'recession' ? meta.recessionDemandMul : 1;
}

export function getQualityMeta(mode) {
  return QUALITY_MODES[mode] || QUALITY_MODES.standard;
}

export const RIVAL_BLUEPRINTS = {
  aggressive: { id: 'aggressive', name: '메가플렉스', icon: '🏭', label: 'aggressive', primer: '규모의 경제와 덤핑으로 압박하는 저가 공세형', strengthPhase: 'recession', weaknessHint: '호황기에는 품질 경쟁으로 역공 가능', baseCapital: 24_000_000, brandValue: 12, qualityScore: 76, priceResistance: 0.02 },
  premium: { id: 'premium', name: '아우라', icon: '💎', label: 'premium', primer: '브랜드 충성도와 프리미엄 포지션을 노리는 고급형', strengthPhase: 'boom', weaknessHint: '불황기에는 사치재 수요가 급감한다', baseCapital: 22_000_000, brandValue: 34, qualityScore: 118, priceResistance: 0.04 },
  volatile: { id: 'volatile', name: '밈캐치', icon: '📱', label: 'volatile', primer: '이벤트와 유행에 과민 반응하는 변동성형', strengthPhase: 'event', weaknessHint: '과열 뒤 자멸하는 빈도가 높다', baseCapital: 18_000_000, brandValue: 20, qualityScore: 92, priceResistance: 0.02 },
  techmonopoly: { id: 'techmonopoly', name: '넥서스코어', icon: '🔬', label: 'techmonopoly', primer: 'Tier 3 이상에서만 등장하는 기술 독점형', strengthPhase: 'tier3', weaknessHint: 'Tier 1, 2 구간에서는 참여하지 않는다', baseCapital: 60_000_000, brandValue: 56, qualityScore: 146, priceResistance: 0.05 },
};

const DIFFICULTY_RIVALS = {
  easy: ['aggressive'],
  normal: ['aggressive', 'premium'],
  hard: ['aggressive', 'premium', 'volatile'],
  insane: ['aggressive', 'premium', 'volatile'],
};

function createRival(profileId, turn = 1) {
  const profile = RIVAL_BLUEPRINTS[profileId];
  if (!profile) return null;
  return {
    name: profile.name,
    capital: profile.baseCapital + Math.round(Math.random() * 4_000_000),
    brandValue: profile.brandValue,
    priceResistance: profile.priceResistance,
    marketShare: 0,
    archetype: profileId,
    ...profile,
    sellPrice: 0,
    qualityScore: profile.qualityScore,
    bankrupt: false,
    bankruptTurn: 0,
    attraction: 0,
    joinedTurn: turn,
  };
}

export function syncRivalRoster(existingRivals = [], difficulty = 'normal', industryTier = 1, turn = 1) {
  const desired = [...(DIFFICULTY_RIVALS[difficulty] || DIFFICULTY_RIVALS.normal)];
  if (difficulty === 'insane' && industryTier >= 3) desired.push('techmonopoly');

  return desired
    .map((profileId) => existingRivals.find((rival) => rival.archetype === profileId || rival.name === RIVAL_BLUEPRINTS[profileId]?.name) || createRival(profileId, turn))
    .filter(Boolean);
}

export const APPROVAL_CARD_GRADES = {
  A: { label: 'A급', className: 'grade-a' },
  B: { label: 'B급', className: 'grade-b' },
  C: { label: 'C급', className: 'grade-c' },
  D: { label: 'D급', className: 'grade-d' },
};

const D_CARDS = [
  gambleCard({
    id: 'roadside_trash',
    grade: 'D',
    title: '길가의 쓰레기',
    summary: '주운 물건이 뜻밖의 브랜드 스토리가 될 수도 있다.',
    actionLabel: '줍는다',
    successChance: 0.8,
    success: outcome('브랜딩 성공', '괴짜 CEO 이미지가 화제가 됐다.', 'good', combine(addBrand(10))),
    failure: outcome('오해 확산', '주주 게시판에서 조롱거리가 됐다.', 'bad', combine(addBrand(-15))),
    safeLabel: '무시한다',
  }),
  gambleCard({
    id: 'alien_rumor',
    grade: 'D',
    title: '외계인 납치 썰',
    summary: '허무맹랑한 루머를 밈으로 쓸지 덮을지 선택한다.',
    actionLabel: '마케팅 활용',
    successChance: 0.2,
    success: outcome('밈 대박', '황당한 캠페인이 오히려 터졌다.', 'good', combine(addDocDemand(1.0), addBrand(8))),
    failure: outcome('신뢰도 하락', '사이비 취급을 받으며 브랜드가 흔들렸다.', 'bad', combine(addBrand(-15))),
    safeLabel: '공식 부인',
  }),
  stabilityCard({
    id: 'office_plant',
    grade: 'D',
    title: '사옥 화분 프로젝트',
    summary: '작은 미화가 팀 사기를 바꿀 수 있다.',
    actionLabel: '구매한다',
    paidOutcome: outcome('분위기 개선', '작은 지출로 팀 무드가 좋아졌다.', 'good', combine(addCapital(-2_000_000), addBrand(4), addResistance(0.01))),
    delayLabel: '보류한다',
    delayedOutcome: outcome('현상 유지', '변화 없이 지나간다.', 'neutral', null),
  }),
  stabilityCard({
    id: 'lunch_petition',
    grade: 'D',
    title: '점심 복지 민원',
    summary: '직원 식대 보강 요구가 올라왔다.',
    actionLabel: '증액 승인',
    paidOutcome: outcome('사기 진작', '현장 만족도가 조금 올라갔다.', 'good', combine(addCapital(-3_000_000), addResistance(0.015), addBrand(2))),
    delayLabel: '거절한다',
    delayedOutcome: outcome('불만 누적', '작은 반발이 남았다.', 'bad', combine(addBrand(-4))),
  }),
  gambleCard({
    id: 'busker_sponsor',
    grade: 'D',
    title: '사옥 앞 버스킹',
    summary: '근처 유동 인구를 현장 바이럴로 바꿀 기회다.',
    actionLabel: '소액 후원',
    successChance: 0.7,
    success: outcome('현장 바이럴', '짧지만 체감되는 노출이 생겼다.', 'good', combine(addCapital(-5_000_000), addBrand(6), addDocDemand(0.12))),
    failure: outcome('비용만 지출', '반응이 생각보다 작았다.', 'bad', combine(addCapital(-5_000_000))),
    safeLabel: '지켜본다',
  }),
  gambleCard({
    id: 'mascot_contest',
    grade: 'D',
    title: '사내 마스코트 콘테스트',
    summary: '친근함과 유치함 사이에서 줄타기하는 이벤트다.',
    actionLabel: '공식 채택',
    successChance: 0.65,
    success: outcome('친근감 확보', '브랜드가 더 기억되기 쉬워졌다.', 'good', combine(addBrand(7), addAwareness(0.01))),
    failure: outcome('유치하다는 평', '일부 고객층이 거리를 두기 시작했다.', 'bad', combine(addBrand(-6))),
    safeLabel: '사내 한정',
    safeOutcome: outcome('조용한 만족', '사내 만족감만 조금 높아졌다.', 'neutral', combine(addResistance(0.01))),
  }),
  gambleCard({
    id: 'local_festival',
    grade: 'D',
    title: '동네 축제 후원',
    summary: '지역 행사에서 브랜드 노출을 살 수 있다.',
    actionLabel: '부스 참가',
    successChance: 0.75,
    success: outcome('지역 인지도 상승', '체험 수요가 약하게 들어왔다.', 'good', combine(addCapital(-8_000_000), addBrand(8), addDocDemand(0.15))),
    failure: outcome('비 오는 날', '행사 흥행이 꺾이며 돈만 썼다.', 'bad', combine(addCapital(-8_000_000), addBrand(-2))),
    safeLabel: '다음 기회',
  }),
  gambleCard({
    id: 'ceo_interview',
    grade: 'D',
    title: '인터뷰 요청',
    summary: '지역 매체 인터뷰는 작은 리스크와 작은 보상을 함께 준다.',
    actionLabel: '수락한다',
    successChance: 0.7,
    success: outcome('이미지 강화', '창업 서사가 기사로 잘 풀렸다.', 'good', combine(addBrand(9), addAwareness(0.015))),
    failure: outcome('말실수', '쓸데없는 공격 포인트를 남겼다.', 'bad', combine(addBrand(-10))),
    safeLabel: '거절한다',
  }),
  stabilityCard({
    id: 'community_cleanup',
    grade: 'D',
    title: '동네 정화 활동',
    summary: '지역 사회 공헌이 소소한 호감으로 이어질 수 있다.',
    actionLabel: '참여한다',
    paidOutcome: outcome('CSR 호감도', '브랜드 인상이 부드러워졌다.', 'good', combine(addCapital(-4_000_000), addBrand(5))),
    delayLabel: '업무 우선',
    delayedOutcome: outcome('현상 유지', '돈도 이미지도 그대로다.', 'neutral', null),
  }),
  gambleCard({
    id: 'stray_cat',
    grade: 'D',
    title: '사옥의 고양이',
    summary: '길고양이가 SNS에서 화제가 됐다.',
    actionLabel: '공식 캐릭터화',
    successChance: 0.8,
    success: outcome('친근감 상승', '고객 접점에서 부드러운 인상이 생겼다.', 'good', combine(addBrand(6), addAwareness(0.01))),
    failure: outcome('알레르기 민원', '사소하지만 분명한 불만이 생겼다.', 'bad', combine(addBrand(-4), addCapital(-3_000_000))),
    safeLabel: '조용히 돌본다',
    safeOutcome: outcome('작은 선행', '큰 화제는 아니지만 따뜻한 평이 남았다.', 'neutral', combine(addBrand(2))),
  }),
  gambleCard({
    id: 'mystery_review',
    grade: 'D',
    title: '의문의 장문 후기',
    summary: '극찬 리뷰가 진짜인지 주작인지 애매하다.',
    actionLabel: '상단 고정',
    successChance: 0.5,
    success: outcome('호기심 유입', '고객 호기심이 짧은 수요로 이어졌다.', 'good', combine(addDocDemand(0.18), addBrand(4))),
    failure: outcome('주작 의심', '신뢰도가 소폭 흔들렸다.', 'bad', combine(addBrand(-8))),
    safeLabel: '내린다',
  }),
  gambleCard({
    id: 'intern_pitch',
    grade: 'D',
    title: '인턴의 번뜩임',
    summary: '아주 싼 개선 아이디어가 올라왔다.',
    actionLabel: '실험한다',
    successChance: 0.6,
    success: outcome('의외의 효율', '작은 개선이 비용 구조를 살짝 바꿨다.', 'good', combine(addCapital(-1_000_000), addEffect(EV.COST_MUL, -0.02, 2, '인턴 아이디어', true, 'doc_intern'))),
    failure: outcome('허탕', '실험비만 날리고 끝났다.', 'bad', combine(addCapital(-1_000_000))),
    safeLabel: '다음 안건',
    safeOutcome: outcome('성장 기회 부여', '사내 분위기만 조금 나아졌다.', 'neutral', combine(addResistance(0.01))),
  }),
];

const C_CARDS = [
  gambleCard({
    id: 'tax_notice',
    grade: 'C',
    title: '세무조사 예고',
    summary: '문서 정리 수준이 시험대에 올랐다.',
    minTurn: 6,
    tags: ['debt'],
    actionLabel: '로펌 고용',
    successChance: 0.9,
    success: outcome('무사 통과', '돈은 들었지만 리스크를 막아냈다.', 'good', combine(addCapital(-50_000_000))),
    failure: outcome('괘씸죄', '준비를 했는데도 더 크게 맞았다.', 'bad', combine(addCapital(-100_000_000))),
    safeLabel: '정면돌파',
    safeOutcome: outcome('과태료 경고', '운 좋게 끝났지만 상처는 남았다.', 'warn', combine(addCapital(-25_000_000), addBrand(-6))),
  }),
  stabilityCard({
    id: 'logistics_delay',
    grade: 'C',
    title: '물류 지연 경보',
    summary: '출하 일정이 흔들리고 있다.',
    minTurn: 6,
    tags: ['factory'],
    actionLabel: '긴급 운송',
    paidOutcome: outcome('납기 방어', '비용을 써서 수요 이탈을 막았다.', 'good', combine(addCapital(-20_000_000), addDocDemand(0.12))),
    delayLabel: '일정 조정',
    delayedOutcome: outcome('품절 소문', '고객 기대가 살짝 꺾였다.', 'bad', combine(addBrand(-8), addDocDemand(-0.10))),
  }),
  gambleCard({
    id: 'customer_trial',
    grade: 'C',
    title: '고객 체험단',
    summary: '체험단을 돌리면 리뷰와 리스크가 함께 온다.',
    minTurn: 6,
    actionLabel: '체험단 운영',
    successChance: 0.7,
    success: outcome('호평 확산', '리뷰가 전환으로 이어졌다.', 'good', combine(addCapital(-12_000_000), addDocDemand(0.22), addBrand(10))),
    failure: outcome('냉정한 평가', '단점이 빠르게 퍼졌다.', 'bad', combine(addCapital(-12_000_000), addBrand(-12))),
    safeLabel: '다음 분기',
  }),
  stabilityCard({
    id: 'safety_drill',
    grade: 'C',
    title: '긴급 안전 점검',
    summary: '현장 리스크가 눈에 띄게 올라왔다.',
    minTurn: 6,
    when: (state) => state.factory?.built,
    tags: ['factory'],
    actionLabel: '전면 점검',
    paidOutcome: outcome('리스크 완화', '비용은 들었지만 생산 안정성이 높아졌다.', 'good', combine(addCapital(-25_000_000), addAccidentRisk(-0.12), forceSafetyOn())),
    delayLabel: '부분 조치',
    delayedOutcome: outcome('찜찜한 봉합', '눈앞의 비용만 줄이고 위험은 조금 남겼다.', 'neutral', combine(addCapital(-8_000_000), addAccidentRisk(-0.03))),
  }),
  gambleCard({
    id: 'supplier_switch',
    grade: 'C',
    title: '원자재 대체 제안',
    summary: '공급팀이 더 싼 대체재를 제안했다.',
    minTurn: 6,
    tags: ['factory'],
    actionLabel: '도입한다',
    successChance: 0.7,
    success: outcome('원가 절감', '단기적으로 효율이 좋아졌다.', 'good', combine(addEffect(EV.COST_MUL, -0.05, 2, '대체 원자재', true, 'doc_supplier'))),
    failure: outcome('품질 흔들림', '미묘한 품질 저하가 리뷰에 반영됐다.', 'bad', combine(addBrand(-8), addEffect(EV.QUALITY, -6, 2, '대체 원자재 역효과', false, 'doc_supplier_bad'))),
    safeLabel: '기존 유지',
  }),
  gambleCard({
    id: 'negative_reviews',
    grade: 'C',
    title: '악성 후기 파도',
    summary: '경쟁사인지 진짜 고객인지 모를 불만이 몰려온다.',
    minTurn: 6,
    tags: ['rival'],
    actionLabel: 'CS 총력 대응',
    successChance: 0.75,
    success: outcome('불만 진화', '대응 속도가 신뢰를 지켰다.', 'good', combine(addCapital(-10_000_000), addBrand(6), addResistance(0.02))),
    failure: outcome('확전', '대응이 오히려 이슈를 키웠다.', 'bad', combine(addCapital(-10_000_000), addBrand(-10))),
    safeLabel: '무시한다',
    safeOutcome: outcome('평판 하락', '침묵은 인정으로 받아들여졌다.', 'bad', combine(addBrand(-12), addDocDemand(-0.12))),
  }),
  gambleCard({
    id: 'warehouse_layout',
    grade: 'C',
    title: '창고 동선 재설계',
    summary: '작업 레이아웃을 다시 짜면 효율이 오를 수 있다.',
    minTurn: 6,
    tags: ['factory'],
    actionLabel: '재설계',
    successChance: 0.8,
    success: outcome('효율 상승', '다음 두 턴 운영비가 조금 줄었다.', 'good', combine(addCapital(-18_000_000), addEffect(EV.COST_MUL, -0.04, 2, '창고 동선 개선', true, 'doc_warehouse'))),
    failure: outcome('혼선 발생', '현장 혼란으로 오히려 손해를 봤다.', 'bad', combine(addCapital(-18_000_000), addDocDemand(-0.08))),
    safeLabel: '현 체계 유지',
  }),
  gambleCard({
    id: 'influencer_offer',
    grade: 'C',
    title: '인플루언서 협업',
    summary: '마이크로 인플루언서가 먼저 연락해왔다.',
    minTurn: 6,
    actionLabel: '계약한다',
    successChance: 0.65,
    success: outcome('콘텐츠 적중', '인지도와 체감 수요가 같이 올랐다.', 'good', combine(addCapital(-25_000_000), addBrand(12), addAwareness(0.03), addDocDemand(0.20))),
    failure: outcome('애매한 반응', '브랜드 톤만 흐려졌다.', 'bad', combine(addCapital(-25_000_000), addBrand(-6))),
    safeLabel: '보류한다',
  }),
  gambleCard({
    id: 'bulk_order',
    grade: 'C',
    title: '대량 주문 요청',
    summary: '도매처에서 큰 주문을 넣을지 묻는다.',
    minTurn: 6,
    tags: ['factory'],
    actionLabel: '받아들인다',
    successChance: 0.7,
    success: outcome('물량 소화 성공', '이번 턴 수요가 크게 늘었다.', 'good', combine(addDocDemand(0.35), addBrand(4))),
    failure: outcome('납기 실패', '클레임과 보상 비용이 생겼다.', 'bad', combine(addCapital(-40_000_000), addBrand(-10))),
    safeLabel: '정중히 거절',
    safeOutcome: outcome('보수 운영', '무리한 약속을 피했다.', 'neutral', combine(addBrand(-2))),
  }),
  gambleCard({
    id: 'talent_poach',
    grade: 'C',
    title: '경쟁사 핵심 인력 흔들기',
    summary: '라이벌의 핵심 인력을 빼올 기회가 있다.',
    minTurn: 8,
    tags: ['rival'],
    actionLabel: '스카우트 제안',
    successChance: 0.55,
    success: outcome('전력 보강', '우리 품질 인식이 크게 올랐다.', 'good', combine(addCapital(-35_000_000), addBrand(8), addEffect(EV.QUALITY, 10, 2, '핵심 인력 영입', true, 'doc_poach'), hitRivalQuality(-8))),
    failure: outcome('협상 결렬', '정보만 흘리고 비용을 썼다.', 'bad', combine(addCapital(-15_000_000), addBrand(-4))),
    safeLabel: '내부 육성',
    safeOutcome: outcome('안정적인 선택', '천천히 내부 역량을 쌓는다.', 'neutral', combine(addResistance(0.01))),
  }),
  stabilityCard({
    id: 'energy_audit',
    grade: 'C',
    title: '에너지 절감 점검',
    summary: '설비 효율을 손볼 수 있는 진단 결과가 나왔다.',
    minTurn: 6,
    when: (state) => state.factory?.built,
    tags: ['factory'],
    actionLabel: '즉시 투자',
    paidOutcome: outcome('운영비 절감', '다음 세 턴 비용 구조가 조금 나아졌다.', 'good', combine(addCapital(-30_000_000), addEffect(EV.COST_MUL, -0.06, 3, '에너지 절감', true, 'doc_energy'))),
    delayLabel: '다음 분기',
    delayedOutcome: outcome('현금 보존', '당장 돈은 아꼈지만 개선도 없다.', 'neutral', null),
  }),
  stabilityCard({
    id: 'refund_scare',
    grade: 'C',
    title: '환불 폭주 조짐',
    summary: '사전 대응이 없으면 브랜드가 크게 흔들릴 수 있다.',
    minTurn: 8,
    tags: ['brand'],
    actionLabel: '선제 보상',
    paidOutcome: outcome('신뢰 방어', '현금은 나갔지만 브랜드를 지켰다.', 'good', combine(addCapital(-30_000_000), addBrand(5), addResistance(0.015))),
    delayLabel: '원칙 대응',
    delayedOutcome: outcome('민심 악화', '절차는 맞았지만 감정은 잃었다.', 'bad', combine(addBrand(-15), addDocDemand(-0.15))),
  }),
];

const B_CARDS = [
  gambleCard({
    id: 'mushroom',
    grade: 'B',
    title: '창고의 정체불명 버섯',
    summary: '대박과 재앙이 같은 확률표에 올라 있다.',
    minTurn: 12,
    tags: ['late'],
    actionLabel: '신약 투자',
    successChance: 0.1,
    success: outcome('대박 신물질', '비현실적인 수익이 터졌다.', 'good', combine(addCapital(1_000_000_000), addBrand(18))),
    failure: outcome('연구비 소각', '정체불명 샘플은 그냥 버섯이었다.', 'bad', combine(addCapital(-50_000_000))),
    safeLabel: '폐기한다',
  }),
  gambleCard({
    id: 'foreign_investor',
    grade: 'B',
    title: '외국계 투자 제안',
    summary: '큰 자본이 들어오지만 조건도 따라온다.',
    minTurn: 12,
    tags: ['debt', 'late'],
    actionLabel: '투자 유치',
    successChance: 0.75,
    success: outcome('성장 자금 확보', '현금 유입과 인지도 상승이 동시에 왔다.', 'good', combine(addCapital(80_000_000), addBrand(10))),
    failure: outcome('조건부 족쇄', '자금은 들어왔지만 운영비 압박이 붙었다.', 'warn', combine(addCapital(80_000_000), addEffect(EV.COST_MUL, 0.06, 3, '투자 조건', false, 'doc_investor'))),
    safeLabel: '독립 유지',
    safeOutcome: outcome('지분 방어', '성장 속도는 늦지만 통제권은 지켰다.', 'neutral', combine(addBrand(3))),
  }),
  gambleCard({
    id: 'rd_support',
    grade: 'B',
    title: 'R&D 지원 프로그램',
    summary: '기술 투자에 외부 지원이 붙을 수 있다.',
    minTurn: 12,
    tags: ['late'],
    actionLabel: '신청한다',
    successChance: 0.7,
    success: outcome('지원금 확보', '품질 경쟁력이 잠시 강화됐다.', 'good', combine(addCapital(50_000_000), addEffect(EV.QUALITY, 12, 3, 'R&D 지원', true, 'doc_rd'))),
    failure: outcome('서류 탈락', '준비 비용만 날아갔다.', 'bad', combine(addCapital(-20_000_000))),
    safeLabel: '내부 자금으로',
  }),
  gambleCard({
    id: 'exclusive_distribution',
    grade: 'B',
    title: '유통 독점 계약',
    summary: '한 채널에서 크게 밀어주겠다는 제안이 들어왔다.',
    minTurn: 12,
    tags: ['brand', 'late'],
    actionLabel: '독점 계약',
    successChance: 0.65,
    success: outcome('채널 장악', '점유율과 수요가 같이 튀었다.', 'good', combine(addDocDemand(0.40), addShare(0.03), addBrand(8))),
    failure: outcome('채널 종속', '수요는 늘었지만 마진은 아쉬웠다.', 'warn', combine(addEffect(EV.COST_MUL, 0.04, 2, '유통 수수료', false, 'doc_channel'), addBrand(4))),
    safeLabel: '비독점 유지',
  }),
  gambleCard({
    id: 'export_fair',
    grade: 'B',
    title: '해외 박람회',
    summary: '브랜드를 더 큰 무대로 올릴 기회가 왔다.',
    minTurn: 12,
    tags: ['brand', 'late'],
    actionLabel: '참가한다',
    successChance: 0.6,
    success: outcome('수출 문의 유입', '몇 턴 동안 시장 확장 효과가 남는다.', 'good', combine(addCapital(-40_000_000), addBrand(14), addEffect(EV.MARKET_MUL, 0.10, 3, '해외 박람회', true, 'doc_export'))),
    failure: outcome('비용 대비 아쉬움', '성과보다 체류비가 더 컸다.', 'bad', combine(addCapital(-40_000_000), addBrand(2))),
    safeLabel: '국내 집중',
  }),
  gambleCard({
    id: 'refinancing',
    grade: 'B',
    title: '대출 리파이낸싱',
    summary: '금리 구조를 다시 짤 기회가 생겼다.',
    minTurn: 12,
    when: (state) => (state.debt || 0) > 0,
    tags: ['debt'],
    actionLabel: '장기 고정금리',
    successChance: 0.8,
    success: outcome('금리 안정화', '당장 수수료는 있지만 이후 부담이 줄었다.', 'good', combine(addCapital(-20_000_000), addEffect(EV.INTEREST, -0.02, 3, '리파이낸싱', true, 'doc_refi'))),
    failure: outcome('조건 악화', '시장이 타이밍을 허락하지 않았다.', 'bad', combine(addCapital(-20_000_000), addEffect(EV.INTEREST, 0.015, 2, '리파이낸싱 역효과', false, 'doc_refi_bad'))),
    safeLabel: '기존 유지',
  }),
  stabilityCard({
    id: 'labor_negotiation',
    grade: 'B',
    title: '현장 협상',
    summary: '생산 현장의 불만을 정면으로 다뤄야 한다.',
    minTurn: 12,
    when: (state) => state.factory?.built,
    tags: ['factory'],
    actionLabel: '선제 합의',
    paidOutcome: outcome('안정 확보', '비용은 들었지만 가동 리스크를 줄였다.', 'good', combine(addCapital(-35_000_000), addResistance(0.03), addAccidentRisk(-0.08))),
    delayLabel: '강행한다',
    delayedOutcome: outcome('생산 차질', '내부 갈등이 수요 손실로 이어졌다.', 'bad', combine(addBrand(-12), addDocDemand(-0.18), addAccidentRisk(0.08))),
  }),
  gambleCard({
    id: 'recall_crisis',
    grade: 'B',
    title: '대규모 리콜 조짐',
    summary: '제품 신뢰를 지킬지 숫자를 지킬지 선택해야 한다.',
    minTurn: 12,
    tags: ['brand', 'factory'],
    actionLabel: '전량 회수',
    successChance: 1,
    success: outcome('브랜드 방어', '비용은 컸지만 신뢰를 지켰다.', 'good', combine(addCapital(-70_000_000), addBrand(12), addResistance(0.02))),
    failure: outcome('브랜드 방어', '비용은 컸지만 신뢰를 지켰다.', 'good', combine(addCapital(-70_000_000), addBrand(12), addResistance(0.02))),
    safeLabel: '부분 은폐',
    safeOutcome: outcome('역풍', '은폐 정황이 드러나 브랜드가 크게 훼손됐다.', 'bad', combine(addCapital(-100_000_000), addBrand(-28), forceCartelOff())),
  }),
  gambleCard({
    id: 'policy_lobby',
    grade: 'B',
    title: '정책 로비',
    summary: '규제 방향을 조금 유리하게 만들 수 있다는 제안이다.',
    minTurn: 12,
    tags: ['cartel', 'debt'],
    actionLabel: '추진한다',
    successChance: 0.55,
    success: outcome('제도 우위', '짧은 기간 운영비가 유리해졌다.', 'good', combine(addCapital(-30_000_000), addEffect(EV.COST_MUL, -0.05, 2, '정책 우위', true, 'doc_lobby'))),
    failure: outcome('역추적', '로비 흔적이 역풍이 되었다.', 'bad', combine(addCapital(-60_000_000), addBrand(-14))),
    safeLabel: '거리 둔다',
  }),
  gambleCard({
    id: 'private_label',
    grade: 'B',
    title: 'PB 전용 생산 제안',
    summary: '대형 유통사가 자체 브랜드 생산을 맡기려 한다.',
    minTurn: 12,
    tags: ['late'],
    actionLabel: '수주한다',
    successChance: 0.7,
    success: outcome('물량 확보', '현금 흐름은 좋아졌지만 자사 브랜드는 옅어졌다.', 'good', combine(addDocDemand(0.25), addCapital(40_000_000), addBrand(-6))),
    failure: outcome('원가 압박', '물량은 들어왔지만 마진이 썩 좋지 않았다.', 'warn', combine(addCapital(10_000_000), addEffect(EV.COST_MUL, 0.05, 2, 'PB 마진 압박', false, 'doc_pb'))),
    safeLabel: '자사 브랜드 우선',
    safeOutcome: outcome('브랜드 집중', '짧은 돈 대신 긴 브랜드를 택했다.', 'neutral', combine(addBrand(6))),
  }),
  gambleCard({
    id: 'celebrity_campaign',
    grade: 'B',
    title: '셀럽 캠페인',
    summary: '한 방은 크지만 실패하면 후폭풍도 크다.',
    minTurn: 12,
    tags: ['brand', 'late'],
    actionLabel: '계약한다',
    successChance: 0.5,
    success: outcome('대형 화제', '점유율까지 밀어 올리는 대성공이다.', 'good', combine(addCapital(-60_000_000), addBrand(20), addAwareness(0.05), addDocDemand(0.35), addShare(0.04))),
    failure: outcome('과한 지출', '화제는 생겼지만 전환은 약했다.', 'bad', combine(addCapital(-60_000_000), addBrand(4))),
    safeLabel: '소형 캠페인',
    safeOutcome: outcome('안전한 홍보', '효과는 작지만 실패도 작다.', 'neutral', combine(addCapital(-20_000_000), addBrand(8), addAwareness(0.02))),
  }),
  gambleCard({
    id: 'settlement_offer',
    grade: 'B',
    title: '데이터 유출 합의 제안',
    summary: '이슈가 커지기 전에 합의할 수 있다.',
    minTurn: 12,
    tags: ['brand', 'late'],
    actionLabel: '즉시 합의',
    successChance: 1,
    success: outcome('리스크 축소', '현금을 태워 평판 추락을 막았다.', 'good', combine(addCapital(-45_000_000), addBrand(6))),
    failure: outcome('리스크 축소', '현금을 태워 평판 추락을 막았다.', 'good', combine(addCapital(-45_000_000), addBrand(6))),
    safeLabel: '법적 대응',
    safeOutcome: outcome('여론 패배', '오래 끌수록 브랜드가 더 닳았다.', 'bad', combine(addCapital(-60_000_000), addBrand(-18))),
  }),
];

const A_CARDS = [
  gambleCard({
    id: 'patent_war',
    grade: 'A',
    title: '특허 전쟁',
    summary: '후반부 경쟁구도를 뒤흔들 수 있는 대형 분쟁이다.',
    minTurn: 25,
    tags: ['rival', 'late'],
    actionLabel: '공격적으로 간다',
    successChance: 0.45,
    success: outcome('승소', '기술 우위를 과시하며 라이벌을 흔들었다.', 'good', combine(addCapital(120_000_000), addBrand(20), hitRivals(-50_000_000), addEffect(EV.QUALITY, 14, 3, '특허 우위', true, 'doc_patent'))),
    failure: outcome('소송 장기화', '거대한 법무비만 남았다.', 'bad', combine(addCapital(-120_000_000), addBrand(-10))),
    safeLabel: '합의 라이선스',
    safeOutcome: outcome('타협 성사', '현금은 적당히 받고 리스크를 줄였다.', 'neutral', combine(addCapital(40_000_000), addBrand(4))),
  }),
  gambleCard({
    id: 'national_project',
    grade: 'A',
    title: '국책 과제',
    summary: '한 번 잡으면 체급이 달라질 수 있는 프로젝트다.',
    minTurn: 25,
    tags: ['late'],
    actionLabel: '입찰 참여',
    successChance: 0.4,
    success: outcome('과제 수주', '브랜드와 자금, 기술력이 모두 뛰었다.', 'good', combine(addCapital(200_000_000), addBrand(24), addEffect(EV.QUALITY, 18, 4, '국책 과제', true, 'doc_national'))),
    failure: outcome('준비 비용 소각', '입찰 실패로 큰 비용만 남았다.', 'bad', combine(addCapital(-80_000_000))),
    safeLabel: '차기 준비',
  }),
  gambleCard({
    id: 'mega_collab',
    grade: 'A',
    title: '블록버스터 협업',
    summary: '잘 되면 신드롬, 실패하면 비용 덩어리다.',
    minTurn: 25,
    tags: ['brand', 'late'],
    actionLabel: '한정판 출시',
    successChance: 0.35,
    success: outcome('문화 현상', '이벤트급 매출과 브랜드가 동시에 터졌다.', 'good', combine(addCapital(-90_000_000), addDocDemand(0.80), addBrand(28), addAwareness(0.06), addShare(0.05))),
    failure: outcome('비용 부담', '주목은 받았지만 수익성은 아쉬웠다.', 'warn', combine(addCapital(-90_000_000), addBrand(10), addDocDemand(0.10))),
    safeLabel: '라이선스만 준다',
    safeOutcome: outcome('보수적 수익', '큰 도박 없이 로열티만 챙겼다.', 'neutral', combine(addCapital(35_000_000), addBrand(6))),
  }),
  gambleCard({
    id: 'short_report',
    grade: 'A',
    title: '공매도 리포트',
    summary: '대외 신뢰가 흔들리면 금융비용까지 연쇄적으로 뛴다.',
    minTurn: 25,
    tags: ['debt', 'late'],
    actionLabel: '정보 공개 확대',
    successChance: 0.65,
    success: outcome('신뢰 회복', '시장 불안을 빠르게 진정시켰다.', 'good', combine(addCapital(-30_000_000), addBrand(14), addEffect(EV.INTEREST, -0.015, 3, '신뢰 회복', true, 'doc_short'))),
    failure: outcome('추가 질문 쇄도', '대응 비용만 더 늘었다.', 'bad', combine(addCapital(-60_000_000), addBrand(-8))),
    safeLabel: '정면 반박',
    safeOutcome: outcome('불신 확대', '공격적 태도가 역효과를 냈다.', 'bad', combine(addBrand(-18), addEffect(EV.INTEREST, 0.02, 3, '신뢰 악화', false, 'doc_short_bad'))),
  }),
  gambleCard({
    id: 'platform_exclusive',
    grade: 'A',
    title: '플랫폼 독점 제휴',
    summary: '성장 곡선을 급하게 꺾어 올릴 수 있는 제안이다.',
    minTurn: 25,
    tags: ['late'],
    actionLabel: '독점 제휴',
    successChance: 0.55,
    success: outcome('플랫폼 푸시', '거대한 유입이 들어왔다.', 'good', combine(addDocDemand(0.55), addBrand(16), addShare(0.05))),
    failure: outcome('수수료 지옥', '수요는 늘었지만 구조가 너무 무겁다.', 'warn', combine(addDocDemand(0.25), addEffect(EV.COST_MUL, 0.10, 3, '플랫폼 수수료', false, 'doc_platform'))),
    safeLabel: '채널 분산',
  }),
  gambleCard({
    id: 'factory_fire_rumor',
    grade: 'A',
    title: '공장 폭발설',
    summary: '생산 안정성에 대한 공포가 후반부를 흔든다.',
    minTurn: 25,
    when: (state) => state.factory?.built,
    tags: ['factory', 'late'],
    actionLabel: '예방 정지',
    successChance: 1,
    success: outcome('대형 사고 차단', '브랜드를 지키는 대신 현금을 태웠다.', 'good', combine(addCapital(-80_000_000), addBrand(16), addAccidentRisk(-0.20), forceSafetyOn())),
    failure: outcome('대형 사고 차단', '브랜드를 지키는 대신 현금을 태웠다.', 'good', combine(addCapital(-80_000_000), addBrand(16), addAccidentRisk(-0.20), forceSafetyOn())),
    safeLabel: '생산 지속',
    safeOutcome: outcome('실제 사고', '무시한 대가가 너무 컸다.', 'bad', combine(addCapital(-160_000_000), addBrand(-20), addAccidentRisk(0.15), forceSafetyOn())),
  }),
  gambleCard({
    id: 'strategic_merger',
    grade: 'A',
    title: '전략적 합병 제안',
    summary: '성공하면 체급 상승, 실패하면 재무 왜곡이다.',
    minTurn: 25,
    tags: ['late', 'rival'],
    actionLabel: '추진한다',
    successChance: 0.45,
    success: outcome('시너지 달성', '시장 지배력이 한층 강해졌다.', 'good', combine(addCapital(-120_000_000), addBrand(16), addShare(0.07), hitRivals(-80_000_000))),
    failure: outcome('통합 실패', '비용만 커지고 운영비까지 올라갔다.', 'bad', combine(addCapital(-150_000_000), addEffect(EV.COST_MUL, 0.12, 3, '합병 후유증', false, 'doc_merge'))),
    safeLabel: '제휴만 한다',
    safeOutcome: outcome('느슨한 협력', '강한 도박 없이 약간의 점유율을 얻었다.', 'neutral', combine(addShare(0.02), addBrand(5))),
  }),
  gambleCard({
    id: 'medical_breakthrough',
    grade: 'A',
    title: '의료 인증 돌파',
    summary: '고티어 시장에서만 의미가 큰 초대형 인증 기회다.',
    minTurn: 25,
    when: (state) => (state.industryTier || 1) >= 4,
    tags: ['late'],
    actionLabel: '끝까지 밀어붙인다',
    successChance: 0.5,
    success: outcome('인증 성공', 'Tier 4 시장 수요가 폭발적으로 반응했다.', 'good', combine(addCapital(-100_000_000), addDocDemand(0.70), addBrand(30), addEffect(EV.QUALITY, 22, 4, '의료 인증', true, 'doc_medical'))),
    failure: outcome('추가 보완 요구', '돈과 시간이 더 들었다.', 'bad', combine(addCapital(-140_000_000), addBrand(6))),
    safeLabel: '다음 시즌 준비',
  }),
  gambleCard({
    id: 'emergency_capital_call',
    grade: 'A',
    title: '긴급 자본 호출',
    summary: '재무 구조를 과감히 재편할 마지막 카드가 왔다.',
    minTurn: 25,
    tags: ['debt', 'late'],
    actionLabel: '유상증자',
    successChance: 0.75,
    success: outcome('현금 수혈', '재무가 숨통을 텄다.', 'good', combine(addCapital(180_000_000), addBrand(-6), addEffect(EV.INTEREST, -0.015, 3, '재무 안정', true, 'doc_capital_call'))),
    failure: outcome('시장 실망', '돈은 모았지만 기대는 꺾였다.', 'warn', combine(addCapital(120_000_000), addBrand(-18))),
    safeLabel: '브리지론',
    safeOutcome: outcome('짧은 숨통', '당장은 버티지만 이후 금리 부담이 크다.', 'warn', combine(addCapital(100_000_000), addDebt(100_000_000), addEffect(EV.INTEREST, 0.025, 3, '브리지론', false, 'doc_bridge'))),
  }),
];

export const APPROVAL_DOC_CARDS = [...D_CARDS, ...C_CARDS, ...B_CARDS, ...A_CARDS];

function karmaMultiplier(state, card) {
  let mul = 1;
  const highDebt = (state.debt || 0) > Math.max(50_000_000, safeNetWorth(state) * 0.5);
  if (card.tags?.includes('cartel') && state.cartel?.active) mul *= 5;
  if (card.tags?.includes('factory') && state.factory?.built && !state.factory?.safetyOn) mul *= 4.5;
  if (card.tags?.includes('debt') && highDebt) mul *= 3.2;
  if (card.tags?.includes('late') && (state.turn || 1) >= 25) mul *= 1.4;
  return mul;
}

function weightedPick(items, count) {
  const pool = [...items];
  const selected = [];
  while (pool.length > 0 && selected.length < count) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * total;
    let index = 0;
    while (index < pool.length - 1 && cursor > pool[index].weight) {
      cursor -= pool[index].weight;
      index += 1;
    }
    selected.push(pool[index].card);
    pool.splice(index, 1);
  }
  return selected;
}

export function getApprovalCardPreview(state, count = 3) {
  return pickApprovalCards(state, count);
}

export function pickApprovalCards(state, count = 3) {
  const eligible = APPROVAL_DOC_CARDS
    .filter((card) => (state.turn || 1) >= (card.minTurn || 1))
    .filter((card) => !card.maxTurn || (state.turn || 1) <= card.maxTurn)
    .filter((card) => (card.when ? card.when(state) : true))
    .map((card) => ({
      card,
      weight: Math.max(0.01, (card.weight ? card.weight(state) : 1) * karmaMultiplier(state, card)),
    }));

  if (eligible.length <= count) return eligible.map((item) => item.card);
  return weightedPick(eligible, count);
}

export function resolveApprovalChoice(card, choiceId, state) {
  const selectedChoice = card?.choices?.find((item) => item.id === choiceId) || card?.choices?.[0];
  if (!selectedChoice) return null;

  const rolled = Math.random();
  let cursor = 0;
  const pickedOutcome = selectedChoice.outcomes.find((item) => {
    cursor += item.chance;
    return rolled <= cursor + 1e-9;
  }) || selectedChoice.outcomes[selectedChoice.outcomes.length - 1];

  return {
    cardId: card.id,
    cardTitle: card.title,
    choiceId: selectedChoice.id,
    choiceLabel: selectedChoice.label,
    title: pickedOutcome.title,
    desc: pickedOutcome.desc,
    tone: pickedOutcome.tone || 'neutral',
    resolution: typeof pickedOutcome.apply === 'function' ? pickedOutcome.apply(state) : (pickedOutcome.apply || null),
  };
}
