import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { HQ_STAGES, CREDIT_GRADES } from '../constants.js';
import { calcCreditGrade, netWorth, fmtW, pct, sign } from '../utils.js';

function useAnimatedNumber(target, duration = 1000) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    const from = displayRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const start = performance.now();
    let rafId = 0;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + delta * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return display;
}

function Collapsible({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="lp-section">
      <button className="lp-section-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className={`lp-chevron${open ? ' open' : ''}`}>›</span>
      </button>
      {open && <div className="lp-section-body">{children}</div>}
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

export default function LeftPanel() {
  const s = useGameStore(useShallow(s => ({
    capital: s.capital, debt: s.debt, propertyValue: s.propertyValue,
    brandValue: s.brandValue, priceResistance: s.priceResistance,
    marketShare: s.marketShare, marketing: s.marketing,
    mna: s.mna, realty: s.realty, interestRate: s.interestRate,
    creditGrade: s.creditGrade, effectiveInterestRate: s.effectiveInterestRate,
    economy: s.economy, turn: s.turn, maxTurns: s.maxTurns,
    difficulty: s.difficulty, profitHistory: s.profitHistory,
    cumulativeProfit: s.cumulativeProfit,
  })));

  const nw    = netWorth(s);
  const grade = s.creditGrade || calcCreditGrade(nw);
  const gc    = CREDIT_GRADES[grade];
  const stage = HQ_STAGES.find(t => nw >= t.min) || HQ_STAGES[3];
  const turnPct = Math.min((s.turn / s.maxTurns) * 100, 100);
  const awarenessBonus = s.marketing?.awarenessBonus || 0;

  const animatedCapital = useAnimatedNumber(s.capital);
  const animatedDebt = useAnimatedNumber(s.debt);
  const animatedNetWorth = useAnimatedNumber(nw);
  const animatedCumulativeProfit = useAnimatedNumber(s.cumulativeProfit);

  // Profit chart
  const history = s.profitHistory.slice(-12);
  const maxAbs  = Math.max(...history.map(v => Math.abs(v)), 1);

  return (
    <div className="panel-left">
      {/* Header */}
      <div className="lp-header">
        <div className="lp-title">
          캐피로그
          <span className="lp-turn-badge">{s.turn}개월 차</span>
        </div>
      </div>

      {/* HQ Visual */}
      <div className="hq-block">
        <div className="hq-building">{stage.emoji}</div>
        <div className="hq-stage">{stage.stage}</div>
        <div className="hq-name">{stage.name}</div>
      </div>

      {/* Finance — always visible */}
      <div className="lp-body">
        <div className="section-label">재무</div>
        <StatRow label="보유 현금" value={fmtW(animatedCapital)} color={animatedCapital >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatRow label="대출금"   value={fmtW(animatedDebt)}    color="var(--red)" />
        <StatRow label="순자산"   value={fmtW(animatedNetWorth)} color={animatedNetWorth >= 0 ? 'var(--green)' : 'var(--red)'} />

        <div className="grade-row">
          <span className={`grade-letter g${grade}`}>{grade}등급</span>
          <div className="grade-detail">{gc.label} · {(s.effectiveInterestRate * 100).toFixed(1)}%</div>
        </div>

        {/* Turn progress — always visible */}
        <div className="turn-progress">
          <div className="turn-bar">
            <div className="turn-fill" style={{ width: turnPct + '%' }} />
          </div>
          <div className="turn-nums">{s.turn} / {s.maxTurns}개월</div>
        </div>

        <div className="divider" />

        {/* Brand & Market — collapsible */}
        <Collapsible title="브랜드 · 시장" defaultOpen={true}>
          <StatRow label="브랜드"   value={s.brandValue + ' pt'} />
          <StatRow label="저항성"   value={pct(s.priceResistance)} />
          <StatRow label="점유율"   value={pct(s.marketShare)} color="var(--blue)" />
          {awarenessBonus > 0 && (
            <StatRow label="인지도 보너스" value={`+${(awarenessBonus * 100).toFixed(1)}%`} color="var(--purple)" />
          )}
        </Collapsible>

        <div className="divider" />

        {/* Details — collapsible */}
        <Collapsible title="기타 현황" defaultOpen={false}>
          <StatRow label="부동산" value={{ monthly:'월세', jeonse:'전세', owned:'자가'  }[s.realty] || '월세'} />
          <StatRow label="M&A 횟수" value={s.mna.count + '회'} />
          <StatRow label="누적 이익" value={sign(animatedCumulativeProfit)} color={animatedCumulativeProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        </Collapsible>

        <div className="divider" />

        {/* Profit chart — collapsible */}
        <Collapsible title="월별 손익" defaultOpen={true}>
          <div className="chart-wrap">
            <div className="chart-bars">
              {history.length === 0 ? (
                <div className="chart-empty">데이터 없음</div>
              ) : (
                history.map((val, i) => {
                  const h = Math.max(2, Math.round(Math.abs(val) / maxAbs * 28));
                  return (
                    <div key={i} className="bar-col" title={sign(val)}>
                      <div className={val >= 0 ? 'bar-pos' : 'bar-neg'} style={{ height: h + 'px' }} />
                    </div>
                  );
                })
              )}
              <div className="chart-baseline" />
            </div>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
