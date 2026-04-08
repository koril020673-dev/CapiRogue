import React, { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore.js';

export default function DocResultModal() {
  const data = useGameStore((state) => state.modalData) || {};
  const closeModal = useGameStore((state) => state.closeModal);

  useEffect(() => {
    const timer = setTimeout(() => closeModal(), 1400);
    return () => clearTimeout(timer);
  }, [closeModal]);

  return (
    <div className={`modal-box doc-result-modal ${data.tone || 'neutral'}`}>
      <div className="doc-result-kicker">{data.cardTitle || '결재 결과'}</div>
      <h3>{data.title || '정산 반영'}</h3>
      <div className="doc-result-choice">{data.choiceLabel || ''}</div>
      <p>{data.desc || '이번 턴에 즉시 반영됩니다.'}</p>
      <div className="doc-result-bar">
        <span />
      </div>
    </div>
  );
}
