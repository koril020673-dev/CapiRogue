import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmt, fmtW, sign } from '../../utils.js';

/* ── 숫자 카운트업 훅 ── */
function useCountUp(target, duration = 700, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const timer = setTimeout(() => {
      const start = 0;
      const startTime = performance.now();
      const tick = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(start + (target - start) * ease));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return value;
}

/* ── 개별 행 (애니메이션 포함) ── */
function AnimRow({ label, value, sub, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className="report-row"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      <span className="report-label">{label}</span>
      <span className={`report-value ${sub || ''}`}>{value}</span>
    </div>
  );
}

/* ── 금액 카운트업 행 ── */
function MoneyRow({ label, amount, sub, delay = 0 }) {
  const animated = useCountUp(Math.abs(amount), 600, delay);
  const sign_ = amount < 0 ? '-' : amount > 0 ? '+' : '';
  const display = sign_ + fmtW(animated);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className="report-row"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      <span className="report-label">{label}</span>
      <span className={`report-value ${sub || ''}`}>{display}</span>
    </div>
  );
}

export default function ReportModal() {
  const d          = useGameStore(s => s.modalData) || {};
  const closeModal = useGameStore(s => s.closeModal);
  const turn       = useGameStore(s => s.turn);

  const {
    sold = 0, demand = 0, revenue = 0, cogs = 0,
    totalFixed = 0, netProfit = 0,
    shareResult = {}, cartelFine = 0, accPenalty = 0,
    corporateTax = 0, inventoryHoldingCost = 0, disposalPenalty = 0,
    staleUnits = 0, inventoryUnits = 0, policyDelta = 0, policyTitle = '',
    effectiveRate = 0, creditGrade = 'D',
    deficitStreak = 0, deficitRatePenalty = 0,
    inflationIndex = 100,
    bsEffect = null,
  } = d;

  const gross     = revenue - cogs;
  const operating = gross - totalFixed;

  /* ── 섹션별 등장 딜레이 (ms) ── */
  const D = {
    s1: 0,     // 판매 섹션
    demand: 60, sold: 110, revenue: 160,
    s2: 260,   // 비용 섹션
    cogs: 320, fixed: 370, extra: 420,
    s3: 500,   // 손익 섹션
    op: 560, net: 640,
    btn: 750,
  };

  /* 당월 순이익 카운트업 */
  const animNet = useCountUp(Math.abs(netProfit), 700, D.net);
  const [netVis, setNetVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setNetVis(true), D.net);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="modal-box report-modal">
      <div className="modal-header">
        <h3>월간 보고서 — {turn - 1}월차</h3>
      </div>

      {/* 판매 */}
      <div className="report-section" style={{ animationDelay: `${D.s1}ms` }}>
        <div className="report-sub-title">📦 판매</div>
        <AnimRow  label="시장 총 수요"  value={`${fmt(demand)} 개`}                               delay={D.demand} />
        <AnimRow  label="점유율"        value={`${((shareResult.myShare||0)*100).toFixed(1)}%`}   delay={D.sold} />
        <AnimRow  label="판매 수량"     value={`${fmt(sold)} 개`}                                 delay={D.sold + 30} />
        <MoneyRow label="매출"          amount={revenue}  sub="green"                             delay={D.revenue} />
      </div>

      {/* 비용 */}
      <div className="report-section">
        <div className="report-sub-title">💸 비용</div>
        <MoneyRow label="매입 원가 (COGS)" amount={-cogs}       sub="red"  delay={D.cogs} />
        <MoneyRow label="고정 비용"        amount={-totalFixed} sub="red"  delay={D.fixed} />
        {inventoryHoldingCost > 0 && <MoneyRow label="재고 보관비" amount={-inventoryHoldingCost} sub="red" delay={D.extra} />}
        {disposalPenalty > 0 && <MoneyRow label="재고 폐기비" amount={-disposalPenalty} sub="red" delay={D.extra + 20} />}
        {corporateTax > 0 && <MoneyRow label="법인세" amount={-corporateTax} sub="red" delay={D.extra + 40} />}
        {cartelFine > 0 && <MoneyRow label="카르텔 과징금" amount={-cartelFine} sub="red" delay={D.extra} />}
        {accPenalty > 0 && <MoneyRow label="산재 보상금"   amount={-accPenalty} sub="red" delay={D.extra + 40} />}
      </div>

      {/* 손익 */}
      <div className="report-section report-pnl-section">
        <div className="report-sub-title">📊 손익</div>
        <MoneyRow label="영업 이익"   amount={operating} sub={operating >= 0 ? 'green' : 'red'} delay={D.op} />
        {/* 순이익은 강조 카운트업 */}
        <div
          className={`report-row report-net-row ${netProfit >= 0 ? 'net-pos' : 'net-neg'}`}
          style={{
            opacity: netVis ? 1 : 0,
            transform: netVis ? 'scale(1)' : 'scale(0.92)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          <span className="report-label report-net-label">당월 순이익</span>
          <span className={`report-value report-net-value ${netProfit >= 0 ? 'green' : 'red'}`}>
            {netProfit < 0 ? '-' : '+'}{fmtW(animNet)}
          </span>
        </div>
      </div>

      <div className="report-section">
        <div className="report-sub-title">📌 정책 · 금융 · 재고</div>
        <AnimRow label="정책 이벤트" value={policyTitle || '없음'} delay={D.op + 20} />
        {policyTitle && <MoneyRow label="정책 영향" amount={policyDelta} sub={policyDelta >= 0 ? 'green' : 'red'} delay={D.op + 40} />}
        <AnimRow label="대출 등급/금리" value={`${creditGrade} / ${(effectiveRate * 100).toFixed(1)}%`} delay={D.op + 60} />
        <AnimRow label="물가 지수" value={`${inflationIndex.toFixed(0)}`} delay={D.op + 65} />
        <AnimRow label="연속 적자/가산" value={`${deficitStreak}턴 / +${(deficitRatePenalty * 100).toFixed(1)}%p`} delay={D.op + 70} />
        <AnimRow label="잔여 재고" value={`${fmt(inventoryUnits)}개 (악성 ${fmt(staleUnits)}개)`} delay={D.op + 80} />
      </div>

      {bsEffect && (
        <div className="report-section bs-note">
          <div className="report-sub-title">⚠️ 블랙 스완 효과</div>
          <p style={{ fontSize: '12px', color: 'var(--dim)' }}>{bsEffect.desc}</p>
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        onClick={closeModal}
        style={{
          opacity: 0,
          animation: `fadeInUp 0.3s ease ${D.btn}ms forwards`,
        }}
      >
        확인 — 다음 달 계획 세우기 →
      </button>
    </div>
  );
}
