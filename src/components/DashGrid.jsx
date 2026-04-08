import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { sign, pct } from '../utils.js';

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (prev.current === target) return;
    const start = prev.current;
    prev.current = target;
    const startTime = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + (target - start) * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function DashCell({ label, helper, children, className = '' }) {
  return (
    <div className={`dash-cell ${className}`}>
      <div className="dash-lbl">{label}</div>
      <div className="dash-val">{children}</div>
      {helper && <div className="dash-helper">{helper}</div>}
    </div>
  );
}

export default function DashGrid() {
  const result    = useGameStore(s => s.lastTurnResult);
  const cumProfit = useGameStore(s => s.cumulativeProfit);

  const netProfit = result?.netProfit ?? 0;
  const demand    = result?.demand ?? 0;
  const sold      = result?.sold ?? 0;
  const myShare   = result?.shareResult?.myShare ?? 0;

  const animProfit = useCountUp(netProfit);

  return (
    <div className="dash-grid">
      <DashCell label="이번 달 순이익" helper={netProfit >= 0 ? '수익 구간' : '손실 구간'}>
        <span style={{ color: netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {sign(animProfit)}
        </span>
      </DashCell>
      <DashCell label="시장 총 수요" helper="이번 달 전체 소비량">
        {demand > 0 ? demand.toLocaleString('ko-KR') + '개' : '–'}
      </DashCell>
      <DashCell label="내 판매량" helper={`시장 점유율 ${pct(myShare)}`}>
        {sold > 0 ? sold.toLocaleString('ko-KR') + '개' : '–'}
      </DashCell>
      <DashCell label="누적 총이익" helper="장기 성과 누적치">
        <span style={{ color: cumProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {sign(cumProfit)}
        </span>
      </DashCell>
    </div>
  );
}
