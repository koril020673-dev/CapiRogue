import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmtW, fmt } from '../../utils.js';

const TYPE_META = {
  bankrupt: { icon: '💸', title: '파산',          color: 'red',    sub: '자금이 바닥났습니다.' },
  hostile:  { icon: '⚔️',  title: '경쟁사에 인수', color: 'red',    sub: '적대적 M&A로 인수당했습니다.' },
  clear:    { icon: '🏆', title: '게임 클리어!',   color: 'yellow', sub: '120개월 경영에 성공했습니다!' },
};

export default function GameOverModal() {
  const d       = useGameStore(s => s.modalData) || {};
  const restart = useGameStore(s => s.restart);
  const capital = useGameStore(s => s.capital);
  const cumulativeProfit = useGameStore(s => s.cumulativeProfit);
  const turn    = useGameStore(s => s.turn);
  const marketShare = useGameStore(s => s.marketShare);

  const type = d.type || 'bankrupt';
  const meta = TYPE_META[type] || TYPE_META.bankrupt;

  return (
    <div className="modal-box gameover-modal">
      <div className={`gameover-icon ${meta.color}`}>{meta.icon}</div>
      <h2 className={`gameover-title ${meta.color}`}>{meta.title}</h2>
      <p className="gameover-sub">{meta.sub}</p>

      <div className="gameover-stats">
        <div className="go-stat">
          <span className="go-stat-label">최종 자본</span>
          <span className="go-stat-value">{fmtW(capital)}</span>
        </div>
        <div className="go-stat">
          <span className="go-stat-label">누적 순이익</span>
          <span className={`go-stat-value ${cumulativeProfit >= 0 ? 'green' : 'red'}`}>{fmtW(cumulativeProfit)}</span>
        </div>
        <div className="go-stat">
          <span className="go-stat-label">진행 월수</span>
          <span className="go-stat-value">{turn - 1} / 120개월</span>
        </div>
        <div className="go-stat">
          <span className="go-stat-label">시장 점유율</span>
          <span className="go-stat-value">{(marketShare * 100).toFixed(1)}%</span>
        </div>
      </div>

      {type === 'clear' && d.metaGain && (
        <div className="gameover-meta">
          <p className="green">다음 플레이 보너스 획득!</p>
          <p>자본 보너스: +{fmtW(d.metaGain.capitalBonus)}</p>
          <p>호황 배율: +{((d.metaGain.boomBonus || 0) * 100).toFixed(1)}%</p>
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={restart}>
        다시 시작
      </button>
    </div>
  );
}
