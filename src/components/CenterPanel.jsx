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
import LogPanel from './LogPanel.jsx';

function SectionHeader({ eyebrow, title, subtitle, icon, status, tooltip }) {
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
      {tooltip && <span className="tooltip-icon" title={tooltip}>i</span>}
    </div>
  );
}

function CollapsibleSection({ id, eyebrow, title, subtitle, icon, badge, tooltip, children, className = '', defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`cp-section cp-collapsible ${className}`} id={id}>
      <button className="cp-collapsible-header" onClick={() => setOpen(o => !o)}>
        <div className="cp-collapsible-main">
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            icon={icon}
            status={badge}
            tooltip={tooltip}
          />
        </div>
        <div className="cp-collapsible-right">
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
    selectedVendorName: s.selectedVendor?.name || '',
  })));

  const canAdvance = !!s.selectedVendor && s.sellPrice > 0;
  const launchChecks = [
    { ok: !!s.selectedVendor, label: '공급 계약 확보' },
    { ok: s.sellPrice > 0, label: '판매가 설정 완료' },
  ];

  return (
    <div className="panel-center">
      <ActionGuide />
      <div className="cp-hud-grid">
        <AdvisorBar />
        <EcoBanner />
      </div>

      <section className="cp-section cp-section-primary" id="section-vendor">
        <SectionHeader
          eyebrow="Phase 01"
          title="아이템 탐색 · 공급 계약"
          subtitle="이번 달 판매할 품목을 정하고, 조건이 가장 좋은 도매업체와 계약하세요."
          icon="01"
          status={s.selectedVendor ? s.selectedVendorName : '계약 대기'}
          tooltip="매달 어떤 품질과 단가를 가진 도매업체와 계약할지 선택해야 합니다."
        />
        <VendorSearch />
      </section>

      <section className="cp-section" id="section-price">
        <SectionHeader
          eyebrow="Phase 02"
          title="판매가 설정"
          subtitle="마진과 수요를 함께 보고 이번 달 가격 전략을 확정하세요."
          icon="02"
          status={s.sellPrice > 0 ? `${s.sellPrice.toLocaleString('ko-KR')}원` : '설정 필요'}
          tooltip="적당한 마진을 남기되, 수요가 끊기지 않도록 시장 상황에 맞게 가격을 설정하세요."
        />
        <PriceBlock />
      </section>

      <CollapsibleSection
        id="section-optional"
        eyebrow="Phase 03"
        title="선택 행동"
        subtitle="교육, 마케팅, 공장 투자로 이번 달의 추가 우위를 설계합니다."
        icon="03"
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

      <section className="cp-section cp-section-dashboard">
        <SectionHeader
          eyebrow="Battle Readout"
          title="실시간 경영 지표"
          subtitle="직전 정산 결과를 빠르게 읽고 다음 판단에 활용하세요."
          icon="◎"
          status={`T${Math.max(1, s.turn - 1)} 결과`}
        />
        <DashGrid />
      </section>

      <CollapsibleSection
        id="section-business"
        eyebrow="Long Term"
        title="주요 경영 지시"
        subtitle="부동산, 금융, M&A 같은 장기 의사결정을 실행합니다."
        icon="04"
        badge="전략"
        tooltip="부동산 매입, 특수 M&A 등 장기적 투자를 진행할 수 있습니다."
      >
        <ActionButtons />
      </CollapsibleSection>

      <section className={`turn-launch${canAdvance ? ' ready' : ''}`}>
        <div className="turn-launch-copy">
          <div className="turn-launch-eyebrow">Phase 05</div>
          <div className="turn-launch-title">
            {canAdvance ? '월간 실행 준비 완료' : '월간 실행 전 체크 필요'}
          </div>
          <div className="turn-launch-sub">
            {canAdvance
              ? '현재 설정으로 이번 달 경영 결과를 정산합니다.'
              : !s.selectedVendor
                ? '먼저 공급 계약을 완료해야 합니다.'
                : '판매가를 정해야 월간 실행이 가능합니다.'}
          </div>
          <div className="turn-launch-checks">
            {launchChecks.map(check => (
              <span key={check.label} className={`launch-chip ${check.ok ? 'ok' : 'todo'}`}>
                {check.label}
              </span>
            ))}
          </div>
        </div>
        <button
          className={`next-btn${canAdvance && !s.turnProcessing ? '' : ' next-btn-disabled'}`}
          disabled={!canAdvance || s.turnProcessing}
          onClick={s.runTurn}
        >
          {s.turnProcessing
            ? '정산 중…'
            : canAdvance
              ? '다음 달로 진행'
              : !s.selectedVendor
                ? '도매업체 미선택'
                : '판매가 설정 필요'}
        </button>
      </section>

      <div className="bottom-integrated">
        <StatusBoard />
        <LogPanel />
      </div>
    </div>
  );
}
