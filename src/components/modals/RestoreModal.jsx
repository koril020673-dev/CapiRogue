import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '시간 정보 없음';
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RestoreModal() {
  const closeModal = useGameStore((state) => state.closeModal);
  const restorePoints = useGameStore((state) => state.restorePoints || []);
  const restoreCheckpoint = useGameStore((state) => state.restoreCheckpoint);

  return (
    <div className="modal-box restore-modal">
      <div className="modal-header">
        <h3>다시하기</h3>
        <button className="modal-close" onClick={closeModal}>×</button>
      </div>

      <p className="modal-sub">저장된 시점을 하나 골라 그 지점부터 다시 이어갈 수 있습니다.</p>

      <div className="menu-list">
        {restorePoints.length === 0 ? (
          <div className="menu-list-empty">아직 저장된 체크포인트가 없습니다.</div>
        ) : (
          restorePoints.map((item) => (
            <button
              key={item.id}
              type="button"
              className="menu-list-item"
              onClick={() => restoreCheckpoint(item.id)}
            >
              <div className="menu-list-main">
                <strong>{item.label || '저장 시점'}</strong>
                <span>{formatDate(item.savedAt)}</span>
              </div>
              <div className="menu-list-sub">
                <span>{item.difficulty || 'normal'}</span>
                <span>{item.turn}개월 차</span>
                <span>{item.infiniteMode ? '무한모드' : '캠페인'}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="modal-footer-row">
        <button className="btn btn-primary" onClick={closeModal}>닫기</button>
      </div>
    </div>
  );
}
