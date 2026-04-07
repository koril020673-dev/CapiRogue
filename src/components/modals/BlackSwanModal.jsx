import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';

export default function BlackSwanModal() {
  const closeModal = useGameStore(s => s.closeModal);
  const d = useGameStore(s => s.modalData) || {};
  const { name = '블랙 스완', desc = '', effect = '', duration = 0 } = d;

  return (
    <div className="modal-box bs-modal">
      <div className="bs-header">
        <span className="bs-badge">BLACK SWAN</span>
        <h3 className="red">{name}</h3>
      </div>
      <p className="bs-desc">{desc}</p>
      <div className="bs-effect-box">
        <div className="bs-effect-label">효과</div>
        <div className="bs-effect-text">{effect}</div>
        {duration > 0 && <div className="bs-duration">지속: {duration}개월</div>}
      </div>
      <button className="btn btn-primary btn-block" onClick={closeModal}>확인</button>
    </div>
  );
}
