import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { ADVISOR_AVATAR, ADVISOR_LABEL, ECO_WEIGHTS } from '../constants.js';
import { fmtW, pct } from '../utils.js';

function generateLines(s) {
  const lines = [];
  if (!s.selectedVendor) {
    lines.push('아직 도매업체 계약이 없습니다. 아이템을 검색하고 업체를 선택해 주세요.');
    return lines;
  }
  const catKR   = { essential: '필수재', normal: '일반재', luxury: '사치재' }[s.itemCategory] || '일반재';
  const ecoKR   = { boom: '호황기 🚀', stable: '평시', recession: '불황기 📉' }[s.economy.phase] || '평시';
  const ecoW    = ECO_WEIGHTS[s.itemCategory]?.[s.economy.phase] ?? 1.0;
  const diff    = s.difficulty;

  if (diff === 'easy') {
    const rv0 = s.rivals[0];
    if (rv0 && !rv0.bankrupt) {
      const nextPrice = Math.round(rv0.sellPrice * (rv0.pattern === 'aggressive' ? 0.93 : rv0.pattern === 'premium' ? 1.02 : 0.97));
      const action = { aggressive: '가격 인하 예정', premium: '품질 강화 집중', copycat: '우리 가격 추적' };
      lines.push(`${rv0.name}: 다음 달 예상가 ${fmtW(nextPrice)} / ${action[rv0.pattern]}`);
    }
    lines.push(`시장: ${ecoKR} (${catKR} 수요 배율 ×${ecoW.toFixed(1)})`);
    if (s.marketShare > 0 && s.marketShare < 0.20) lines.push(`점유율 ${pct(s.marketShare)} — 가격 전략 조정 필요!`);
  } else if (diff === 'normal') {
    s.rivals.filter(r => !r.bankrupt).forEach(rv => {
      const vt = { aggressive: '저가 도매업체', premium: '고급 도매업체', copycat: '표준 도매업체' }[rv.pattern] || '–';
      lines.push(`${rv.name}: ${fmtW(rv.sellPrice || 0)} 판매 / ${vt} / ${pct(rv.marketShare || 0)}`);
    });
    lines.push(`경기: ${ecoKR} | ${catKR} ×${ecoW.toFixed(1)}`);
  } else if (diff === 'hard') {
    lines.push(`거시 지표 브리핑`);
    lines.push(`경기: ${ecoKR} | 금리: ${(s.interestRate * 100).toFixed(1)}% | 수요 배율: ×${ecoW.toFixed(1)}`);
    lines.push(`내 점유율: ${pct(s.marketShare)} | 활성 라이벌: ${s.rivals.filter(r => !r.bankrupt).length}명`);
  } else if (diff === 'insane') {
    lines.push(`[인세인] 데이터 신뢰도 불보증`);
    lines.push(`금리: ${(s.interestRate * 100).toFixed(1)}% | ${ecoKR}`);
    s.rivals.filter(r => !r.bankrupt).forEach(rv => {
      if (Math.random() < 0.30) {
        lines.push(`⚠ [허위] ${rv.name}: ${fmtW(Math.round(rv.sellPrice * (0.5 + Math.random())))}`);
      } else {
        lines.push(`${rv.name}: 약 ${fmtW(rv.sellPrice || 0)} 추정`);
      }
    });
  }
  return lines;
}

export default function AdvisorBar() {
  const s = useGameStore(useShallow(s => ({
    difficulty: s.difficulty, rivals: s.rivals,
    selectedVendor: s.selectedVendor, itemCategory: s.itemCategory,
    economy: s.economy, interestRate: s.effectiveInterestRate || s.interestRate,
    marketShare: s.marketShare, turn: s.turn,
  })));

  const lines = generateLines(s);
  const diff  = s.difficulty;

  return (
    <div className={`advisor-bar advisor-${diff}`}>
      <div className="advisor-avatar">{ADVISOR_AVATAR[diff] || '🤖'}</div>
      <div className="advisor-body">
        <div className="advisor-mode">{ADVISOR_LABEL[diff] || 'AI 비서'}</div>
        <div className="advisor-bubble">
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
