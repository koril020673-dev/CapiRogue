import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { calcBEP, calcMktAwarenessGain, calcMktBrandGain, estimateBaseDemand } from '../calculations.js';
import { C } from '../constants.js';
import { getQualityMeta, getTierMeta, INDUSTRY_TIERS, QUALITY_MODES } from '../designData.js';
import { fmtW, sign } from '../utils.js';

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
      <div className="tier-card-meta">{tier.examples.join(' · ')}</div>
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
  const qualityMeta = getQualityMeta(s.qualityMode);
  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
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
    { label: '보수', value: Math.max(50, Math.round(demandRef * 0.7)) },
    { label: '기준', value: Math.max(50, Math.round(demandRef * 1.0)) },
    { label: '공세', value: Math.max(50, Math.round(demandRef * 1.3)) },
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
    qualityMode: s.qualityMode,
  }) : null;

  const mktRefBudget = 10_000_000;
  const rdRefBudget = nextTier?.unlockCost || C.FACTORY_UPGRADE_COST;
  const mktBrandGain = calcMktBrandGain(mktRefBudget);
  const mktAwareGain = calcMktAwarenessGain(mktRefBudget);

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
          <button
            type="button"
            className="tier-upgrade-btn"
            onClick={s.unlockIndustryTier}
            disabled={s.capital < nextTier.unlockCost}
          >
            {nextTier.code} 해금 {fmtW(nextTier.unlockCost)}
          </button>
        ) : (
          <div className="tier-upgrade-done">최고 티어 도달</div>
        )}
      </div>

      <div className="tier-grid">
        {INDUSTRY_TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            active={tier.id === s.industryTier}
            locked={tier.id > s.industryTier}
            disabled
          />
        ))}
      </div>

      <div className="quality-mode-box">
        <div className="order-plan-title">품질 모드</div>
        <div className="quality-mode-grid">
          {Object.values(QUALITY_MODES).map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`quality-mode-btn${s.qualityMode === mode.id ? ' active' : ''}`}
              onClick={() => s.setQualityMode(mode.id)}
            >
              <strong>{mode.label}</strong>
              <span>원가 x{mode.costMul.toFixed(2)}</span>
              <span>품질 x{mode.qualityMul.toFixed(2)}</span>
            </button>
          ))}
        </div>
        <div className="order-plan-help">{qualityMeta.summary}</div>
      </div>

      {!s.selectedVendor ? (
        <div className="price-hint">먼저 OEM 계약을 고르면 품질 모드와 발주 계획을 설정할 수 있습니다.</div>
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

          <div className="price-presets">
            {suggestedPlans.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="price-preset-btn"
                onClick={() => s.setPlannedOrderUnits(preset.value)}
              >
                {preset.label}
                <br />
                <small>{preset.value.toLocaleString('ko-KR')}개</small>
              </button>
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

          <div className="price-presets">
            {[1.2, 1.6, 2.2].map((multiplier, index) => {
              const nextPrice = Math.round(netCost * multiplier / 100) * 100;
              const labels = ['보급', '표준', '프리미엄'];
              return (
                <button
                  key={multiplier}
                  type="button"
                  className="price-preset-btn"
                  onClick={() => s.setSellPrice(nextPrice)}
                >
                  {labels[index]}
                  <br />
                  <small>{fmtW(nextPrice)}</small>
                </button>
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
