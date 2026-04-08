import React from 'react';
import { useGameStore } from '../store/useGameStore.js';

export default function StatusBoard() {
  const effects = useGameStore(s => s.activeEffects);

  return (
    <div className="status-board">
      <div className="log-title">활성 효과</div>
      {effects.length === 0 ? (
        <div className="log-empty">현재 적용 중인 효과가 없습니다</div>
      ) : (
        effects.map((e, i) => (
          <div
            key={i}
            className={`status-item ${e.positive ? 'status-pos' : e.positive === false ? 'status-neg' : 'status-neu'}`}
          >
            <span className="status-name">{e.name || e.label || '–'}</span>
            <span className="status-turns">{e.turnsLeft ?? '∞'}턴</span>
          </div>
        ))
      )}
    </div>
  );
}
