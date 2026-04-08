import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { ECO_META } from '../constants.js';

export default function EcoBanner() {
  const s = useGameStore(useShallow(state => ({
    turn: state.turn,
    maxTurns: state.maxTurns,
    phase: state.economy.phase,
    inflationIndex: state.inflationIndex || 100,
    rate: state.effectiveInterestRate || state.interestRate || 0,
    policyTitle: state.lastTurnResult?.policyTitle || '없음',
    policyDelta: state.lastTurnResult?.policyDelta || 0,
    bsActive: state._bsActive,
    bsLeft: state._bsTurnsLeft,
  })));
  const meta = ECO_META[s.phase] || ECO_META.stable;

  const summary = `금리 ${(s.rate * 100).toFixed(1)}% · 물가지수 ${s.inflationIndex.toFixed(0)} · 정책 ${s.policyTitle}`;
  const detail = `정책 변동: ${s.policyDelta >= 0 ? '+' : ''}${s.policyDelta.toLocaleString('ko-KR')}원`;

  return (
    <div className={`eco-banner ${meta.cls}`} title={`${summary}\n${detail}`}>
      <span className="eco-icon">{meta.icon}</span>
      <div className="eco-body">
        <div className="eco-name">{meta.name}</div>
        <div className="eco-desc">{summary}</div>
      </div>
      <span className="eco-badge">
        {s.bsActive
          ? `⚠ ${s.bsActive.title.slice(0, 8)}… ${s.bsLeft}턴`
          : `T${s.turn} / ${s.maxTurns}`}
      </span>
    </div>
  );
}
