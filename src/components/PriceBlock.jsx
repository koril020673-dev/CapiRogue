import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { calcBEP, calcMktAwarenessGain, calcMktBrandGain } from '../calculations.js';
import { C } from '../constants.js';
import { fmtW, sign } from '../utils.js';

export default function PriceBlock() {
  const selectedVendor = useGameStore(s => s.selectedVendor);
  const sellPrice      = useGameStore(s => s.sellPrice);
  const setSellPrice   = useGameStore(s => s.setSellPrice);
  const orderPlanMul   = useGameStore(s => s.orderPlanMul);
  const setOrderPlanMul = useGameStore(s => s.setOrderPlanMul);
  const factory        = useGameStore(s => s.factory);
  const debt           = useGameStore(s => s.debt);
  const interestRate   = useGameStore(s => s.interestRate);
  const realty         = useGameStore(s => s.realty);
  const mna            = useGameStore(s => s.mna);
  const economy        = useGameStore(s => s.economy);
  const monthlyFixedCost = useGameStore(s => s.monthlyFixedCost);
  const capital = useGameStore(s => s.capital);

  const storeState = { factory, debt, interestRate, realty, mna, economy, monthlyFixedCost, selectedVendor, sellPrice };
  const bep = selectedVendor ? calcBEP(storeState) : null;

  const unitCost  = selectedVendor?.unitCost || 0;
  const factoryActive = factory.built && factory.buildTurnsLeft <= 0;
  const netCost   = factoryActive ? Math.round(unitCost * 0.6) : unitCost;
  const maxPrice  = Math.round(unitCost * 8);

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
  const canRd = capital >= rdRefBudget;
  const canMkt = capital >= mktRefBudget;

  return (
    <div className="price-block">
      {!selectedVendor ? (
        <div className="price-hint">도매업체를 먼저 선택하세요</div>
      ) : (
        <>
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
                  onClick={() => setSellPrice(v)}
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
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
            />
            <input
              type="number"
              className="price-input"
              min={0}
              max={maxPrice}
              step={100}
              value={sellPrice || ''}
              onChange={e => setSellPrice(e.target.value)}
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
                value={orderPlanMul}
                onChange={e => setOrderPlanMul(e.target.value)}
              />
              <strong>{Math.round(orderPlanMul * 100)}%</strong>
            </div>
            <div className="order-plan-help">높게 잡으면 품절 위험은 줄지만 재고/보관비 부담이 커집니다.</div>
          </div>

          {/* Below cost warning */}
          {sellPrice > 0 && sellPrice < netCost && (
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
                <div className="bep-val">{selectedVendor ? bep.rate + '%' : '–'}</div>
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
