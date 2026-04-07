import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';

export default function NewsModal() {
  const closeModal = useGameStore(s => s.closeModal);
  const d = useGameStore(s => s.modalData) || {};

  const { title = '이벤트 발생', body = '', type = 'neutral', icon = '📰' } = d;

  const colorClass = type === 'good' ? 'green' : type === 'bad' ? 'red' : 'yellow';

  return (
    <div className="modal-box news-modal">
      <div className="modal-header">
        <div className={`news-icon ${colorClass}`}>{icon}</div>
        <h3 className={colorClass}>{title}</h3>
      </div>
      <p className="news-body">{body}</p>
      {d.effectDesc && <div className="news-effect">{d.effectDesc}</div>}
      <button className="btn btn-primary btn-block" onClick={closeModal}>확인</button>
    </div>
  );
}
