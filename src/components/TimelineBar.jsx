import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { getCycleTurn, getRunCycle } from '../utils.js';

const MARKERS = [
  { pct: 0.8,   label: '프롤로그', icon: '◆' },
  { pct: 30.4,  label: '37턴: 성장기 진입 — 경쟁 심화', icon: '⚔' },
  { pct: 66.1,  label: '80턴~: 블랙 스완 경고', icon: '☠' },
  { pct: 92.5,  label: '111턴: 피날레', icon: '◆' },
];

function getCampaignLabel(turn) {
  if (turn >= 111) return '피날레 구간';
  if (turn >= 80) return '위기 대비 구간';
  if (turn >= 37) return '확장 경쟁 구간';
  return '창업 부트스트랩 구간';
}

export default function TimelineBar() {
  const s = useGameStore(useShallow(state => ({
    turn: state.turn,
    maxTurns: state.maxTurns,
    challenge: state.challenge,
    bsActive: state._bsActive,
    newsFeed: state.newsFeed || [],
  })));
  const infiniteMode = Boolean(s.challenge?.infiniteMode);
  const turn = getCycleTurn(s.turn, s.maxTurns, infiniteMode);
  const cycle = getRunCycle(s.turn, s.maxTurns, infiniteMode);
  const maxTurns = s.maxTurns;
  const bsActive = s.bsActive;
  const pct = Math.min((turn / maxTurns) * 100, 100);
  const timelineNews = s.newsFeed
    .filter(n => !infiniteMode || getRunCycle(n.turn, maxTurns, true) === cycle)
    .filter(n => n.tag === 'policy' || n.tag === 'macro')
    .slice(0, 4)
    .map(n => ({ ...n, left: Math.min(100, (getCycleTurn(n.turn, maxTurns, infiniteMode) / maxTurns) * 100) }));
  const campaignLabel = getCampaignLabel(turn);

  return (
    <div className="timeline-bar">
      <div className="tl-brand">
        <span className="tl-kicker">Command Deck</span>
        <span className="tl-label">CapiRogue</span>
      </div>
      <div className="tl-route">
        <div className="tl-stage-copy">{campaignLabel}</div>
        <div className="tl-track">
          <div className="tl-fill" style={{ width: pct + '%' }} />
          {MARKERS.map((m, i) => (
            <div
              key={i}
              className={`tl-marker${m.icon === '☠' && bsActive ? ' tl-marker-bs-active' : ''}`}
              style={{ left: m.pct + '%' }}
              title={m.label}
            >
              {m.icon}
            </div>
          ))}
          {timelineNews.map(n => (
            <div
              key={n.id}
              className={`tl-news-marker ${n.type === 'good' ? 'good' : n.type === 'bad' ? 'bad' : 'neu'}`}
              style={{ left: `${n.left}%` }}
              title={`T${n.turn} ${n.title}`}
            >
              {n.icon || '•'}
            </div>
          ))}
          <div className="tl-marker-cur" style={{ left: pct + '%' }} />
        </div>
      </div>
      <div className="tl-side">
        <span className={`tl-alert${bsActive ? '' : ' calm'}`}>
          {bsActive ? `위기 경보 · ${bsActive.title}` : '정상 운영'}
        </span>
        <span className="tl-turn-info">
          <strong>{turn}</strong> / {maxTurns}개월{infiniteMode ? ` · Loop ${cycle}` : ''}
        </span>
      </div>
    </div>
  );
}
