import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { APPROVAL_CARD_GRADES } from '../designData.js';
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
import LogPanel from './LogPanel.jsx';

function SectionHeader({ eyebrow, title, subtitle, icon, status }) {
  return (
    <div className="cp-section-header-wrap">
      <div className="cp-section-head">
        <div className="cp-section-icon">{icon}</div>
        <div className="cp-section-copy">
          <div className="cp-section-eyebrow">{eyebrow}</div>
          <div className="cp-section-title-row">
            <div className="cp-section-title">{title}</div>
            {status && <span className="cp-section-status">{status}</span>}
          </div>
          {subtitle && <div className="cp-section-subtitle">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, subtitle, eyebrow, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="cp-section cp-collapsible">
      <button type="button" className="cp-collapsible-header" onClick={() => setOpen((value) => !value)}>
        <div className="cp-collapsible-main">
          <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} />
        </div>
        <div className="cp-collapsible-right">
          <span className={`cp-chevron${open ? ' open' : ''}`}>⌄</span>
        </div>
      </button>
      {open && <div className="cp-collapsible-body">{children}</div>}
    </section>
  );
}

export default function CenterPanel() {
  const s = useGameStore(useShallow((state) => ({
    selectedVendor: state.selectedVendor,
    selectedVendorName: state.selectedVendor?.name || '',
    sellPrice: state.sellPrice,
    plannedOrderUnits: state.plannedOrderUnits,
    runTurn: state.runTurn,
    turnProcessing: state.turnProcessing,
    difficulty: state.difficulty,
    cartel: state.cartel,
    toggleCartel: state.toggleCartel,
    approvalCardPreview: state.approvalCardPreview || [],
  })));

  const canAdvance = Boolean(s.selectedVendor) && s.sellPrice > 0 && s.plannedOrderUnits > 0;
  const launchChecks = [
    { ok: Boolean(s.selectedVendor), label: 'OEM 계약' },
    { ok: s.plannedOrderUnits > 0, label: '발주 수량 입력' },
    { ok: s.sellPrice > 0, label: '판매가 설정' },
  ];

  return (
    <div className="panel-center">
      <ActionGuide />

      <div className="cp-hud-grid">
        <AdvisorBar />
        <EcoBanner />
      </div>

      <section className="cp-section cp-section-primary">
        <SectionHeader
          eyebrow="Phase 01"
          title="아이템 탐색과 OEM 계약"
          subtitle="현재 산업 티어 안에서 이번 달 시장을 정하고, 비교할 공급처를 고릅니다."
          icon="01"
          status={s.selectedVendor ? s.selectedVendorName : '계약 대기'}
        />
        <VendorSearch />
      </section>

      <section className="cp-section">
        <SectionHeader
          eyebrow="Phase 02"
          title="티어, 품질, 발주, 가격"
          subtitle="설계서 기준 월간 의사결정의 중심 구간입니다."
          icon="02"
          status={canAdvance ? '실행 준비 완료' : '입력 필요'}
        />
        <PriceBlock />
      </section>

      <CollapsibleSection
        eyebrow="Phase 03"
        title="선택 행동"
        subtitle="인사, 마케팅, 공장 관리와 위험한 선택을 이번 달에 추가합니다."
        icon="03"
      >
        <HRBlock />
        <FactoryBlock />
        {(s.difficulty === 'hard' || s.difficulty === 'insane') && (
          <button
            type="button"
            className={`cartel-btn${s.cartel?.active ? ' active' : ''}`}
            onClick={s.toggleCartel}
          >
            {s.cartel?.active ? '담합 활성화 해제' : '담합 활성화'}
          </button>
        )}
      </CollapsibleSection>

      <section className="cp-section cp-section-dashboard">
        <SectionHeader
          eyebrow="Battle Readout"
          title="직전 월간 정산"
          subtitle="바로 직전 턴 결과를 보고 이번 결정을 조정합니다."
          icon="◎"
        />
        <DashGrid />
      </section>

      <CollapsibleSection
        eyebrow="Phase 04"
        title="장기 의사결정"
        subtitle="부동산, 금융, M&A 같은 장기 전략을 실행합니다."
        icon="04"
      >
        <ActionButtons />
      </CollapsibleSection>

      <section className="cp-section doc-preview-section">
        <SectionHeader
          eyebrow="Phase 05"
          title="결재 서류 브리핑"
          subtitle="턴 종료 시 아래 풀에서 3장이 추첨되어 하나를 선택합니다."
          icon="05"
          status={`${s.approvalCardPreview.length}장 대기`}
        />
        <div className="doc-preview-grid">
          {s.approvalCardPreview.map((card) => {
            const grade = APPROVAL_CARD_GRADES[card.grade];
            return (
              <div key={card.id} className={`doc-preview-card ${grade?.className || ''}`}>
                <div className="doc-preview-top">
                  <span className="doc-preview-grade">{grade?.label || card.grade}</span>
                  <strong>{card.title}</strong>
                </div>
                <div className="doc-preview-summary">{card.summary}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={`turn-launch${canAdvance ? ' ready' : ''}`}>
        <div className="turn-launch-copy">
          <div className="turn-launch-eyebrow">Execute</div>
          <div className="turn-launch-title">
            {canAdvance ? '결재 후 월간 실행' : '실행 전 체크가 더 필요합니다'}
          </div>
          <div className="turn-launch-sub">
            실행 버튼을 누르면 결재 서류 3장이 열리고, 선택 결과까지 반영한 뒤 월간 정산이 진행됩니다.
          </div>
          <div className="turn-launch-checks">
            {launchChecks.map((check) => (
              <span key={check.label} className={`launch-chip ${check.ok ? 'ok' : 'todo'}`}>
                {check.label}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`next-btn${canAdvance && !s.turnProcessing ? '' : ' next-btn-disabled'}`}
          disabled={!canAdvance || s.turnProcessing}
          onClick={s.runTurn}
        >
          {s.turnProcessing ? '월간 실행 중' : '결재 서류 확인 후 실행'}
        </button>
      </section>

      <div className="bottom-integrated">
        <StatusBoard />
        <LogPanel />
      </div>
    </div>
  );
}
