import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import ActionGuide from './ActionGuide.jsx';
import AdvisorBar from './AdvisorBar.jsx';
import EcoBanner from './EcoBanner.jsx';
import VendorSearch from './VendorSearch.jsx';
import PriceBlock from './PriceBlock.jsx';
import HRBlock from './HRBlock.jsx';
import FactoryBlock from './FactoryBlock.jsx';
import DashGrid from './DashGrid.jsx';
import ActionButtons from './ActionButtons.jsx';
import StatusBoard from './StatusBoard.jsx';

export default function CenterPanel() {
  const s = useGameStore(useShallow(s => ({
    selectedVendor: s.selectedVendor,
    sellPrice: s.sellPrice,
    runTurn: s.runTurn,
    turnProcessing: s.turnProcessing,
    turn: s.turn,
    difficulty: s.difficulty,
    cartel: s.cartel,
    toggleCartel: s.toggleCartel,
  })));

  const canAdvance = !!s.selectedVendor && s.sellPrice > 0;

  return (
    <div className="panel-center">
      {/* Step progress */}
      <ActionGuide />

      {/* AI Advisor */}
      <AdvisorBar />

      {/* Economy banner */}
      <EcoBanner />

      {/* ── Step 1+2: Item search & vendor contract ── */}
      <section className="cp-section" id="section-vendor">
        <div className="cp-section-title">아이템 탐색 · 계약</div>
        <VendorSearch />
      </section>

      {/* ── Step 3: Price ── */}
      <section className="cp-section" id="section-price">
        <div className="cp-section-title">판매가 설정</div>
        <PriceBlock />
      </section>

      {/* ── Step 4: Optional actions ── */}
      <section className="cp-section cp-section-optional" id="section-optional">
        <div className="cp-section-title">
          선택 행동
          <span className="cp-section-badge">선택</span>
        </div>
        <HRBlock />
        <FactoryBlock />
        {(s.difficulty === 'hard' || s.difficulty === 'insane') && (
          <button
            className={`cartel-btn${s.cartel?.active ? ' active' : ''}`}
            onClick={s.toggleCartel}
          >
            {s.cartel?.active ? '담합 활성 (클릭하여 해제)' : '담합 활성화 (×1.5 수익 / 적발 15%)'}
          </button>
        )}
      </section>

      {/* Dashboard */}
      <DashGrid />

      {/* Action buttons: 부동산, 대출, M&A, 업적 */}
      <ActionButtons />

      {/* ── Step 5: Advance turn ── */}
      <button
        className={`next-btn${canAdvance && !s.turnProcessing ? '' : ' next-btn-disabled'}`}
        disabled={!canAdvance || s.turnProcessing}
        onClick={s.runTurn}
      >
        {s.turnProcessing
          ? '⏳ 정산 중…'
          : canAdvance
            ? `다음 달로 (${s.turn}개월 차 → ${s.turn + 1}개월)`
            : !s.selectedVendor
              ? '도매업체 미선택'
              : '판매가 설정 필요'}
      </button>

      {/* Bottom: status */}
      <div className="bottom-integrated">
        <StatusBoard />
      </div>
    </div>
  );
}
