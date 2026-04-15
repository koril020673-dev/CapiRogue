import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { calcBEP, calcMktAwarenessGain, calcMktBrandGain, estimateBaseDemand } from '../calculations.js';
import { C } from '../constants.js';
import { getQualityMeta, getTierMeta, INDUSTRY_TIERS, QUALITY_MODES } from '../designData.js';
import { fmtW, sign } from '../utils.js';
import HoverHint from './HoverHint.jsx';

function TierCard({ tier, active, locked, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`tier-card${active ? ' active' : ''}${locked ? ' locked' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="tier-card-top">
        <span>{tier.icon}</span>
        <strong>{tier.code}</strong>
      </div>
      <div className="tier-card-name">{tier.name}</div>
      <div className="tier-card-meta">불황 수요 x{tier.recessionDemandMul.toFixed(2)}</div>
    </button>
  );
}

export default function PriceBlock() {
  const s = useGameStore(useShallow((state) => ({
    industryTier: state.industryTier,
    itemTier: state.itemTier,
    qualityMode: state.qualityMode,
    setQualityMode: state.setQualityMode,
    unlockIndustryTier: state.unlockIndustryTier,
    capital: state.capital,
    selectedVendor: state.selectedVendor,
    sellPrice: state.sellPrice,
    setSellPrice: state.setSellPrice,
    plannedOrderUnits: state.plannedOrderUnits,
    setPlannedOrderUnits: state.setPlannedOrderUnits,
    factory: state.factory,
    debt: state.debt,
    interestRate: state.interestRate,
    effectiveInterestRate: state.effectiveInterestRate,
    realty: state.realty,
    mna: state.mna,
    economy: state.economy,
    monthlyFixedCost: state.monthlyFixedCost,
    difficulty: state.difficulty,
    itemCategory: state.itemCategory,
    activeEffects: state.activeEffects,
    _bsDemandMul: state._bsDemandMul,
    _docDemandMul: state._docDemandMul,
  })));

  const currentTier = getTierMeta(s.industryTier) || INDUSTRY_TIERS[0];
  const itemTier = getTierMeta(s.itemTier || s.industryTier) || currentTier;
  const nextTier = getTierMeta((s.industryTier || 1) + 1);
  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  const qualityUnlocked = factoryActive;
  const appliedQualityMode = qualityUnlocked ? s.qualityMode : 'standard';
  const qualityMeta = getQualityMeta(appliedQualityMode);
  const unitCost = s.selectedVendor?.unitCost || 0;
  const netCost = Math.round(unitCost * qualityMeta.costMul * (factoryActive ? C.FACTORY_DISCOUNT : 1));
  const maxPrice = Math.max(1000, Math.round((unitCost || 1000) * 8));
  const unitMargin = s.sellPrice > 0 ? s.sellPrice - netCost : 0;
  const procurementCost = Math.max(0, s.plannedOrderUnits || 0) * netCost;

  const planState = {
    selectedVendor: s.selectedVendor,
    sellPrice: s.sellPrice,
    itemCategory: s.itemCategory,
    economy: s.economy,
    difficulty: s.difficulty,
    industryTier: s.industryTier,
    itemTier: s.itemTier,
    activeEffects: s.activeEffects,
    _bsDemandMul: s._bsDemandMul,
    _docDemandMul: s._docDemandMul,
  };
  const demandInfo = s.selectedVendor ? estimateBaseDemand(planState, false) : null;
  const demandRef = demandInfo?.demand || C.BASE_DEMAND;
  const suggestedPlans = [
    { label: '보수', value: Math.max(50, Math.round(demandRef * 0.85)) },
    { label: '기준', value: Math.max(50, Math.round(demandRef * 1.0)) },
    { label: '공세', value: Math.max(50, Math.round(demandRef * 1.15)) },
  ];

  const bep = s.selectedVendor ? calcBEP({
    factory: s.factory,
    debt: s.debt,
    interestRate: s.interestRate,
    effectiveInterestRate: s.effectiveInterestRate,
    realty: s.realty,
    mna: s.mna,
    economy: s.economy,
    monthlyFixedCost: s.monthlyFixedCost,
    selectedVendor: s.selectedVendor,
    sellPrice: s.sellPrice,
    qualityMode: appliedQualityMode,
  }) : null;

  const mktRefBudget = 10_000_000;
  const rdRefBudget = nextTier?.unlockCost || C.FACTORY_UPGRADE_COST;
  const mktBrandGain = calcMktBrandGain(mktRefBudget);
  const mktAwareGain = calcMktAwarenessGain(mktRefBudget);
  const tierUpgradeBlocked = Boolean(nextTier?.unlockCost) && s.capital < nextTier.unlockCost;
  const tierUpgradeState = nextTier?.unlockCost
    ? tierUpgradeBlocked
      ? `지금 못 누르는 이유: ${nextTier.code} 해금에는 ${fmtW(nextTier.unlockCost)}이 필요합니다.`
      : `지금 누르면 ${nextTier.code} 시장이 즉시 해금됩니다.`
    : '';
  const tierExamples = (tier, locked) => [
    `${tier.code} 대표 품목: ${tier.examples.join(', ')}`,
    `${tier.name} 구간은 경기 침체 시 수요가 x${tier.recessionDemandMul.toFixed(2)}까지 흔들립니다.`,
    tier.id === s.industryTier ? '현재 운영 중인 상한 티어입니다.' : locked ? '지금은 잠겨 있지만 해금 후 이 구간 상품을 다룰 수 있습니다.' : '이미 접근 가능한 티어입니다.',
  ];
  const qualityHints = {
    budget: {
      description: '저원가와 빠른 회전에 집중하는 운영 모드입니다.',
      pros: '초반 자금이 적을 때 발주 부담을 줄이기 좋습니다.',
      cons: '품질 경쟁과 프리미엄 가격 방어에는 약합니다.',
      examples: [
        '초반 현금이 빠듯할 때 첫 출고 물량을 가볍게 돌릴 때',
        '불황기에 가격 경쟁으로 버티고 싶을 때',
        '재고 부담보다 회전 속도를 우선할 때',
      ],
    },
    standard: {
      description: '원가와 품질을 가장 균형 있게 맞춘 기본 운영 모드입니다.',
      pros: '어느 경기 국면에서도 크게 무너지지 않는 안정형 선택입니다.',
      cons: '특정 상황에서 압도적인 강점은 만들기 어렵습니다.',
      examples: [
        '처음 새 라인을 잡고 반응을 확인하고 싶을 때',
        '가격과 품질을 모두 과하게 흔들고 싶지 않을 때',
        '이번 턴 판단을 보수적으로 가져가고 싶을 때',
      ],
    },
    premium: {
      description: '품질과 브랜드 차별화에 집중하는 고가 전략 모드입니다.',
      pros: '품질 경쟁력이 높아지면 높은 판매가를 정당화하기 좋습니다.',
      cons: '원가 부담이 커져 불황이나 저가 경쟁에서 흔들릴 수 있습니다.',
      examples: [
        '공장 레벨이 높고 브랜드가 붙기 시작했을 때',
        '프리미엄 가격대로 마진을 크게 남기고 싶을 때',
        '같은 상품이라도 고급 라인으로 포지셔닝하고 싶을 때',
      ],
    },
  };

  return (
    <div className="price-block">
      <div className="tier-command-box">
        <div className="tier-command-copy">
          <div className="tier-command-kicker">Industry Tier</div>
          <div className="tier-command-title">
            {currentTier.icon} {currentTier.code} {currentTier.name}
          </div>
          <div className="tier-command-sub">
            현재 탐색 가능 상한은 {currentTier.code}, 이번 시장은 {itemTier.code}입니다.
          </div>
        </div>
        {nextTier?.unlockCost ? (
          <HoverHint
            title={`${nextTier.code} 산업 티어 해금`}
            description={`${nextTier.name} 시장에 진입해 더 큰 매출과 더 높은 난도의 상품을 다룰 수 있게 됩니다.`}
            pros="새로운 시장과 높은 매출 상한을 열 수 있습니다."
            cons="해금 비용이 크고, 상위 티어일수록 경기 침체 영향을 더 크게 받습니다."
            examples={[
              `${nextTier.code} 대표 품목: ${nextTier.examples.join(', ')}`,
              `현재 자본 ${fmtW(s.capital)} / 필요 자본 ${fmtW(nextTier.unlockCost)}`,
              `${nextTier.name} 진입 후에는 더 큰 매출과 더 큰 변동성이 함께 들어옵니다.`,
            ]}
            disabled={tierUpgradeBlocked}
            align="end"
            state={tierUpgradeState}
          >
            <button
              type="button"
              className="tier-upgrade-btn"
              onClick={s.unlockIndustryTier}
              disabled={tierUpgradeBlocked}
            >
              {nextTier.code} 해금 {fmtW(nextTier.unlockCost)}
            </button>
          </HoverHint>
        ) : (
          <div className="tier-upgrade-done">최고 티어 도달</div>
        )}
      </div>

      <div className="tier-grid">
        {INDUSTRY_TIERS.map((tier) => {
          const locked = tier.id > s.industryTier;
          return (
            <HoverHint
              key={tier.id}
              title={`${tier.code} · ${tier.name}`}
              description={`${tier.name} 구간에서 자주 다루는 상품대와 경기 민감도를 보여줍니다.`}
              pros={locked ? '해금하면 더 큰 시장과 더 높은 매출 상한을 열 수 있습니다.' : '현재 접근 가능한 티어 범위 안에서 상품을 넓힐 수 있습니다.'}
              cons={tier.recessionDemandMul < 0.7 ? '상위 티어일수록 침체 국면에서 수요가 더 크게 흔들립니다.' : '기본 티어는 안정적이지만 폭발적인 매출 상한은 낮습니다.'}
              examples={tierExamples(tier, locked)}
            >
              <TierCard
                tier={tier}
                active={tier.id === s.industryTier}
                locked={locked}
                disabled
              />
            </HoverHint>
          );
        })}
      </div>

      <div className={`quality-mode-box${qualityUnlocked ? '' : ' locked'}`}>
        <div className="quality-mode-head">
          <div className="order-plan-title">품질 모드</div>
          <span className={`quality-lock-badge${qualityUnlocked ? ' active' : ''}`}>
            {qualityUnlocked ? '생산 라인 활성' : '공장 완공 후 해금'}
          </span>
        </div>
        <div className="quality-mode-grid">
          {Object.values(QUALITY_MODES).map((mode) => (
            <HoverHint
              key={mode.id}
              fill
              disabled={!qualityUnlocked}
              title={mode.label}
              description={qualityHints[mode.id]?.description}
              pros={qualityHints[mode.id]?.pros}
              cons={qualityHints[mode.id]?.cons}
              examples={qualityHints[mode.id]?.examples}
              state={
                !qualityUnlocked
                  ? '공장이 완공되기 전에는 공급처 기본 품질로만 운영됩니다.'
                  : s.qualityMode === mode.id
                    ? '현재 선택된 모드입니다.'
                    : '지금 누르면 이번 달 품질/원가 기준이 이 모드로 바뀝니다.'
              }
            >
              <button
                type="button"
                className={`quality-mode-btn${appliedQualityMode === mode.id ? ' active' : ''}`}
                disabled={!qualityUnlocked}
                onClick={() => s.setQualityMode(mode.id)}
              >
                <strong>{mode.label}</strong>
                <span>원가 x{mode.costMul.toFixed(2)}</span>
                <span>품질 x{mode.qualityMul.toFixed(2)}</span>
              </button>
            </HoverHint>
          ))}
        </div>
        <div className="order-plan-help">
          {qualityUnlocked
            ? qualityMeta.summary
            : '공장을 완공하면 여기서 저원가 생산, 균형 생산, 고품질 생산 방향을 선택할 수 있습니다.'}
        </div>
      </div>

      {!s.selectedVendor ? (
        <div className="price-hint">
          {factoryActive && !s.factory.productSelectionOpen
            ? '현재 생산 라인이 고정되어 있습니다. 공장 업그레이드 후 새 라인을 다시 열 수 있습니다.'
            : '먼저 현재 판매할 라인을 고르면 발주 계획과 가격을 설정할 수 있습니다.'}
        </div>
      ) : (
        <>
          <div className="price-hero">
            <div className="price-hero-card">
              <span>실원가</span>
              <strong>{fmtW(netCost)}</strong>
            </div>
            <div className={`price-hero-card${unitMargin > 0 ? ' good' : s.sellPrice > 0 ? ' bad' : ''}`}>
              <span>개당 마진</span>
              <strong>{s.sellPrice > 0 ? sign(unitMargin) : '미설정'}</strong>
            </div>
            <div className="price-hero-card">
              <span>예상 시장 수요</span>
              <strong>{demandRef.toLocaleString('ko-KR')}개</strong>
            </div>
          </div>

          <div className="price-presets compact">
            {suggestedPlans.map((preset) => (
              <HoverHint
                key={preset.label}
                fill
                title={`${preset.label} 발주`}
                description={
                  preset.label === '보수'
                    ? '예상 수요보다 약간 적게 잡아 재고 부담을 낮춥니다.'
                    : preset.label === '기준'
                      ? '예상 수요 기준으로 가장 무난한 발주 계획입니다.'
                      : '품절을 줄이기 위해 예상 수요보다 조금 더 여유 있게 발주합니다.'
                }
                pros={
                  preset.label === '보수'
                    ? '재고 폐기 위험을 줄이고 현금을 덜 묶습니다.'
                    : preset.label === '기준'
                      ? '공급과 수요의 균형을 보기 좋습니다.'
                      : '수요가 예상보다 잘 나올 때 품절을 줄일 수 있습니다.'
                }
                cons={
                  preset.label === '보수'
                    ? '수요가 강하면 품절이 빨리 날 수 있습니다.'
                    : preset.label === '기준'
                      ? '극단적 상황에는 대응력이 약할 수 있습니다.'
                      : '남는 물량이 생기면 폐기 손실이 커질 수 있습니다.'
                }
                examples={[
                  `현재 예상 수요 ${demandRef.toLocaleString('ko-KR')}개 기준`,
                  `${preset.label} 선택 시 ${preset.value.toLocaleString('ko-KR')}개를 바로 입력합니다.`,
                  preset.label === '보수' ? '첫 출고나 현금 부족 구간에서 자주 쓰기 좋습니다.' : preset.label === '기준' ? '가장 먼저 눌러보고 세부 수량을 미세 조정하기 좋습니다.' : '라인 반응이 좋고 품절을 피하고 싶을 때 쓰기 좋습니다.',
                ]}
                state="클릭하면 발주 수량 입력칸이 이 값으로 채워집니다."
              >
                <button
                  type="button"
                  className="price-preset-btn"
                  onClick={() => s.setPlannedOrderUnits(preset.value)}
                >
                  {preset.label} 발주
                  <small>{preset.value.toLocaleString('ko-KR')}개</small>
                </button>
              </HoverHint>
            ))}
          </div>

          <div className="order-plan-box">
            <div className="order-plan-title">발주 수량</div>
            <div className="price-row">
              <input
                type="number"
                className="price-input"
                min={0}
                step={10}
                value={s.plannedOrderUnits || ''}
                onChange={(event) => s.setPlannedOrderUnits(event.target.value)}
                placeholder="0"
              />
              <span className="price-unit">개</span>
            </div>
            <div className="order-plan-help">
              선결제 금액 {fmtW(procurementCost)}. 남는 물량은 같은 달 바로 폐기됩니다.
            </div>
          </div>

          <div className="price-presets compact">
            {[1.2, 1.6, 2.2].map((multiplier, index) => {
              const nextPrice = Math.round(netCost * multiplier / 100) * 100;
              const labels = ['보급', '표준', '프리미엄'];
              return (
                <HoverHint
                  key={multiplier}
                  fill
                  title={`${labels[index]}가`}
                  description={
                    labels[index] === '보급'
                      ? '회전율 위주의 저가 전략 기준 가격입니다.'
                      : labels[index] === '표준'
                        ? '가장 무난한 중간 가격대 기준입니다.'
                        : '브랜드와 품질 차별화를 노리는 고가 전략 기준입니다.'
                  }
                  pros={
                    labels[index] === '보급'
                      ? '진입 장벽을 낮춰 빠르게 팔기 쉽습니다.'
                      : labels[index] === '표준'
                        ? '가격과 마진의 균형을 잡기 좋습니다.'
                        : '성공하면 개당 마진을 크게 늘릴 수 있습니다.'
                  }
                  cons={
                    labels[index] === '보급'
                      ? '개당 마진이 얇아질 수 있습니다.'
                      : labels[index] === '표준'
                        ? '가격 차별화가 약할 수 있습니다.'
                        : '수요가 예민하게 꺾일 수 있습니다.'
                  }
                  examples={[
                    `현재 실원가 ${fmtW(netCost)} 기준`,
                    `${labels[index]} 선택 시 판매가 ${fmtW(nextPrice)}`,
                    labels[index] === '보급' ? '처음 시장 반응을 보거나 저가 공세를 할 때 적합합니다.' : labels[index] === '표준' ? '가장 먼저 눌러보고 슬라이더로 미세 조정하기 좋습니다.' : '브랜드가 받쳐주고 품질 우위를 밀고 싶을 때 적합합니다.',
                  ]}
                  state="클릭하면 판매가 입력칸이 이 값으로 채워집니다."
                >
                  <button
                    type="button"
                    className="price-preset-btn"
                    onClick={() => s.setSellPrice(nextPrice)}
                  >
                    {labels[index]}가
                    <small>{fmtW(nextPrice)}</small>
                  </button>
                </HoverHint>
              );
            })}
          </div>

          <div className="price-row">
            <input
              type="range"
              className="price-slider"
              min={0}
              max={maxPrice}
              step={100}
              value={s.sellPrice}
              onChange={(event) => s.setSellPrice(event.target.value)}
            />
            <input
              type="number"
              className="price-input"
              min={0}
              max={maxPrice}
              step={100}
              value={s.sellPrice || ''}
              onChange={(event) => s.setSellPrice(event.target.value)}
              placeholder="0"
            />
            <span className="price-unit">원</span>
          </div>

          {s.sellPrice > 0 && s.sellPrice < netCost && (
            <div className="price-warning">현재 판매가는 실원가보다 낮습니다.</div>
          )}

          {bep && (
            <div className="bep-grid">
              <div className="bep-cell">
                <div className="bep-lbl">월 고정비</div>
                <div className="bep-val">{fmtW(bep.totalFixed)}</div>
              </div>
              <div className="bep-cell">
                <div className="bep-lbl">손익분기</div>
                <div className="bep-val">{isFinite(bep.bep) ? `${bep.bep.toLocaleString('ko-KR')}개` : '적자 구조'}</div>
              </div>
              <div className="bep-cell">
                <div className="bep-lbl">마진율</div>
                <div className="bep-val">{bep.rate}%</div>
              </div>
              <div className="bep-cell">
                <div className="bep-lbl">금융비용</div>
                <div className="bep-val">{fmtW(bep.monthInt)}</div>
              </div>
            </div>
          )}

          <div className="opp-box">
            <div className="opp-title">기회비용 비교</div>
            <div className="opp-grid">
              <div className={`opp-cell ${s.capital >= mktRefBudget ? '' : 'opp-dim'}`}>
                <div className="opp-name">마케팅 {fmtW(mktRefBudget)}</div>
                <div className="opp-line">브랜드 +{mktBrandGain.toFixed(1)}pt</div>
                <div className="opp-line">인지도 +{(mktAwareGain * 100).toFixed(1)}%</div>
              </div>
              <div className={`opp-cell ${nextTier?.unlockCost && s.capital >= nextTier.unlockCost ? '' : 'opp-dim'}`}>
                <div className="opp-name">R&D 해금 {fmtW(rdRefBudget)}</div>
                <div className="opp-line">{nextTier?.code || 'T4'} 시장 진입</div>
                <div className="opp-line">불황 리스크도 함께 상승</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
