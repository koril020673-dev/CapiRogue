import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { ECO_META } from '../constants.js';

export default function EcoBanner() {
  const turn    = useGameStore(s => s.turn);
  const phase   = useGameStore(s => s.economy.phase);
  const cpi     = useGameStore(s => s.lastTurnResult?.priceDemandMul || 1);
  const rate    = useGameStore(s => s.effectiveInterestRate || s.interestRate || 0);
  const policyTitle = useGameStore(s => s.lastTurnResult?.policyTitle || '없음');
  const policyDelta = useGameStore(s => s.lastTurnResult?.policyDelta || 0);
  const bsActive = useGameStore(s => s._bsActive);
  const bsLeft  = useGameStore(s => s._bsTurnsLeft);
  const meta = ECO_META[phase] || ECO_META.stable;

  const summary = `금리 ${(rate * 100).toFixed(1)}% · 물가지수 ${(cpi * 100).toFixed(0)} · 정책 ${policyTitle}`;
  const detail = `정책 변동: ${policyDelta >= 0 ? '+' : ''}${policyDelta.toLocaleString('ko-KR')}원`;

  return (
    <div className={`eco-banner ${meta.cls}`} title={`${summary}\n${detail}`}>
      <span className="eco-icon">{meta.icon}</span>
      <div className="eco-body">
        <div className="eco-name">{meta.name}</div>
        <div className="eco-desc">{summary}</div>
      </div>
      <span className="eco-badge">
        {bsActive
          ? `⚠ ${bsActive.title.slice(0, 8)}… ${bsLeft}턴`
          : `T${turn} / 120`}
      </span>
    </div>
  );
}
