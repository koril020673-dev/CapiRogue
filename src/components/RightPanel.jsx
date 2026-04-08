import React, { useMemo, useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
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
  const s = useGameStore(useShallow(state => ({
    marketShare: state.marketShare,
    rivals: state.rivals,
    newsFeed: state.newsFeed || [],
  })));
  const [policyFilter, setPolicyFilter] = useState('all');
  const activeRivals = useMemo(() => s.rivals.filter(r => !r.bankrupt), [s.rivals]);
  const topRival = useMemo(() => (
    activeRivals.reduce((best, rival) => (
      (rival.marketShare || 0) > (best?.marketShare || 0) ? rival : best
    ), null)
  ), [activeRivals]);

  const filteredPolicyNews = useMemo(() => {
    const base = s.newsFeed.filter(n => n.tag === 'policy');
    if (policyFilter === 'all') return base;
    if (policyFilter === 'regulation') return base.filter(n => n.type === 'bad');
    if (policyFilter === 'subsidy') return base.filter(n => n.type === 'good');
    return base;
  }, [s.newsFeed, policyFilter]);

  return (
    <div className="panel-right">
      <div className="rp-overview">
        <div className="rp-overview-kicker">Market Intel</div>
        <div className="rp-overview-title">경쟁 전황 브리핑</div>
        <div className="rp-overview-sub">
          활성 라이벌 {activeRivals.length}명 · 최대 위협 {topRival ? topRival.name : '없음'}
        </div>
      </div>

      <div className="rp-card">
        <div className="rp-title">시장 점유율</div>
        <PieChart myShare={s.marketShare} rivals={s.rivals} />
      </div>

      <div className="rp-card">
        <div className="rp-title">라이벌</div>
        <div className="rivals-list">
          {s.rivals.length === 0 ? (
            <div className="rivals-empty">라이벌 없음</div>
          ) : (
            s.rivals.map((r, index) => (
              <div key={r.name} className={`rival-row${r.bankrupt ? ' v-dim' : ''}`}>
                <div className="rival-dot" style={{ background: PIE_COLORS[index + 1] || '#666' }} />
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

      <div className="rp-card">
        <div className="rp-title">정책 이력</div>
        <div className="policy-filter-row">
          <button className={`policy-filter-btn${policyFilter === 'all' ? ' active' : ''}`} onClick={() => setPolicyFilter('all')}>전체</button>
          <button className={`policy-filter-btn${policyFilter === 'regulation' ? ' active' : ''}`} onClick={() => setPolicyFilter('regulation')}>규제</button>
          <button className={`policy-filter-btn${policyFilter === 'subsidy' ? ' active' : ''}`} onClick={() => setPolicyFilter('subsidy')}>보조금</button>
        </div>
        <div className="policy-history-list">
          {filteredPolicyNews.length === 0 ? (
            <div className="rivals-empty">정책 이벤트 없음</div>
          ) : (
            filteredPolicyNews.slice(0, 6).map(item => (
              <div key={item.id} className={`policy-item ${item.type === 'good' ? 'good' : item.type === 'bad' ? 'bad' : 'neu'}`} title={item.body || ''}>
                <span className="policy-turn">T{item.turn}</span>
                <span className="policy-title">{item.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
