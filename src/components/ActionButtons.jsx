import React from 'react';
import { useGameStore } from '../store/useGameStore.js';

export default function ActionButtons() {
  const difficulty = useGameStore(s => s.difficulty);
  const openModal  = useGameStore(s => s.openModal);

  return (
    <div className="action-row">
      <button className="action-btn" onClick={() => openModal('realty')}>부동산</button>
      <button className="action-btn" onClick={() => openModal('finance')}>대출·상환</button>
      {(difficulty === 'hard' || difficulty === 'insane') && (
        <button className="action-btn action-btn-p" onClick={() => openModal('mna')}>M&A</button>
      )}
      <button className="action-btn action-btn-g" onClick={() => openModal('meta')}>업적</button>
    </div>
  );
}
