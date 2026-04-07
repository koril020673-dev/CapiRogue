import React from 'react';
import { useGameStore } from '../store/useGameStore.js';

const MARKERS = [
  { pct: 0.8,   label: '프롤로그', icon: '◆' },
  { pct: 30.4,  label: '37턴: 성장기 진입 — 경쟁 심화', icon: '⚔' },
  { pct: 66.1,  label: '80턴~: 블랙 스완 경고', icon: '☠' },
  { pct: 92.5,  label: '111턴: 피날레', icon: '◆' },
];

export default function TimelineBar() {
  const turn    = useGameStore(s => s.turn);
  const maxTurns = useGameStore(s => s.maxTurns);
  const bsActive = useGameStore(s => s._bsActive);
  const newsFeed = useGameStore(s => s.newsFeed || []);
  const pct = Math.min((turn / maxTurns) * 100, 100);
  const timelineNews = newsFeed
    .filter(n => n.tag === 'policy' || n.tag === 'macro')
    .slice(0, 4)
    .map(n => ({ ...n, left: Math.min(100, (n.turn / maxTurns) * 100) }));

  return (
    <div className="timeline-bar">
      <span className="tl-label">캐피로그</span>
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
      <span className="tl-turn-info">
        <strong>{turn}</strong>/120개월
      </span>
    </div>
  );
}
