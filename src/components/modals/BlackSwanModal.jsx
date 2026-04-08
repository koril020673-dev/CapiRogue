import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';

export default function BlackSwanModal() {
  const closeModal = useGameStore(s => s.closeModal);
  const d = useGameStore(s => s.modalData) || {};
  const {
    title = '블랙 스완',
    sub = '',
    effects = [],
    duration = 0,
    color = 'var(--red)',
  } = d;
  const effectList = Array.isArray(effects) ? effects.filter(Boolean) : [effects].filter(Boolean);

  return (
    <div className="modal-box bs-modal">
      <div className="bs-header">
        <span className="bs-badge">BLACK SWAN</span>
        <h3 style={{ color }}>{title}</h3>
      </div>
      <p className="bs-desc">{sub}</p>
      <div className="bs-effect-box">
        <div className="bs-effect-label">효과</div>
        {effectList.length > 0 ? (
          effectList.map((item, index) => (
            <div key={`${title}-${index}`} className="bs-effect-text">{item}</div>
          ))
        ) : (
          <div className="bs-effect-text">시장 환경이 급격히 변합니다.</div>
        )}
        {duration > 0 && <div className="bs-duration">지속: {duration}턴</div>}
      </div>
      <button className="btn btn-primary btn-block" onClick={closeModal}>확인</button>
    </div>
  );
}
