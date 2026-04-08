import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { calcBEP, calcMktAwarenessGain, calcMktBrandGain } from '../calculations.js';
import { C } from '../constants.js';
import { fmtW, sign } from '../utils.js';

export default function PriceBlock() {
  const s = useGameStore(useShallow(state => ({
    selectedVendor: state.selectedVendor,
    sellPrice: state.sellPrice,
    setSellPrice: state.setSellPrice,
    orderPlanMul: state.orderPlanMul,
    setOrderPlanMul: state.setOrderPlanMul,
    factory: state.factory,
    debt: state.debt,
    interestRate: state.interestRate,
    effectiveInterestRate: state.effectiveInterestRate,
    realty: state.realty,
    mna: state.mna,
    economy: state.economy,
    monthlyFixedCost: state.monthlyFixedCost,
    capital: state.capital,
  })));

  const storeState = {
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
  };
  const bep = s.selectedVendor ? calcBEP(storeState) : null;

  const unitCost  = s.selectedVendor?.unitCost || 0;
  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  const netCost   = factoryActive ? Math.round(unitCost * 0.6) : unitCost;
  const maxPrice  = Math.round(unitCost * 8);
  const unitMargin = s.sellPrice > 0 ? s.sellPrice - netCost : 0;

  const pricePresets = [
    { label: '보급형', mult: 1.2, color: 'var(--green)' },
    { label: '표준형', mult: 1.5, color: 'var(--blue)'  },
    { label: '프리미엄', mult: 2.5, color: 'var(--yellow)' },
  ];

  const mktRefBudget = 10_000_000;
  const rdRefBudget = C.FACTORY_UPGRADE_COST;
  const mktBrandGain = calcMktBrandGain(mktRefBudget);
  const mktAwareGain = calcMktAwarenessGain(mktRefBudget);
  const rdQualityGain = 20;
  const canRd = s.capital >= rdRefBudget;
  const canMkt = s.capital >= mktRefBudget;

  return (
    <div className="price-block">
      {!s.selectedVendor ? (
        <div className="price-hint">도매업체를 먼저 선택하세요</div>
      ) : (
        <>
          <div className="price-hero">
            <div className="price-hero-card">
              <span>현재 판매가</span>
              <strong>{s.sellPrice > 0 ? fmtW(s.sellPrice) : '미설정'}</strong>
            </div>
            <div className={`price-hero-card${unitMargin > 0 ? ' good' : s.sellPrice > 0 ? ' bad' : ''}`}>
              <span>개당 마진</span>
              <strong>{s.sellPrice > 0 ? sign(unitMargin) : '–'}</strong>
            </div>
            <div className="price-hero-card">
              <span>권장 체크</span>
              <strong>{bep && isFinite(bep.bep) ? `BEP ${bep.bep}개` : '가격 조정 필요'}</strong>
            </div>
          </div>

          <div className="price-hint">
            도매가: <strong>{fmtW(netCost)}</strong>
            {factoryActive && <span style={{ color: 'var(--green)', marginLeft: 6 }}>(공장 -40%)</span>}
          </div>

          {/* Preset buttons */}
          <div className="price-presets">
            {pricePresets.map(p => {
              const v = Math.round(netCost * p.mult);
              return (
                <button
                  key={p.label}
                  className="price-preset-btn"
                  style={{ borderColor: p.color, color: p.color }}
                  onClick={() => s.setSellPrice(v)}
                >
                  {p.label}<br />
                  <small>{fmtW(v)}</small>
                </button>
              );
            })}
          </div>

          {/* Slider + input */}
          <div className="price-row">
            <input
              type="range"
              className="price-slider"
              min={0}
              max={maxPrice}
              step={100}
              value={s.sellPrice}
              onChange={e => s.setSellPrice(e.target.value)}
            />
            <input
              type="number"
              className="price-input"
              min={0}
              max={maxPrice}
              step={100}
              value={s.sellPrice || ''}
              onChange={e => s.setSellPrice(e.target.value)}
              placeholder="0"
            />
            <span className="price-unit">원</span>
          </div>

          <div className="order-plan-box">
            <div className="order-plan-title">발주 수량 계획 (수요 대비)</div>
            <div className="order-plan-row">
              <input
                type="range"
                min={0.7}
                max={1.6}
                step={0.05}
                value={s.orderPlanMul}
                onChange={e => s.setOrderPlanMul(e.target.value)}
              />
              <strong>{Math.round(s.orderPlanMul * 100)}%</strong>
            </div>
            <div className="order-plan-help">높게 잡으면 품절 위험은 줄지만 재고/보관비 부담이 커집니다.</div>
          </div>

          {/* Below cost warning */}
          {s.sellPrice > 0 && s.sellPrice < netCost && (
            <div className="price-warning">⛔ 판매가가 도매가보다 낮습니다</div>
          )}

          {/* BEP table */}
          {bep && (
            <div className="bep-grid">
              <div className="bep-cell">
                <div className="bep-lbl">고정비</div>
                <div className="bep-val">{fmtW(bep.totalFixed)}</div>
              </div>
              <div className="bep-cell">
                <div className="bep-lbl">개당 마진</div>
                <div className="bep-val" style={{ color: bep.margin > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {bep.margin > 0 ? sign(bep.margin) : '–'}
                </div>
              </div>
              <div className="bep-cell">
                <div className="bep-lbl">손익분기</div>
                <div className="bep-val">{isFinite(bep.bep) ? bep.bep + '개' : '∞'}</div>
              </div>
              <div className="bep-cell">
                <div className="bep-lbl">마진율</div>
                <div className="bep-val">{s.selectedVendor ? bep.rate + '%' : '–'}</div>
              </div>
            </div>
          )}

          <div className="opp-box">
            <div className="opp-title">기회비용 비교 (의사결정 보조)</div>
            <div className="opp-grid">
              <div className={`opp-cell ${canMkt ? '' : 'opp-dim'}`}>
                <div className="opp-name">단기 마케팅 {fmtW(mktRefBudget)}</div>
                <div className="opp-line">브랜드 +{mktBrandGain.toFixed(1)}pt</div>
                <div className="opp-line">인지도 +{(mktAwareGain * 100).toFixed(1)}%</div>
                <div className="opp-note">포기 시: 단기 수요 부스팅 기회 상실</div>
              </div>
              <div className={`opp-cell ${canRd ? '' : 'opp-dim'}`}>
                <div className="opp-name">R&D/설비 {fmtW(rdRefBudget)}</div>
                <div className="opp-line">품질 +{rdQualityGain}pt (업그레이드 기준)</div>
                <div className="opp-line">장기 경쟁력 개선</div>
                <div className="opp-note">포기 시: 중장기 마진/점유율 개선 지연</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
