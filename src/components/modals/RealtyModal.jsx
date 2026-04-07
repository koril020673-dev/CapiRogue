import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmtW } from '../../utils.js';
import { REALTY_DATA } from '../../constants.js';

export default function RealtyModal() {
  const closeModal  = useGameStore(s => s.closeModal);
  const capital     = useGameStore(s => s.capital);
  const realty      = useGameStore(s => s.realty);
  const changeRealty = useGameStore(s => s.changeRealty);

  const handleSelect = (id) => {
    changeRealty(id);
    closeModal();
  };

  return (
    <div className="modal-box realty-modal">
      <div className="modal-header">
        <h3>부동산 계약 변경</h3>
        <button className="modal-close" onClick={closeModal}>✕</button>
      </div>
      <p className="modal-sub">사무실 계약 유형을 변경합니다. 이사 비용이 즉시 차감됩니다.</p>

      <div className="realty-cards">
        {REALTY_DATA.map(r => {
          const canAfford = capital >= r.deposit;
          const isCurrent = realty === r.id;
          return (
            <div key={r.id} className={`realty-card ${isCurrent ? 'current' : ''} ${!canAfford ? 'disabled' : ''}`}>
              <div className="realty-name">{r.name}</div>
              <div className="realty-detail">월 임대료: <span className="red">{fmtW(r.monthlyCost)}</span></div>
              <div className="realty-detail">보증금: {fmtW(r.deposit)}</div>
              <div className="realty-detail">월 고정비 기여: <span className="dim">{fmtW(r.fixedContrib)}</span></div>
              {isCurrent
                ? <div className="realty-current-badge">현재 계약</div>
                : (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleSelect(r.id)}
                    disabled={!canAfford}
                  >
                    {canAfford ? '계약 변경' : '자금 부족'}
                  </button>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
