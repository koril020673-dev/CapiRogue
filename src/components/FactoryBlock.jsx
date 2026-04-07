import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { C } from '../constants.js';
import { fmtW } from '../utils.js';

export default function FactoryBlock() {
  const factory      = useGameStore(s => s.factory);
  const capital      = useGameStore(s => s.capital);
  const buildFactory  = useGameStore(s => s.buildFactory);
  const upgradeFactory = useGameStore(s => s.upgradeFactory);
  const changeProduct = useGameStore(s => s.changeProduct);
  const toggleSafety  = useGameStore(s => s.toggleSafety);

  const f = factory;
  const factoryRunning = f.built && f.buildTurnsLeft <= 0;

  return (
    <div className="factory-block">
      <div className="factory-btns">
        <button
          className="factory-btn"
          disabled={f.built}
          onClick={buildFactory}
          title={`5억원 소요 · 3턴 후 완공 · 원가 -40%`}
        >
          공장 설립<small>{fmtW(C.FACTORY_BUILD_COST)}</small>
        </button>
        <button
          className="factory-btn"
          disabled={!f.built || capital < C.FACTORY_UPGRADE_COST}
          onClick={upgradeFactory}
          title="품질 +20pt"
        >
          업그레이드<small>{fmtW(C.FACTORY_UPGRADE_COST)}</small>
        </button>
        <button
          className="factory-btn"
          disabled={!f.built || capital < C.FACTORY_PRODUCT_COST}
          onClick={changeProduct}
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
          onClick={toggleSafety}
        >
          {f.safetyOn
            ? `안전관리비 ON (월 ${fmtW(C.FACTORY_SAFETY_COST)}) — 클릭하여 OFF`
            : `안전관리비 OFF — 산재 위험 누적 중! 클릭하여 ON`}
        </button>
      )}
    </div>
  );
}
