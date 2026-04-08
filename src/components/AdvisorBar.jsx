import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { ADVISOR_AVATAR, ADVISOR_LABEL, ECO_WEIGHTS } from '../constants.js';
import { RIVAL_BLUEPRINTS } from '../designData.js';
import { fmtW, pct } from '../utils.js';

function generateLines(state) {
  const lines = [];
  if (!state.selectedVendor) {
    lines.push('먼저 이번 달에 공략할 상품을 탐색하고 OEM 계약을 체결하세요.');
    return lines;
  }

  const ecoLabel = { boom: '호황', stable: '안정', recession: '불황' }[state.economy.phase] || '안정';
  const categoryLabel = { essential: '필수재', normal: '일반재', luxury: '사치재' }[state.itemCategory] || '일반재';
  const ecoWeight = ECO_WEIGHTS[state.itemCategory]?.[state.economy.phase] ?? 1;
  const activeRivals = state.rivals.filter((rival) => !rival.bankrupt);

  lines.push(`시장: ${ecoLabel} · ${categoryLabel} 수요 x${ecoWeight.toFixed(2)} · 현재 점유율 ${pct(state.marketShare)}`);

  if (state.difficulty === 'easy') {
    const rival = activeRivals[0];
    if (rival) {
      const profile = RIVAL_BLUEPRINTS[rival.archetype] || RIVAL_BLUEPRINTS.aggressive;
      lines.push(`${rival.name}: ${profile.primer}`);
      lines.push(`예상 판매가 ${fmtW(rival.sellPrice || 0)} · 파훼 ${profile.weaknessHint}`);
    }
    return lines;
  }

  activeRivals.slice(0, state.difficulty === 'normal' ? 2 : 4).forEach((rival) => {
    const profile = RIVAL_BLUEPRINTS[rival.archetype] || RIVAL_BLUEPRINTS.aggressive;
    lines.push(`${rival.name}: ${fmtW(rival.sellPrice || 0)} / ${pct(rival.marketShare || 0)} / ${profile.label}`);
  });

  if (state.difficulty === 'insane') {
    lines.push('인세인 난이도에서는 일부 정보가 왜곡될 수 있습니다.');
  }

  return lines;
}

export default function AdvisorBar() {
  const state = useGameStore(useShallow((store) => ({
    difficulty: store.difficulty,
    rivals: store.rivals,
    selectedVendor: store.selectedVendor,
    itemCategory: store.itemCategory,
    economy: store.economy,
    marketShare: store.marketShare,
  })));

  const lines = generateLines(state);
  const difficulty = state.difficulty;

  return (
    <div className={`advisor-bar advisor-${difficulty}`}>
      <div className="advisor-avatar">{ADVISOR_AVATAR[difficulty] || '🧠'}</div>
      <div className="advisor-body">
        <div className="advisor-mode">{ADVISOR_LABEL[difficulty] || 'AI 비서'}</div>
        <div className="advisor-bubble">
          {lines.map((line, index) => <div key={index}>{line}</div>)}
        </div>
      </div>
    </div>
  );
}
