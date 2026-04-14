import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { C } from '../constants.js';
import { fmtW } from '../utils.js';
import HoverHint from './HoverHint.jsx';

export default function FactoryBlock() {
  const s = useGameStore(useShallow(state => ({
    factory: state.factory,
    capital: state.capital,
    buildFactory: state.buildFactory,
    upgradeFactory: state.upgradeFactory,
    changeProduct: state.changeProduct,
    toggleSafety: state.toggleSafety,
  })));

  const f = s.factory;
  const factoryRunning = f.built && f.buildTurnsLeft <= 0;
  const buildBlocked = f.built;
  const upgradeBlocked = !factoryRunning || s.capital < C.FACTORY_UPGRADE_COST;
  const productBlocked = !factoryRunning || s.capital < C.FACTORY_PRODUCT_COST;

  const buildBlockedReason = '이미 공장을 보유하고 있습니다.';
  const upgradeBlockedReason = !f.built
    ? '먼저 공장을 설립해야 합니다.'
    : f.buildTurnsLeft > 0
      ? `공장 완공까지 ${f.buildTurnsLeft}턴 남았습니다.`
      : `${fmtW(C.FACTORY_UPGRADE_COST)}이 있어야 업그레이드할 수 있습니다.`;
  const productBlockedReason = !f.built
    ? '먼저 공장을 설립해야 합니다.'
    : f.buildTurnsLeft > 0
      ? `공장 완공까지 ${f.buildTurnsLeft}턴 남았습니다.`
      : `${fmtW(C.FACTORY_PRODUCT_COST)}이 있어야 품목을 바꿀 수 있습니다.`;

  return (
    <div className="factory-block">
      <div className="factory-btns">
        <HoverHint
          fill
          disabled={buildBlocked}
          title="공장 설립"
          description="OEM 의존도를 줄이고 직접 생산 체제를 깔아 장기 원가 경쟁력을 확보하는 투자입니다."
          pros="완공 후에는 원가가 크게 줄어 월간 마진 구조가 좋아집니다."
          cons="초기 비용이 매우 크고, 3턴 동안은 완공을 기다려야 합니다."
          state={buildBlocked ? `지금 못 누르는 이유: ${buildBlockedReason}` : '지금 누르면 3턴짜리 공장 건설이 시작됩니다.'}
        >
          <button
            type="button"
            className="factory-btn"
            disabled={buildBlocked}
            onClick={s.buildFactory}
          >
            공장 설립<small>{fmtW(C.FACTORY_BUILD_COST)}</small>
          </button>
        </HoverHint>
        <HoverHint
          fill
          disabled={upgradeBlocked}
          title="공장 업그레이드"
          description="기존 공장 설비를 개선해 제품 품질을 한 단계 끌어올리는 투자입니다."
          pros="품질 경쟁력이 직접 올라가 고가 전략을 받쳐주기 좋습니다."
          cons="현금이 많이 들고, 공장이 완공되어 있어야만 실행할 수 있습니다."
          state={upgradeBlocked ? `지금 못 누르는 이유: ${upgradeBlockedReason}` : '지금 누르면 공장 품질이 즉시 상승합니다.'}
        >
          <button
            type="button"
            className="factory-btn"
            disabled={upgradeBlocked}
            onClick={s.upgradeFactory}
          >
            업그레이드<small>{fmtW(C.FACTORY_UPGRADE_COST)}</small>
          </button>
        </HoverHint>
        <HoverHint
          fill
          disabled={productBlocked}
          title="품목 변경"
          description="공장 생산 품목을 갈아타면서 다음 성장 구간으로 방향을 바꾸는 선택입니다."
          pros="새 시장이나 더 유리한 상품으로 빠르게 선회할 수 있습니다."
          cons="현재 계약이 끊기고 새 도매업체를 다시 골라야 합니다."
          state={productBlocked ? `지금 못 누르는 이유: ${productBlockedReason}` : '지금 누르면 기존 계약이 해제되고 새 품목 탐색이 필요해집니다.'}
        >
          <button
            type="button"
            className="factory-btn"
            disabled={productBlocked}
            onClick={s.changeProduct}
          >
            품목 변경<small>{fmtW(C.FACTORY_PRODUCT_COST)}</small>
          </button>
        </HoverHint>
      </div>

      {/* Factory status */}
      {f.built && (
        <div className={`factory-status${f.buildTurnsLeft > 0 ? ' building' : ''}`}>
          {f.buildTurnsLeft > 0
            ? `건설 중… ${f.buildTurnsLeft}턴 후 완공`
            : `운영 중 · Lv.${f.upgradeLevel} · 산재위험 ${Math.round(f.accidentRisk * 100)}%`}
        </div>
      )}

      {/* Safety toggle — only when running */}
      {factoryRunning && (
        <HoverHint
          title="안전관리비"
          description="생산 라인 안전 예산을 유지해 사고와 돌발 악재를 줄이는 스위치입니다."
          pros="안전 ON이면 사고 누적 리스크를 낮춰 장기 운영이 안정적입니다."
          cons="매달 비용이 빠져나가 단기 현금 흐름은 나빠집니다."
          state={f.safetyOn ? `현재 ON 상태입니다. 매달 ${fmtW(C.FACTORY_SAFETY_COST)}이 지출됩니다.` : '현재 OFF 상태입니다. 비용은 아끼지만 사고 리스크가 누적됩니다.'}
        >
          <button
            type="button"
            className={`safety-btn${f.safetyOn ? ' safe-on' : ' safe-off'}`}
            onClick={s.toggleSafety}
          >
            {f.safetyOn
              ? `안전관리비 ON (월 ${fmtW(C.FACTORY_SAFETY_COST)}) — 클릭하여 OFF`
              : `안전관리비 OFF — 산재 위험 누적 중! 클릭하여 ON`}
          </button>
        </HoverHint>
      )}
    </div>
  );
}
