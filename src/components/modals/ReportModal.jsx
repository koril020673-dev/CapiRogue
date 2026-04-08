import React from 'react';
import { useGameStore } from '../../store/useGameStore.js';
import { fmtW, sign } from '../../utils.js';

function Row({ label, value, tone }) {
  return (
    <div className="report-row">
      <span className="report-label">{label}</span>
      <span className={`report-value ${tone || ''}`}>{value}</span>
    </div>
  );
}

export default function ReportModal() {
  const data = useGameStore((state) => state.modalData) || {};
  const closeModal = useGameStore((state) => state.closeModal);
  const turn = useGameStore((state) => state.turn);

  const gross = (data.revenue || 0) - (data.cogs || 0);
  const operating = gross - (data.totalFixed || 0);

  return (
    <div className="modal-box report-modal">
      <div className="modal-header">
        <h3>월간 보고서 · {turn - 1}월</h3>
      </div>

      <div className="report-section">
        <div className="report-sub-title">판매</div>
        <Row label="시장 총수요" value={`${(data.demand || 0).toLocaleString('ko-KR')}개`} />
        <Row label="우리 점유율" value={`${(((data.shareResult?.myShare) || 0) * 100).toFixed(1)}%`} />
        <Row label="실판매 수량" value={`${(data.sold || 0).toLocaleString('ko-KR')}개`} />
        <Row label="매출" value={fmtW(data.revenue || 0)} tone="green" />
      </div>

      <div className="report-section">
        <div className="report-sub-title">원가와 비용</div>
        <Row label="발주 원가" value={fmtW(-(data.cogs || 0))} tone="red" />
        <Row label="고정비" value={fmtW(-(data.totalFixed || 0))} tone="red" />
        {(data.disposalPenalty || 0) > 0 && <Row label="폐기비" value={fmtW(-(data.disposalPenalty || 0))} tone="red" />}
        {(data.corporateTax || 0) > 0 && <Row label="법인세" value={fmtW(-(data.corporateTax || 0))} tone="red" />}
        {(data.cartelFine || 0) > 0 && <Row label="담합 과징금" value={fmtW(-(data.cartelFine || 0))} tone="red" />}
        {(data.accPenalty || 0) > 0 && <Row label="산재/사고 비용" value={fmtW(-(data.accPenalty || 0))} tone="red" />}
      </div>

      <div className="report-section">
        <div className="report-sub-title">손익</div>
        <Row label="매출총이익" value={sign(gross)} tone={gross >= 0 ? 'green' : 'red'} />
        <Row label="영업이익" value={sign(operating)} tone={operating >= 0 ? 'green' : 'red'} />
        <Row label="순이익" value={sign(data.netProfit || 0)} tone={(data.netProfit || 0) >= 0 ? 'green' : 'red'} />
      </div>

      <div className="report-section">
        <div className="report-sub-title">거시와 금융</div>
        <Row label="정책 이벤트" value={data.policyTitle || '없음'} />
        {(data.policyDelta || 0) !== 0 && (
          <Row label="정책 영향" value={sign(data.policyDelta || 0)} tone={(data.policyDelta || 0) >= 0 ? 'green' : 'red'} />
        )}
        <Row label="신용등급 / 실효금리" value={`${data.creditGrade || 'D'} / ${(((data.effectiveRate) || 0) * 100).toFixed(1)}%`} />
        <Row label="물가 지수" value={`${Math.round(data.inflationIndex || 100)}`} />
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={closeModal}>
        다음 달 준비하기
      </button>
    </div>
  );
}
