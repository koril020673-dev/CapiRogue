import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmtW } from '../../utils.js';

const OUTCOME_LABEL = {
  clear: '클리어',
  bankrupt: '파산',
  hostile: '적대적 인수',
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '시간 정보 없음';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryModal() {
  const closeModal = useGameStore((state) => state.closeModal);
  const playHistory = useGameStore((state) => state.playHistory || []);

  return (
    <div className="modal-box history-modal">
      <div className="modal-header">
        <h3>플레이 이력</h3>
        <button className="modal-close" onClick={closeModal}>×</button>
      </div>

      <p className="modal-sub">최근 러닝 결과와 기록을 최대 24개까지 보관합니다.</p>

      <div className="menu-list">
        {playHistory.length === 0 ? (
          <div className="menu-list-empty">아직 완료된 플레이 기록이 없습니다.</div>
        ) : (
          playHistory.map((item) => (
            <div key={item.id} className="menu-list-item static">
              <div className="menu-list-main">
                <strong>{OUTCOME_LABEL[item.outcome] || item.outcome}</strong>
                <span>{formatDate(item.endedAt)}</span>
              </div>
              <div className="menu-list-sub">
                <span>{item.difficulty || 'normal'}</span>
                <span>{item.infiniteMode ? '무한모드' : `${item.turn}개월`}</span>
                <span>누적 {fmtW(item.cumulativeProfit || 0)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="modal-footer-row">
        <button className="btn btn-primary" onClick={closeModal}>닫기</button>
      </div>
    </div>
  );
}
