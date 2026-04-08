import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { APPROVAL_CARD_GRADES } from '../../designData.js';

export default function ApprovalModal() {
  const cards = useGameStore((state) => state.modalData?.cards || []);
  const chooseApprovalCard = useGameStore((state) => state.chooseApprovalCard);

  return (
    <div className="modal-box approval-modal">
      <div className="modal-header">
        <h3>결재 서류 3장</h3>
      </div>
      <div className="approval-intro">
        이번 달 실행 전에 아래 카드 중 하나를 선택하세요. 선택 결과가 즉시 이번 턴 정산에 반영됩니다.
      </div>
      <div className="approval-grid">
        {cards.map((card) => {
          const grade = APPROVAL_CARD_GRADES[card.grade];
          return (
            <div key={card.id} className={`approval-card ${grade?.className || ''}`}>
              <div className="approval-card-top">
                <span className="approval-grade">{grade?.label || card.grade}</span>
                <strong>{card.title}</strong>
              </div>
              <div className="approval-summary">{card.summary}</div>
              <div className="approval-choice-list">
                {card.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="approval-choice-btn"
                    onClick={() => chooseApprovalCard(card.id, choice.id)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
