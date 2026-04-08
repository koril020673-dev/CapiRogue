import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { C } from '../constants.js';
import { fmtW } from '../utils.js';

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

  return (
    <div className="factory-block">
      <div className="factory-btns">
        <button
          className="factory-btn"
          disabled={f.built}
          onClick={s.buildFactory}
          title={`5억원 소요 · 3턴 후 완공 · 원가 -40%`}
        >
          공장 설립<small>{fmtW(C.FACTORY_BUILD_COST)}</small>
        </button>
        <button
          className="factory-btn"
          disabled={!factoryRunning || s.capital < C.FACTORY_UPGRADE_COST}
          onClick={s.upgradeFactory}
          title="품질 +20pt"
        >
          업그레이드<small>{fmtW(C.FACTORY_UPGRADE_COST)}</small>
        </button>
        <button
          className="factory-btn"
          disabled={!factoryRunning || s.capital < C.FACTORY_PRODUCT_COST}
          onClick={s.changeProduct}
          title="도매업체 재선택 필요"
        >
          품목 변경<small>{fmtW(C.FACTORY_PRODUCT_COST)}</small>
        </button>
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
        <button
          className={`safety-btn${f.safetyOn ? ' safe-on' : ' safe-off'}`}
          onClick={s.toggleSafety}
        >
          {f.safetyOn
            ? `안전관리비 ON (월 ${fmtW(C.FACTORY_SAFETY_COST)}) — 클릭하여 OFF`
            : `안전관리비 OFF — 산재 위험 누적 중! 클릭하여 ON`}
        </button>
      )}
    </div>
  );
}
