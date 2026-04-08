import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';

export default function ActionButtons() {
  const s = useGameStore(useShallow(state => ({
    difficulty: state.difficulty,
    openModal: state.openModal,
  })));

  return (
    <div className="action-row">
      <button className="action-btn" onClick={() => s.openModal('realty')}>부동산 전략</button>
      <button className="action-btn" onClick={() => s.openModal('finance')}>자금 조달</button>
      {(s.difficulty === 'hard' || s.difficulty === 'insane') && (
        <button className="action-btn action-btn-p" onClick={() => s.openModal('mna')}>M&A 작전</button>
      )}
      <button className="action-btn action-btn-g" onClick={() => s.openModal('meta')}>메타 기록</button>
    </div>
  );
}
