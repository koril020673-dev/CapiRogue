import React, { useState } from 'react';
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

/* ── 접기/펼치기 섹션 ── */
function CollapsibleSection({ id, title, badge, tooltip, children, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`cp-section cp-collapsible ${className}`} id={id}>
      <button className="cp-collapsible-header" onClick={() => setOpen(o => !o)}>
        <div className="cp-section-title">
          {title}
          {badge && <span className="cp-section-badge">{badge}</span>}
        </div>
        <div className="cp-collapsible-right">
          {tooltip && (
            <span
              className="tooltip-icon"
              title={tooltip}
              onClick={e => e.stopPropagation()}
            >
              ℹ️
            </span>
          )}
          <span className={`cp-chevron${open ? ' open' : ''}`}>›</span>
        </div>
      </button>
      {open && <div className="cp-collapsible-body">{children}</div>}
    </section>
  );
}

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

      {/* Step 1+2: Item search & vendor contract */}
      <section className="cp-section" id="section-vendor">
        <div className="cp-section-header-wrap">
          <div className="cp-section-title">아이템 탐색 · 계약</div>
          <span className="tooltip-icon" title="매달 어떤 품질과 단가를 가진 도매업체와 계약할지 선택해야 합니다.">ℹ️</span>
        </div>
        <VendorSearch />
      </section>

      {/* Step 3: Price */}
      <section className="cp-section" id="section-price">
        <div className="cp-section-header-wrap">
          <div className="cp-section-title">판매가 설정</div>
          <span className="tooltip-icon" title="적당한 마진을 남기되, 수요가 끊기지 않도록 시장 상황에 맞게 가격을 설정하세요.">ℹ️</span>
        </div>
        <PriceBlock />
      </section>

      {/* Step 4: Optional — collapsible (기본 접힘) */}
      <CollapsibleSection
        id="section-optional"
        title="선택 행동"
        badge="선택"
        tooltip="인사 교육, 공장 건설 등 선택적 투자를 할 수 있습니다."
        className="cp-section-optional"
      >
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
      </CollapsibleSection>

      {/* Dashboard */}
      <DashGrid />

      {/* 주요 경영 지시 — collapsible (기본 접힘) */}
      <CollapsibleSection
        id="section-business"
        title="주요 경영 지시"
        tooltip="부동산 매입, 특수 M&A 등 장기적 투자를 진행할 수 있습니다."
      >
        <ActionButtons />
      </CollapsibleSection>

      {/* Step 5: Advance turn */}
      <button
        className={`next-btn${canAdvance && !s.turnProcessing ? '' : ' next-btn-disabled'}`}
        disabled={!canAdvance || s.turnProcessing}
        onClick={s.runTurn}
      >
        {s.turnProcessing
          ? '⏳ 정산 중…'
          : canAdvance
            ? '다음 달로 진행 ➔'
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
