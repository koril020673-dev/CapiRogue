import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { calcBEP } from '../calculations.js';
import { fmtW, sign } from '../utils.js';

export default function PriceBlock() {
  const selectedVendor = useGameStore(s => s.selectedVendor);
  const sellPrice      = useGameStore(s => s.sellPrice);
  const setSellPrice   = useGameStore(s => s.setSellPrice);
  const factory        = useGameStore(s => s.factory);
  const debt           = useGameStore(s => s.debt);
  const interestRate   = useGameStore(s => s.interestRate);
  const realty         = useGameStore(s => s.realty);
  const mna            = useGameStore(s => s.mna);
  const economy        = useGameStore(s => s.economy);
  const monthlyFixedCost = useGameStore(s => s.monthlyFixedCost);

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
        </>
      )}
    </div>
  );
}
