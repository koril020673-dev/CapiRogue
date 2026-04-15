import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { HQ_STAGES, CREDIT_GRADES } from '../constants.js';
import { calcCreditGrade, netWorth, fmtW, pct, sign, getCycleTurn, getRunCycle } from '../utils.js';

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
    difficulty: s.difficulty, challenge: s.challenge, profitHistory: s.profitHistory,
    cumulativeProfit: s.cumulativeProfit,
  })));

  const nw    = netWorth(s);
  const grade = s.creditGrade || calcCreditGrade(nw);
  const gc    = CREDIT_GRADES[grade];
  const stage = HQ_STAGES.find(t => nw >= t.min) || HQ_STAGES[3];
  const infiniteMode = Boolean(s.challenge?.infiniteMode);
  const cycleTurn = getCycleTurn(s.turn, s.maxTurns, infiniteMode);
  const cycle = getRunCycle(s.turn, s.maxTurns, infiniteMode);
  const turnPct = Math.min((cycleTurn / s.maxTurns) * 100, 100);
  const awarenessBonus = s.marketing?.awarenessBonus || 0;
  const diffLabel = { easy: '이지', normal: '노멀', hard: '하드', insane: '인세인' }[s.difficulty] || '노멀';
  const phaseLabel = { boom: '호황', stable: '안정', recession: '침체' }[s.economy.phase] || '안정';

  const animatedCapital = useAnimatedNumber(s.capital);
  const animatedDebt = useAnimatedNumber(s.debt);
  const animatedNetWorth = useAnimatedNumber(nw);
  const animatedCumulativeProfit = useAnimatedNumber(s.cumulativeProfit);

  // Profit chart
  const history = s.profitHistory.slice(-12);
  const maxAbs  = Math.max(...history.map(v => Math.abs(v)), 1);

  return (
    <div className="panel-left" data-tutorial="hq-panel">
      <div className="lp-command-card">
        <div className="lp-kicker">Headquarters</div>
        <div className="lp-title-row">
          <div className="lp-title">캐피로그</div>
          <span className="lp-turn-badge">{infiniteMode ? `Loop ${cycle} · ${cycleTurn}개월 차` : `${s.turn}개월 차`}</span>
        </div>
        <div className="lp-subtitle">{diffLabel} 작전 · {phaseLabel} 시장 · {stage.stage}{infiniteMode ? ` · 무한모드 Loop ${cycle}` : ''}</div>
      </div>

      <div className="hq-block">
        <div className="hq-building">{stage.emoji}</div>
        <div className="hq-stage">{stage.stage}</div>
        <div className="hq-name">{stage.name}</div>
        <div className="lp-hero-stats">
          <div className="lp-hero-stat">
            <span>실효 금리</span>
            <strong>{(s.effectiveInterestRate * 100).toFixed(1)}%</strong>
          </div>
          <div className="lp-hero-stat">
            <span>신용 등급</span>
            <strong>{grade}등급</strong>
          </div>
        </div>
      </div>

      <div className="lp-body">
        <div className="lp-finance-grid">
          <div className="lp-finance-card">
            <span>보유 현금</span>
            <strong style={{ color: animatedCapital >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtW(animatedCapital)}</strong>
          </div>
          <div className="lp-finance-card">
            <span>대출금</span>
            <strong style={{ color: 'var(--red)' }}>{fmtW(animatedDebt)}</strong>
          </div>
          <div className="lp-finance-card">
            <span>순자산</span>
            <strong style={{ color: animatedNetWorth >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtW(animatedNetWorth)}</strong>
          </div>
        </div>

        <div className="grade-row">
          <span className={`grade-letter g${grade}`}>{grade}등급</span>
          <div className="grade-detail">{gc.label} · {(s.effectiveInterestRate * 100).toFixed(1)}%</div>
        </div>

        <div className="turn-progress">
          <div className="turn-bar">
            <div className="turn-fill" style={{ width: turnPct + '%' }} />
          </div>
          <div className="turn-nums">{infiniteMode ? `${cycleTurn} / ${s.maxTurns}개월 · Loop ${cycle}` : `${s.turn} / ${s.maxTurns}개월`}</div>
        </div>

        <div className="divider" />

        <Collapsible title="브랜드 · 시장" defaultOpen={true}>
          <StatRow label="브랜드"   value={s.brandValue + ' pt'} />
          <StatRow label="저항성"   value={pct(s.priceResistance)} />
          <StatRow label="점유율"   value={pct(s.marketShare)} color="var(--blue)" />
          {awarenessBonus > 0 && (
            <StatRow label="인지도 보너스" value={`+${(awarenessBonus * 100).toFixed(1)}%`} color="var(--purple)" />
          )}
        </Collapsible>

        <div className="divider" />

        <Collapsible title="기타 현황" defaultOpen={false}>
          <StatRow label="부동산" value={{ monthly:'월세', jeonse:'전세', owned:'자가'  }[s.realty] || '월세'} />
          <StatRow label="M&A 횟수" value={s.mna.count + '회'} />
          <StatRow label="누적 이익" value={sign(animatedCumulativeProfit)} color={animatedCumulativeProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        </Collapsible>

        <div className="divider" />

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
