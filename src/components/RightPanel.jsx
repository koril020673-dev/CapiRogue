import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { PIE_COLORS, RIVAL_ARCHETYPES } from '../constants.js';
import { pct, fmtW } from '../utils.js';

const TYPE_CLASS = {
  lowcost: 'lowcost',
  premium: 'premium',
  innovation: 'innovation',
  efficient: 'efficient',
};

function PieChart({ myShare, rivals }) {
  const slices = [
    { name: '나', share: myShare, color: PIE_COLORS[0] },
    ...rivals.filter(r => !r.bankrupt).map((r, i) => ({ name: r.name, share: r.marketShare || 0, color: PIE_COLORS[1 + i] })),
  ].filter(s => s.share > 0);

  const total = slices.reduce((a, s) => a + s.share, 0);
  const other = Math.max(0, 1 - total);
  if (other > 0.01) slices.push({ name: '기타', share: other, color: '#30363D' });

  let deg = 0;
  const stops = slices.map(sl => {
    const start = deg;
    deg += sl.share * 360;
    return `${sl.color} ${start.toFixed(1)}deg ${deg.toFixed(1)}deg`;
  });

  return (
    <div className="pie-wrap">
      <div className="pie-canvas" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
        <div className="pie-center">{(myShare * 100).toFixed(1)}%</div>
      </div>
      <div className="pie-legend">
        {slices.map(sl => (
          <div key={sl.name} className="pie-legend-row">
            <div className="pie-dot" style={{ background: sl.color }} />
            <span className="pie-name">{sl.name}</span>
            <span className="pie-pct">{(sl.share * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RightPanel() {
  const marketShare = useGameStore(s => s.marketShare);
  const rivals      = useGameStore(s => s.rivals);

  return (
    <div className="panel-right">
      <div className="rp-title">시장 점유율</div>
      <PieChart myShare={marketShare} rivals={rivals} />

      <div className="divider" />

      <div className="rp-title">라이벌</div>
      <div className="rivals-list">
        {rivals.length === 0 ? (
          <div className="rivals-empty">라이벌 없음</div>
        ) : (
          rivals.map(r => (
            <div key={r.name} className={`rival-row${r.bankrupt ? ' v-dim' : ''}`}>
              <div className="rival-dot" style={{ background: PIE_COLORS[rivals.indexOf(r) + 1] || '#666' }} />
              <span className="rival-name">{r.name}{r.bankrupt ? ' 💀' : ''}</span>
              <span className={`rival-type-badge ${TYPE_CLASS[r.archetype] || 'efficient'}`}>
                {RIVAL_ARCHETYPES[r.archetype]?.label || '효율형'}
              </span>
              <span className="rival-price">{r.sellPrice > 0 ? fmtW(r.sellPrice) : '–'}</span>
              <span className="rival-share">{pct(r.marketShare || 0)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
