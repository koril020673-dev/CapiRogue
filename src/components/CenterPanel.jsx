import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { C } from '../constants.js';
import { APPROVAL_CARD_GRADES, getQualityMeta } from '../designData.js';
import { estimateBaseDemand } from '../calculations.js';
import { fmtW } from '../utils.js';
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
import HoverHint from './HoverHint.jsx';

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

function CollapsibleSection({ title, subtitle, eyebrow, icon, status, summary, children, className = '', defaultOpen = false, open: controlledOpen, onToggle }) {
  const [open, setOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === 'boolean';
  const expanded = isControlled ? controlledOpen : open;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.(!expanded);
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <section className={`cp-section cp-collapsible${expanded ? ' open' : ' closed'}${className ? ` ${className}` : ''}`}>
      <button type="button" className="cp-collapsible-header" onClick={handleToggle}>
        <div className="cp-collapsible-main">
          <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} status={status} />
          {!expanded && summary && <div className="cp-section-summary">{summary}</div>}
        </div>
        <div className="cp-collapsible-right">
          <span className={`cp-chevron${expanded ? ' open' : ''}`}>⌄</span>
        </div>
      </button>
      {expanded && <div className="cp-collapsible-body">{children}</div>}
    </section>
  );
}

export default function CenterPanel() {
  const s = useGameStore(useShallow((state) => ({
    selectedVendor: state.selectedVendor,
    selectedVendorName: state.selectedVendor?.name || '',
    sellPrice: state.sellPrice,
    plannedOrderUnits: state.plannedOrderUnits,
    qualityMode: state.qualityMode,
    industryTier: state.industryTier,
    itemTier: state.itemTier,
    itemCategory: state.itemCategory,
    economy: state.economy,
    factory: state.factory,
    activeEffects: state.activeEffects,
    _bsDemandMul: state._bsDemandMul,
    _docDemandMul: state._docDemandMul,
    runTurn: state.runTurn,
    turnProcessing: state.turnProcessing,
    difficulty: state.difficulty,
    cartel: state.cartel,
    toggleCartel: state.toggleCartel,
    approvalCardPreview: state.approvalCardPreview || [],
  })));

  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  const canAdvance = Boolean(s.selectedVendor) && s.sellPrice > 0 && s.plannedOrderUnits > 0;
  const [phaseOneOpen, setPhaseOneOpen] = useState(true);
  const [phaseTwoOpen, setPhaseTwoOpen] = useState(true);
  const contractLabel = factoryActive ? '생산 라인 확정' : 'OEM 계약';
  const launchChecks = [
    { ok: Boolean(s.selectedVendor), label: contractLabel },
    { ok: s.plannedOrderUnits > 0, label: '발주 수량 입력' },
    { ok: s.sellPrice > 0, label: '판매가 설정' },
  ];
  const qualityLabel = factoryActive ? getQualityMeta(s.qualityMode).label : '공장 전 기본 품질';
  const currentQualityMeta = getQualityMeta(factoryActive ? s.qualityMode : 'standard');
  const currentNetCost = s.selectedVendor
    ? Math.round((s.selectedVendor.unitCost || 0) * currentQualityMeta.costMul * (factoryActive ? C.FACTORY_DISCOUNT : 1))
    : 0;
  const currentMargin = s.selectedVendor && s.sellPrice > 0 ? s.sellPrice - currentNetCost : null;
  const demandRef = s.selectedVendor
    ? estimateBaseDemand({
      selectedVendor: s.selectedVendor,
      sellPrice: s.sellPrice,
      itemCategory: s.itemCategory,
      economy: s.economy,
      difficulty: s.difficulty,
      industryTier: s.industryTier,
      itemTier: s.itemTier,
      activeEffects: s.activeEffects,
      _bsDemandMul: s._bsDemandMul,
      _docDemandMul: s._docDemandMul,
    }, false).demand
    : 0;
  const orderGap = s.selectedVendor ? (s.plannedOrderUnits || 0) - demandRef : 0;
  const phaseOneDone = factoryActive
    ? Boolean(s.selectedVendor) && !s.factory.productSelectionOpen
    : Boolean(s.selectedVendor);
  const phaseTwoDone = canAdvance;
  const phaseOneSummary = phaseOneDone
    ? factoryActive
      ? `${s.selectedVendorName} 라인이 고정되어 있습니다. 공장 업그레이드 후에만 다시 바꿀 수 있습니다.`
      : `${s.selectedVendorName}와 OEM 계약 완료. 다른 공급처로 바꾸고 싶을 때만 다시 펼치면 됩니다.`
    : factoryActive
      ? '공장 업그레이드 직후 새 생산 라인을 정하는 구간입니다.'
      : '상품을 탐색하고 이번 달 공급처를 고르면 자동으로 접힙니다.';
  const phaseTwoSummary = phaseTwoDone
    ? `${qualityLabel} · 발주 ${s.plannedOrderUnits.toLocaleString('ko-KR')}개 · 판매가 ${fmtW(s.sellPrice)}`
    : factoryActive
      ? '품질 모드, 발주 수량, 판매가를 정하면 자동으로 접힙니다.'
      : '공장 전에는 기본 품질 기준으로 발주 수량과 판매가만 정하면 됩니다.';
  const launchBlockedReason = s.turnProcessing
    ? '이번 달 정산을 이미 처리하고 있습니다.'
    : `아직 필요한 항목: ${launchChecks.filter((check) => !check.ok).map((check) => check.label).join(', ')}`;
  const situationCards = [
    {
      label: '지금 집중할 것',
      value: !s.selectedVendor
        ? factoryActive && s.factory.productSelectionOpen
          ? '새 라인 선택'
          : contractLabel
        : s.plannedOrderUnits <= 0
          ? '발주 수량 결정'
          : s.sellPrice <= 0
            ? '판매가 결정'
            : '실행 준비 완료',
      tone: canAdvance ? 'good' : 'neutral',
    },
    {
      label: '생산 라인',
      value: s.selectedVendor
        ? `${s.selectedVendorName}${factoryActive ? ` · Lv.${s.factory.upgradeLevel}` : ''}`
        : factoryActive && s.factory.productSelectionOpen
          ? '재선정 대기'
          : '미확정',
      tone: s.selectedVendor ? 'good' : 'warn',
    },
    {
      label: '수요 대비 발주',
      value: s.selectedVendor
        ? `예상 ${demandRef.toLocaleString('ko-KR')} / 발주 ${(s.plannedOrderUnits || 0).toLocaleString('ko-KR')}`
        : '라인 확정 후 계산',
      meta: s.selectedVendor
        ? orderGap > 0
          ? `재고 여유 +${orderGap.toLocaleString('ko-KR')}`
          : orderGap < 0
            ? `부족 가능 ${Math.abs(orderGap).toLocaleString('ko-KR')}`
            : '예상 수요와 동일'
        : '',
      tone: s.selectedVendor ? (Math.abs(orderGap) <= Math.max(50, demandRef * 0.1) ? 'good' : 'neutral') : 'neutral',
    },
    {
      label: '개당 마진',
      value: currentMargin !== null ? fmtW(currentMargin) : '미설정',
      meta: factoryActive ? qualityLabel : '공장 전 기본 품질',
      tone: currentMargin !== null
        ? (currentMargin >= 0 ? 'good' : 'warn')
        : 'neutral',
    },
  ];

  useEffect(() => {
    setPhaseOneOpen(!phaseOneDone);
  }, [phaseOneDone]);

  useEffect(() => {
    setPhaseTwoOpen(!phaseTwoDone);
  }, [phaseTwoDone]);

  return (
    <div className="panel-center">
      <ActionGuide />

      <div className="cp-hud-grid">
        <AdvisorBar />
        <EcoBanner />
      </div>

      <div className="cp-situation-strip">
        {situationCards.map((card) => (
          <div key={card.label} className={`cp-situation-card ${card.tone || 'neutral'}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.meta && <small>{card.meta}</small>}
          </div>
        ))}
      </div>

      <CollapsibleSection
        className="cp-section-primary"
        eyebrow="Phase 01"
        title={factoryActive ? '생산 라인 재선정' : '아이템 탐색과 OEM 계약'}
        subtitle={factoryActive
          ? '공장 업그레이드 후에만 새 상품과 새 라인을 다시 고를 수 있습니다.'
          : '현재 산업 티어 안에서 이번 달 시장을 정하고, 비교할 공급처를 고릅니다.'}
        icon="01"
        status={factoryActive && !s.factory.productSelectionOpen ? '라인 고정' : s.selectedVendor ? s.selectedVendorName : '계약 대기'}
        summary={phaseOneSummary}
        open={phaseOneOpen}
        onToggle={setPhaseOneOpen}
        defaultOpen
      >
        <VendorSearch />
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Phase 02"
        title="티어, 품질, 발주, 가격"
        subtitle={factoryActive ? '공장 품질 방향과 발주, 판매가를 함께 맞추는 핵심 구간입니다.' : '기본 생산 기준으로 발주와 판매가를 맞추는 핵심 구간입니다.'}
        icon="02"
        status={canAdvance ? '실행 준비 완료' : '입력 필요'}
        summary={phaseTwoSummary}
        open={phaseTwoOpen}
        onToggle={setPhaseTwoOpen}
        defaultOpen
      >
        <PriceBlock />
      </CollapsibleSection>

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
          subtitle="실행 버튼을 누르기 전 미리 보는 카드 풀입니다. 실제 선택은 턴 종료 직전에 진행됩니다."
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
            결재 서류 3장을 확인하고 하나를 고르면, 그 결과까지 반영한 뒤 이번 달 정산이 진행됩니다.
          </div>
          <div className="turn-launch-checks">
            {launchChecks.map((check) => (
              <span key={check.label} className={`launch-chip ${check.ok ? 'ok' : 'todo'}`}>
                {check.label}
              </span>
            ))}
          </div>
        </div>
        <HoverHint
          className="turn-launch-action"
          align="end"
          disabled={!canAdvance || s.turnProcessing}
          title="결재 후 월간 실행"
          description="이번 달 입력을 잠그고 결재 카드 3장 중 하나를 고른 뒤, 그 결과까지 반영해서 정산을 진행합니다."
          pros="실행 전에 마지막 의사결정 카드가 열려 한 번 더 방향을 고를 수 있습니다."
          cons="누르는 순간 이번 달 설정이 확정되므로 미입력 항목이 있으면 실행할 수 없습니다."
          state={!canAdvance || s.turnProcessing ? `지금 못 누르는 이유: ${launchBlockedReason}` : '지금 누르면 결재 카드 선택 후 월간 정산이 시작됩니다.'}
        >
          <button
            type="button"
            className={`next-btn${canAdvance && !s.turnProcessing ? '' : ' next-btn-disabled'}`}
            disabled={!canAdvance || s.turnProcessing}
            onClick={s.runTurn}
          >
            {s.turnProcessing ? '월간 실행 중' : '결재 서류 확인 후 실행'}
          </button>
        </HoverHint>
      </section>

      <div className="bottom-integrated">
        <StatusBoard />
        <LogPanel />
      </div>
    </div>
  );
}
