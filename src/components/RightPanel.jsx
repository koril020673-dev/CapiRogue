import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { PIE_COLORS } from '../constants.js';
import { RIVAL_BLUEPRINTS } from '../designData.js';
import { fmtW, pct } from '../utils.js';

function PieChart({ myShare, rivals }) {
  const slices = [
    { name: '우리 회사', share: myShare, color: PIE_COLORS[0] },
    ...rivals.filter((rival) => !rival.bankrupt).map((rival, index) => ({
      name: rival.name,
      share: rival.marketShare || 0,
      color: PIE_COLORS[index + 1] || '#888',
    })),
  ].filter((item) => item.share > 0);

  const total = slices.reduce((sum, slice) => sum + slice.share, 0);
  const other = Math.max(0, 1 - total);
  if (other > 0.01) slices.push({ name: '기타', share: other, color: '#30363D' });

  let degree = 0;
  const stops = slices.map((slice) => {
    const start = degree;
    degree += slice.share * 360;
    return `${slice.color} ${start.toFixed(1)}deg ${degree.toFixed(1)}deg`;
  });

  return (
    <div className="pie-wrap">
      <div className="pie-canvas" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
        <div className="pie-center">{(myShare * 100).toFixed(1)}%</div>
      </div>
      <div className="pie-legend">
        {slices.map((slice) => (
          <div key={slice.name} className="pie-legend-row">
            <div className="pie-dot" style={{ background: slice.color }} />
            <span className="pie-name">{slice.name}</span>
            <span className="pie-pct">{(slice.share * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RightPanel() {
  const s = useGameStore(useShallow((state) => ({
    marketShare: state.marketShare,
    rivals: state.rivals,
    newsFeed: state.newsFeed || [],
    itemTier: state.itemTier,
  })));

  const activeRivals = useMemo(() => s.rivals.filter((rival) => !rival.bankrupt), [s.rivals]);
  const topRival = useMemo(() => (
    activeRivals.reduce((best, rival) => (
      (rival.marketShare || 0) > (best?.marketShare || 0) ? rival : best
    ), null)
  ), [activeRivals]);

  return (
    <div className="panel-right" data-tutorial="intel-panel">
      <div className="rp-overview">
        <div className="rp-overview-kicker">Market Intel</div>
        <div className="rp-overview-title">라이벌 브리핑</div>
        <div className="rp-overview-sub">
          현재 시장 티어 T{s.itemTier || 1} · 주요 위협 {topRival ? topRival.name : '없음'}
        </div>
      </div>

      <div className="rp-card">
        <div className="rp-title">시장 점유율</div>
        <PieChart myShare={s.marketShare} rivals={s.rivals} />
      </div>

      <div className="rp-card">
        <div className="rp-title">라이벌 4인방</div>
        <div className="rivals-list rivals-list-rich">
          {s.rivals.map((rival, index) => {
            const profile = RIVAL_BLUEPRINTS[rival.archetype] || RIVAL_BLUEPRINTS.aggressive;
            return (
              <div key={rival.name} className={`rival-rich-card${rival.bankrupt ? ' v-dim' : ''}`}>
                <div className="rival-rich-head">
                  <div className="rival-dot" style={{ background: PIE_COLORS[index + 1] || '#666' }} />
                  <strong>{profile.icon} {rival.name}</strong>
                  <span className="rival-type-badge">{profile.label}</span>
                </div>
                <div className="rival-rich-copy">{profile.primer}</div>
                <div className="rival-rich-meta">강점 구간: {profile.strengthPhase}</div>
                <div className="rival-rich-meta">파훼 포인트: {profile.weaknessHint}</div>
                <div className="rival-rich-stats">
                  <span>{rival.sellPrice > 0 ? fmtW(rival.sellPrice) : '미설정'}</span>
                  <span>{pct(rival.marketShare || 0)}</span>
                  <span>{rival.bankrupt ? '파산' : `품질 ${rival.qualityScore}pt`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rp-card">
        <div className="rp-title">최근 정책/뉴스</div>
        <div className="policy-history-list">
          {s.newsFeed.length === 0 ? (
            <div className="rivals-empty">아직 누적된 뉴스가 없습니다.</div>
          ) : (
            s.newsFeed.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className={`policy-item ${item.type === 'good' ? 'good' : item.type === 'bad' ? 'bad' : 'neu'}`}
                title={item.body || ''}
              >
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
