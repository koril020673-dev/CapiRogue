import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { DIFF_CONFIG } from '../constants.js';
import { loadMeta } from '../utils.js';

const CARDS = [
  { diff: 'easy',   icon: '🌱', name: 'Easy',   desc: 'AI 비서 지원 · 넉넉한 시작자본', color: '#3FB950' },
  { diff: 'normal', icon: '⚖️', name: 'Normal', desc: '정보 담당관 지원 · 보통 난이도',  color: '#58A6FF' },
  { diff: 'hard',   icon: '🔥', name: 'Hard',   desc: '데이터 분석기 · 담합 가능',      color: '#D29922' },
  { diff: 'insane', icon: '💀', name: 'Insane', desc: '노이즈 오라클 · 모든 기능 개방',  color: '#F85149' },
];

const fmtCap = n => n >= 100_000_000 ? (n / 100_000_000) + '억 원' : (n / 10_000_000) + '천만 원';

export default function DifficultyScreen() {
  const startGame = useGameStore(s => s.startGame);
  const meta = loadMeta();

  return (
    <div className="diff-screen">
      <div className="diff-header">
        <div className="diff-kicker">Corporate Survival Simulation</div>
        <div className="diff-title">캐피로그 2.0</div>
        <div className="diff-sub">경제 생존 로그라이크 — 120개월 동안 회사를 운영하세요</div>
        {(meta.bankrupts > 0 || meta.clears > 0) && (
          <div className="diff-meta-hint">
            메타 보너스 적용 중 — 자본 +{((meta.capitalBonus || 0) * 100).toFixed(1)}% · 호황 확률 +{((meta.boomBonus || 0) * 100).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="diff-cards">
        {CARDS.map(c => {
          const cfg = DIFF_CONFIG[c.diff];
          return (
            <button
              key={c.diff}
              className="diff-card"
              style={{ '--card-accent': c.color }}
              onClick={() => startGame(c.diff)}
            >
              <div className="diff-icon">{c.icon}</div>
              <div className="diff-name" style={{ color: c.color }}>{c.name}</div>
              <div className="diff-desc">{c.desc}</div>
              <div className="diff-stats">
                <div className="diff-stat">
                  <span>초기자본</span>
                  <strong style={{ color: c.color }}>{fmtCap(cfg.capital)}</strong>
                </div>
                {cfg.debt > 0 && (
                  <div className="diff-stat">
                    <span>초기부채</span>
                    <strong style={{ color: '#F85149' }}>{fmtCap(cfg.debt)}</strong>
                  </div>
                )}
                <div className="diff-stat">
                  <span>금리</span>
                  <strong>{(cfg.interestRate * 100).toFixed(1)}%</strong>
                </div>
                <div className="diff-stat">
                  <span>라이벌</span>
                  <strong>{cfg.rivalCount}명</strong>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {meta.plays > 0 && (
        <div className="diff-footer">
          총 플레이 {meta.plays}회 · 파산 {meta.bankrupts}회 · 클리어 {meta.clears}회
        </div>
      )}
    </div>
  );
}
