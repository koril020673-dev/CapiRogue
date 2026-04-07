import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { C } from '../constants.js';
import { calcMktBrandGain, calcMktAwarenessGain } from '../calculations.js';
import { fmtW } from '../utils.js';

export default function HRBlock() {
  const [mktBudget, setMktBudget] = useState('');

  const s = useGameStore(useShallow(s => ({
    capital: s.capital,
    salesTraining: s.salesTraining,
    prodTraining:  s.prodTraining,
    mktThisTurn:   s.mktThisTurn,
    doSalesTrain:  s.doSalesTrain,
    doProdTrain:   s.doProdTrain,
    doMarketing:   s.doMarketing,
  })));

  const budget   = parseInt(mktBudget) || 0;
  const brandPrv = budget > 0 ? calcMktBrandGain(budget) : 0;
  const awarenPrv = budget > 0 ? calcMktAwarenessGain(budget) : 0;

  const salesBlocked = s.salesTraining.usedThisTurn || s.salesTraining.count >= s.salesTraining.max || s.capital < C.HR_TRAIN_COST;
  const prodBlocked  = s.prodTraining.usedThisTurn  || s.prodTraining.count  >= s.prodTraining.max  || s.capital < C.HR_TRAIN_COST;

  return (
    <div className="hr-block">
      <div className="hr-row">
        {/* 영업/CS 교육 */}
        <button
          className="hr-btn"
          disabled={salesBlocked}
          onClick={s.doSalesTrain}
          title="가격 저항성 +2% (1턴 1회, 최대 10회)"
        >
          <div className="hr-btn-label">영업·CS 교육</div>
          <div className="hr-btn-meta">
            {fmtW(C.HR_TRAIN_COST)} · {s.salesTraining.count}/{s.salesTraining.max}회
            {s.salesTraining.usedThisTurn && <span className="hr-done"> ✓</span>}
          </div>
          <div className="hr-eff">저항성 +2%</div>
        </button>

        {/* 물류/생산 교육 */}
        <button
          className="hr-btn"
          disabled={prodBlocked}
          onClick={s.doProdTrain}
          title="산재위험 -5% (1턴 1회, 최대 10회)"
        >
          <div className="hr-btn-label">물류·생산 교육</div>
          <div className="hr-btn-meta">
            {fmtW(C.HR_TRAIN_COST)} · {s.prodTraining.count}/{s.prodTraining.max}회
            {s.prodTraining.usedThisTurn && <span className="hr-done"> ✓</span>}
          </div>
          <div className="hr-eff">산재위험 -5%</div>
        </button>
      </div>

      {/* 마케팅 */}
      <div className={`mkt-row${s.mktThisTurn ? ' mkt-done' : ''}`}>
        <div className="mkt-label">
          마케팅 집행
          {s.mktThisTurn && <span className="hr-done"> ✓ 완료</span>}
        </div>
        <div className="mkt-input-row">
          <input
            type="number"
            className="mkt-input"
            placeholder="예산 (원)"
            min={0}
            step={100000}
            value={mktBudget}
            disabled={s.mktThisTurn}
            onChange={e => setMktBudget(e.target.value)}
          />
          <button
            className="mkt-btn"
            disabled={s.mktThisTurn || budget < C.MARKETING_MIN_BUDGET || s.capital < budget}
            onClick={() => { s.doMarketing(budget); setMktBudget(''); }}
          >
            집행
          </button>
        </div>
        {budget > 0 && !s.mktThisTurn && (
          <div className="mkt-preview">
            브랜드 +{brandPrv.toFixed(1)}pt · 인지도 +{(awarenPrv * 100).toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
}
