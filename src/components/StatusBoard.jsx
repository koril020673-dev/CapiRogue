import React from 'react';
import { useGameStore } from '../store/useGameStore.js';

export default function StatusBoard() {
  const effects = useGameStore((state) => state.activeEffects || []);

  return (
    <div className="status-board">
      <div className="log-title">활성 효과</div>
      {effects.length === 0 ? (
        <div className="log-empty">현재 유지 중인 일시 효과가 없습니다.</div>
      ) : (
        effects.map((effectItem, index) => (
          <div
            key={`${effectItem.source || 'effect'}-${index}`}
            className={`status-item ${effectItem.positive ? 'status-pos' : effectItem.positive === false ? 'status-neg' : 'status-neu'}`}
          >
            <span className="status-name">{effectItem.label || effectItem.name || effectItem.source || '효과'}</span>
            <span className="status-turns">{effectItem.turnsLeft ?? 0}턴</span>
          </div>
        ))
      )}
    </div>
  );
}
