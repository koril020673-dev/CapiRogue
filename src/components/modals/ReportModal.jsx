import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmt, fmtW, sign } from '../../utils.js';

function Row({ label, value, sub }) {
  return (
    <div className="report-row">
      <span className="report-label">{label}</span>
      <span className={`report-value ${sub}`}>{value}</span>
    </div>
  );
}

export default function ReportModal() {
  const d = useGameStore(s => s.modalData) || {};
  const closeModal = useGameStore(s => s.closeModal);
  const turn       = useGameStore(s => s.turn);

  const {
    sold = 0, demand = 0, revenue = 0, cogs = 0,
    totalFixed = 0, netProfit = 0,
    shareResult = {}, cartelFine = 0, accPenalty = 0,
    bsEffect = null,
  } = d;

  const gross  = revenue - cogs;
  const operating = gross - totalFixed;

  return (
    <div className="modal-box report-modal">
      <div className="modal-header">
        <h3>월간 보고서 — {turn - 1}월차</h3>
      </div>

      <div className="report-section">
        <div className="report-sub-title">판매</div>
        <Row label="수요"      value={`${fmt(demand)} 개`} />
        <Row label="점유율"    value={`${(shareResult.myShare * 100).toFixed(1)}%`} />
        <Row label="판매 수량" value={`${fmt(sold)} 개`} />
        <Row label="매출"      value={fmtW(revenue)} />
      </div>

      <div className="report-section">
        <div className="report-sub-title">비용</div>
        <Row label="매입 원가 (COGS)" value={fmtW(-cogs)} sub="red" />
        <Row label="고정 비용"        value={fmtW(-totalFixed)} sub="red" />
        {cartelFine > 0 && <Row label="카르텔 과징금" value={fmtW(-cartelFine)} sub="red" />}
        {accPenalty > 0 && <Row label="산재 보상금"   value={fmtW(-accPenalty)} sub="red" />}
      </div>

      <div className="report-section">
        <div className="report-sub-title">손익</div>
        <Row label="영업 이익" value={fmtW(operating)} sub={operating >= 0 ? 'green' : 'red'} />
        <Row label="당월 순이익" value={sign(netProfit) + fmtW(Math.abs(netProfit))} sub={netProfit >= 0 ? 'green' : 'red'} />
      </div>

      {bsEffect && (
        <div className="report-section bs-note">
          <div className="report-sub-title">블랙 스완 효과</div>
          <p>{bsEffect.desc}</p>
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={closeModal}>
        확인 (다음 달 계획 세우기)
      </button>
    </div>
  );
}
