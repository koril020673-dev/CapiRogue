import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmtW } from '../../utils.js';
import { loadMeta, saveMeta } from '../../utils.js';

export default function MetaModal() {
  const closeModal = useGameStore(s => s.closeModal);
  const meta = loadMeta();

  const handleReset = () => {
    if (!window.confirm('메타 보너스를 초기화합니까?')) return;
    saveMeta({ capitalBonus: 0, boomBonus: 0 });
    closeModal();
  };

  return (
    <div className="modal-box meta-modal">
      <div className="modal-header">
        <h3>업적 · 메타 보너스</h3>
        <button className="modal-close" onClick={closeModal}>✕</button>
      </div>

      <p className="modal-sub">게임 클리어 시 다음 게임에 누적되는 보너스입니다.</p>

      <div className="meta-rows">
        <div className="meta-item">
          <div className="meta-label">초기 자본 보너스</div>
          <div className="meta-value green">{fmtW(meta.capitalBonus)}</div>
          <div className="meta-bar-wrap">
            <div className="meta-bar" style={{ width: `${Math.min(100, meta.capitalBonus / 1_000_000_000 * 100)}%` }} />
          </div>
        </div>

        <div className="meta-item">
          <div className="meta-label">경기 호황 배율 (판매가 보너스)</div>
          <div className="meta-value yellow">+{((meta.boomBonus || 0) * 100).toFixed(1)}%</div>
          <div className="meta-bar-wrap">
            <div className="meta-bar yellow" style={{ width: `${Math.min(100, (meta.boomBonus || 0) * 1000)}%` }} />
          </div>
        </div>
      </div>

      <div className="modal-footer-row">
        <button className="btn btn-ghost red" onClick={handleReset}>초기화</button>
        <button className="btn btn-primary" onClick={closeModal}>닫기</button>
      </div>
    </div>
  );
}
