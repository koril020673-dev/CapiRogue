import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';

function getSteps(s) {
  const hasItem    = s.wholesaleOptions.length > 0;
  const hasVendor  = !!s.selectedVendor;
  const hasPrice   = s.sellPrice > 0;
  const canAdvance = hasVendor && hasPrice;

  // Optional actions done this turn
  const optDone = s.salesTraining.usedThisTurn || s.prodTraining.usedThisTurn || s.mktThisTurn;

  return [
    {
      id: 1,
      label: '아이템 탐색',
      hint: '하단 검색창에서 판매할 아이템을 검색하세요',
      status: hasItem ? 'done' : 'active',
    },
    {
      id: 2,
      label: '도매 계약',
      hint: '검색된 도매업체 중 하나를 선택하세요',
      status: !hasItem ? 'locked' : hasVendor ? 'done' : 'active',
    },
    {
      id: 3,
      label: '판매가 설정',
      hint: '경쟁이 유리한 가격을 설정하세요',
      status: !hasVendor ? 'locked' : hasPrice ? 'done' : 'active',
    },
    {
      id: 4,
      label: '선택 행동',
      hint: 'HR 교육, 마케팅, 공장 관리 등 (선택)',
      status: !hasPrice ? 'locked' : optDone ? 'done' : 'optional',
    },
    {
      id: 5,
      label: '다음 달로',
      hint: '모든 준비가 완료되면 다음 달로 넘어가세요',
      status: canAdvance ? 'active' : 'locked',
    },
  ];
}

export default function ActionGuide() {
  const s = useGameStore(useShallow(s => ({
    wholesaleOptions: s.wholesaleOptions,
    selectedVendor:   s.selectedVendor,
    sellPrice:        s.sellPrice,
    salesTraining:    s.salesTraining,
    prodTraining:     s.prodTraining,
    mktThisTurn:      s.mktThisTurn,
  })));

  const steps = getSteps(s);

  return (
    <div className="action-guide">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className={`ag-step ag-step-${step.status}`} title={step.hint}>
            <span className="ag-num">
              {step.status === 'done' ? '✓' : step.id}
            </span>
            <span className="ag-label">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`ag-arrow ${step.status === 'done' ? 'ag-arrow-done' : ''}`}>›</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
