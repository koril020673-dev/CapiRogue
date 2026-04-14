import React from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import HoverHint from './HoverHint.jsx';

export default function ActionButtons() {
  const s = useGameStore(useShallow(state => ({
    difficulty: state.difficulty,
    openModal: state.openModal,
  })));

  const actions = [
    {
      id: 'realty',
      label: '부동산 전략',
      help: '사옥과 부지로 장기 체력 조정',
      className: 'action-btn',
      title: '부동산 전략',
      description: '사무실과 부지를 바꿔 월 고정비, 자산 가치, 장기 유지력을 재설계합니다.',
      pros: '고정비 구조를 바꾸거나 자산을 쌓는 장기 선택지로 좋습니다.',
      cons: '즉시 매출이 오르지 않고 큰 금액이 묶일 수 있습니다.',
    },
    {
      id: 'finance',
      label: '자금 조달',
      help: '대출과 상환으로 현금 흐름 제어',
      className: 'action-btn',
      title: '자금 조달',
      description: '당장 필요한 운영 자금을 대출로 확보하거나 기존 빚을 상환하는 메뉴입니다.',
      pros: '자금 부족으로 좋은 기회를 놓칠 상황을 빠르게 막을 수 있습니다.',
      cons: '대출은 매달 이자를 늘려 다음 턴 부담으로 돌아옵니다.',
    },
    {
      id: 'mna',
      label: 'M&A 작전',
      help: '경쟁사 인수로 한 번에 판 흔들기',
      className: 'action-btn action-btn-p',
      title: 'M&A 작전',
      description: '거액을 들여 경쟁사를 인수하거나 시장 구도를 단번에 바꾸는 고위험 전략입니다.',
      pros: '성공하면 시장 점유율과 성장 속도를 크게 당길 수 있습니다.',
      cons: '실패하거나 무리하게 집행하면 현금 흐름이 급격히 나빠질 수 있습니다.',
      minDifficulty: ['hard', 'insane'],
    },
    {
      id: 'meta',
      label: '메타 기록',
      help: '이번 판 밖 누적 성장 확인',
      className: 'action-btn action-btn-g',
      title: '메타 기록',
      description: '판이 끝나도 남는 누적 보너스와 성장 기록을 확인하는 장기 진행도 화면입니다.',
      pros: '다음 판 시작 자본과 장기 플레이 목표를 관리하기 좋습니다.',
      cons: '이번 달 운영을 즉시 바꾸는 행동은 아닙니다.',
    },
  ].filter((action) => !action.minDifficulty || action.minDifficulty.includes(s.difficulty));

  return (
    <div className="action-row">
      {actions.map((action) => (
        <HoverHint
          key={action.id}
          fill
          title={action.title}
          description={action.description}
          pros={action.pros}
          cons={action.cons}
          state="지금 눌러도 이번 달 실행 전에 한 번 더 내용을 확인할 수 있습니다."
        >
          <button type="button" className={action.className} onClick={() => s.openModal(action.id)}>
            <span className="action-btn-copy">
              <span className="action-btn-label">{action.label}</span>
              <span className="action-btn-help">{action.help}</span>
            </span>
          </button>
        </HoverHint>
      ))}
    </div>
  );
}
