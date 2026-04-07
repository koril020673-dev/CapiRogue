import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { ECO_META } from '../constants.js';

export default function EcoBanner() {
  const turn    = useGameStore(s => s.turn);
  const phase   = useGameStore(s => s.economy.phase);
  const bsActive = useGameStore(s => s._bsActive);
  const bsLeft  = useGameStore(s => s._bsTurnsLeft);
  const meta = ECO_META[phase] || ECO_META.stable;

  return (
    <div className={`eco-banner ${meta.cls}`}>
      <span className="eco-icon">{meta.icon}</span>
      <div className="eco-body">
        <div className="eco-name">{meta.name}</div>
        <div className="eco-desc">{meta.desc}</div>
      </div>
      <span className="eco-badge">
        {bsActive
          ? `⚠ ${bsActive.title.slice(0, 8)}… ${bsLeft}턴`
          : `T${turn} / 120`}
      </span>
    </div>
  );
}
