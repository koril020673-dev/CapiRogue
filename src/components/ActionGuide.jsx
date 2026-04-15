import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';

function getSteps(state) {
  const hasSearch = state.wholesaleOptions.length > 0;
  const hasVendor = Boolean(state.selectedVendor);
  const hasOrderSetup = state.plannedOrderUnits > 0;
  const hasPrice = state.sellPrice > 0;
  const optionalDone = state.salesTraining.usedThisTurn || state.prodTraining.usedThisTurn || state.mktThisTurn;
  const factoryActive = state.factory?.built && state.factory?.buildTurnsLeft <= 0;
  const lineSelectionOpen = factoryActive && state.factory?.productSelectionOpen;

  return [
    {
      id: 1,
      label: factoryActive ? (lineSelectionOpen ? '새 라인 탐색' : '라인 고정') : '아이템 탐색',
      status: factoryActive ? (lineSelectionOpen ? 'active' : 'done') : hasSearch ? 'done' : 'active',
    },
    {
      id: 2,
      label: factoryActive ? '라인 확정' : 'OEM 계약',
      status: factoryActive
        ? (lineSelectionOpen ? hasVendor ? 'done' : 'active' : 'done')
        : !hasSearch ? 'locked' : hasVendor ? 'done' : 'active',
    },
    { id: 3, label: '품질/발주', status: !hasVendor ? 'locked' : hasOrderSetup ? 'done' : 'active' },
    { id: 4, label: '판매가 설정', status: !hasOrderSetup ? 'locked' : hasPrice ? 'done' : 'active' },
    { id: 5, label: '선택 행동', status: !hasPrice ? 'locked' : optionalDone ? 'done' : 'optional' },
    { id: 6, label: '결재 후 실행', status: hasVendor && hasOrderSetup && hasPrice ? 'active' : 'locked' },
  ];
}

export default function ActionGuide() {
  const state = useGameStore(useShallow((store) => ({
    wholesaleOptions: store.wholesaleOptions,
    selectedVendor: store.selectedVendor,
    plannedOrderUnits: store.plannedOrderUnits,
    sellPrice: store.sellPrice,
    salesTraining: store.salesTraining,
    prodTraining: store.prodTraining,
    mktThisTurn: store.mktThisTurn,
    factory: store.factory,
  })));

  return (
    <div className="action-guide">
      {getSteps(state).map((step, index, steps) => (
        <React.Fragment key={step.id}>
          <div className={`ag-step ag-step-${step.status}`}>
            <span className="ag-num">{step.status === 'done' ? '✓' : step.id}</span>
            <span className="ag-label">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`ag-arrow ${step.status === 'done' ? 'ag-arrow-done' : ''}`}>→</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
