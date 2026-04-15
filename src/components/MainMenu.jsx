import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { loadMeta } from '../utils.js';

function formatSavedAt(savedAt) {
  if (!savedAt) return '저장 기록 없음';
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return '저장 시간 미상';
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MainMenu() {
  const meta = loadMeta();
  const state = useGameStore(useShallow((store) => ({
    continueSave: store.continueSave,
    restorePoints: store.restorePoints,
    playHistory: store.playHistory,
    openNewGame: store.openNewGame,
    continueGame: store.continueGame,
    openModal: store.openModal,
  })));

  const latestSave = state.continueSave;

  return (
    <div className="menu-screen">
      <div className="menu-backdrop" />

      <section className="menu-hero">
        <div className="menu-kicker">Command Deck</div>
        <div className="menu-wordmark">capi-rogue</div>
        <h1 className="menu-title">시장 정복을 다시 준비할 시간입니다</h1>
        <p className="menu-sub">
          여기서 바로 새 판을 열고, 저장 지점으로 복귀하고, 지난 기록과 환경 설정까지 정리할 수 있습니다.
        </p>
      </section>

      <section className="menu-panel">
        <div className="menu-actions">
          <button type="button" className="menu-action primary" onClick={state.openNewGame}>
            <span className="menu-action-label">새로하기</span>
            <span className="menu-action-meta">새 난이도와 커스텀 설정으로 시작</span>
          </button>

          <button
            type="button"
            className="menu-action"
            onClick={state.continueGame}
            disabled={!latestSave}
          >
            <span className="menu-action-label">계속하기</span>
            <span className="menu-action-meta">
              {latestSave ? `${latestSave.label} · ${formatSavedAt(latestSave.savedAt)}` : '자동 저장이 없으면 비활성화됩니다'}
            </span>
          </button>

          <button
            type="button"
            className="menu-action"
            onClick={() => state.openModal('restore')}
            disabled={(state.restorePoints || []).length === 0}
          >
            <span className="menu-action-label">다시하기</span>
            <span className="menu-action-meta">저장된 시점 하나를 골라 그 지점부터 복귀</span>
          </button>

          <button type="button" className="menu-action" onClick={() => state.openModal('history')}>
            <span className="menu-action-label">플레이 이력</span>
            <span className="menu-action-meta">최근 러닝 결과와 클리어/파산 기록 확인</span>
          </button>

          <button type="button" className="menu-action" onClick={() => state.openModal('settings')}>
            <span className="menu-action-label">설정</span>
            <span className="menu-action-meta">브금 크기와 화면 배율을 실시간 조절</span>
          </button>
        </div>

        <div className="menu-sidecards">
          <div className="menu-sidecard">
            <div className="menu-sidecard-kicker">현재 저장</div>
            <strong>{latestSave ? latestSave.label : '이어할 저장 없음'}</strong>
            <p>{latestSave ? formatSavedAt(latestSave.savedAt) : '새로하기로 새로운 캠페인을 시작할 수 있습니다.'}</p>
          </div>

          <div className="menu-sidecard">
            <div className="menu-sidecard-kicker">기록 현황</div>
            <strong>총 플레이 {meta.plays}회</strong>
            <p>클리어 {meta.clears}회 · 파산 {meta.bankrupts}회 · 저장 시점 {(state.restorePoints || []).length}개</p>
          </div>

          <div className="menu-sidecard">
            <div className="menu-sidecard-kicker">최근 러닝</div>
            <strong>{state.playHistory?.[0]?.outcome || '아직 없음'}</strong>
            <p>
              {state.playHistory?.[0]
                ? `${formatSavedAt(state.playHistory[0].endedAt)} · ${state.playHistory[0].turn}개월`
                : '첫 플레이를 시작하면 이곳에 기록이 쌓입니다.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
