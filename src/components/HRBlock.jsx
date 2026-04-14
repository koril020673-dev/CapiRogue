import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { C } from '../constants.js';
import { calcMktBrandGain, calcMktAwarenessGain } from '../calculations.js';
import { fmtW } from '../utils.js';
import HoverHint from './HoverHint.jsx';

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
  const marketingBlocked = s.mktThisTurn || budget < C.MARKETING_MIN_BUDGET || s.capital < budget;

  const salesBlockedReason = s.salesTraining.usedThisTurn
    ? '이번 달에는 이미 영업·CS 교육을 실행했습니다.'
    : s.salesTraining.count >= s.salesTraining.max
      ? '영업·CS 교육 최대 10회를 모두 사용했습니다.'
      : `${fmtW(C.HR_TRAIN_COST)}이 있어야 실행할 수 있습니다.`;

  const prodBlockedReason = s.prodTraining.usedThisTurn
    ? '이번 달에는 이미 물류·생산 교육을 실행했습니다.'
    : s.prodTraining.count >= s.prodTraining.max
      ? '물류·생산 교육 최대 10회를 모두 사용했습니다.'
      : `${fmtW(C.HR_TRAIN_COST)}이 있어야 실행할 수 있습니다.`;

  const marketingBlockedReason = s.mktThisTurn
    ? '이번 달에는 이미 마케팅을 집행했습니다.'
    : budget < C.MARKETING_MIN_BUDGET
      ? `최소 ${fmtW(C.MARKETING_MIN_BUDGET)}부터 집행할 수 있습니다.`
      : `현재 예산 ${fmtW(budget)}을 집행할 현금이 부족합니다.`;

  return (
    <div className="hr-block">
      <div className="hr-row">
        <HoverHint
          fill
          disabled={salesBlocked}
          title="영업·CS 교육"
          description="영업 스크립트와 고객 응대를 다듬어 같은 제품도 더 높은 가격에 버틸 수 있게 만드는 교육입니다."
          pros="가격 저항성이 올라가면 같은 상품도 더 비싸게 버틸 여지가 생깁니다."
          cons="이번 달 1회만 가능하고, 총 10회까지만 누적됩니다."
          state={salesBlocked ? `지금 못 누르는 이유: ${salesBlockedReason}` : '지금 누르면 가격 저항성이 바로 올라갑니다.'}
        >
          <button
            type="button"
            className="hr-btn"
            disabled={salesBlocked}
            onClick={s.doSalesTrain}
          >
            <div className="hr-btn-label">영업·CS 교육</div>
            <div className="hr-btn-meta">
              {fmtW(C.HR_TRAIN_COST)} · {s.salesTraining.count}/{s.salesTraining.max}회
              {s.salesTraining.usedThisTurn && <span className="hr-done"> ✓</span>}
            </div>
            <div className="hr-eff">저항성 +2%</div>
          </button>
        </HoverHint>

        <HoverHint
          fill
          disabled={prodBlocked}
          title="물류·생산 교육"
          description="공정 안전과 현장 숙련도를 높여 생산 사고와 운영 리스크를 줄이는 교육입니다."
          pros="산재 위험을 낮춰 장기적으로 공장 사고 리스크를 안정화합니다."
          cons="이번 달 1회만 가능하고, 누적 상한에 도달하면 더는 강화되지 않습니다."
          state={prodBlocked ? `지금 못 누르는 이유: ${prodBlockedReason}` : '지금 누르면 산재 위험이 바로 감소합니다.'}
        >
          <button
            type="button"
            className="hr-btn"
            disabled={prodBlocked}
            onClick={s.doProdTrain}
          >
            <div className="hr-btn-label">물류·생산 교육</div>
            <div className="hr-btn-meta">
              {fmtW(C.HR_TRAIN_COST)} · {s.prodTraining.count}/{s.prodTraining.max}회
              {s.prodTraining.usedThisTurn && <span className="hr-done"> ✓</span>}
            </div>
            <div className="hr-eff">산재위험 -5%</div>
          </button>
        </HoverHint>
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
          <HoverHint
            disabled={marketingBlocked}
            title="마케팅 집행"
            description="광고와 홍보로 브랜드와 인지도를 올려 수요를 넓히는 직접 투자입니다."
            pros="예산이 충분하면 브랜드와 인지도 둘 다 즉시 상승합니다."
            cons="이번 달 1회 제한이고, 현금이 바로 빠져나갑니다."
            state={marketingBlocked ? `지금 못 누르는 이유: ${marketingBlockedReason}` : '지금 누르면 입력한 예산만큼 바로 집행됩니다.'}
          >
            <button
              type="button"
              className="mkt-btn"
              disabled={marketingBlocked}
              onClick={() => { s.doMarketing(budget); setMktBudget(''); }}
            >
              집행
            </button>
          </HoverHint>
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
