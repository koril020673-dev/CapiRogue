import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmtW } from '../../utils.js';
import { C } from '../../constants.js';

const OUTCOMES = [
  { label: '인수 성공',   prob: '40%', desc: '경쟁사를 흡수합니다. 시장 기반이 확대됩니다.',   type: 'good',    color: 'green' },
  { label: '협상 타결',   prob: '35%', desc: '일부 자산 인수로 마무리. 부분적 이익.',          type: 'neutral', color: 'yellow' },
  { label: '인수 실패',   prob: '25%', desc: '협상 결렬. 비용만 소모됩니다.',                  type: 'bad',     color: 'red'   },
];

export default function MnaModal() {
  const closeModal   = useGameStore(s => s.closeModal);
  const capital      = useGameStore(s => s.capital);
  const executeMna   = useGameStore(s => s.executeMna);
  const mna          = useGameStore(s => s.mna);

  const cost = C.MNA_BASE_COST;
  const canAfford = capital >= cost;

  const handleExecute = () => {
    executeMna();
    // store will close modal internally after execution
  };

  return (
    <div className="modal-box mna-modal">
      <div className="modal-header">
        <h3>M&A 추진</h3>
        <button className="modal-close" onClick={closeModal}>✕</button>
      </div>

      <p className="modal-sub">
        경쟁사를 인수합니다. 비용: <strong className="yellow">{fmtW(cost)}</strong>
        {mna.count > 0 && <span className="dim">  (이번이 {mna.count + 1}번째 — 운영비 {(mna.opCostMultiplier * 100 - 100).toFixed(0)}% 가산)</span>}
      </p>

      <div className="mna-outcomes">
        {OUTCOMES.map(o => (
          <div key={o.label} className={`mna-outcome mna-${o.color}`}>
            <div className="mna-prob">{o.prob}</div>
            <div className="mna-label">{o.label}</div>
            <div className="mna-desc">{o.desc}</div>
          </div>
        ))}
      </div>

      <div className="modal-footer-row">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button
          className="btn btn-primary"
          onClick={handleExecute}
          disabled={!canAfford}
        >
          {canAfford ? `${fmtW(cost)} 집행` : '자금 부족'}
        </button>
      </div>
    </div>
  );
}
