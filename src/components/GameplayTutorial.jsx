import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FIRST_PLAY_KEY } from '../constants.js';
import { useGameStore } from '../store/useGameStore.js';

const BASE_TUTORIAL_STEPS = [
  {
    id: 'timeline',
    selector: '[data-tutorial="timeline"]',
    title: '턴 흐름과 캠페인 진행도',
    description: '상단 바는 현재 턴 위치와 주요 위험 구간을 보여줍니다. 37개월, 80개월, 111개월 부근에서 게임의 압박이 바뀌기 시작합니다.',
  },
  {
    id: 'hq',
    selector: '[data-tutorial="hq-panel"]',
    title: '본사 상태판',
    description: '왼쪽 패널에서는 현금, 부채, 순자산, 신용등급을 빠르게 확인합니다. 운영이 흔들릴 때는 여기 숫자가 가장 먼저 무너집니다.',
  },
  {
    id: 'focus',
    selector: '[data-tutorial="situation-strip"]',
    title: '이번 턴에 집중할 것',
    description: '중앙 상단 요약 카드가 지금 무엇을 먼저 결정해야 하는지 알려줍니다. 처음에는 이 줄만 봐도 다음 행동을 놓치지 않을 수 있습니다.',
  },
  {
    id: 'phase1',
    selector: '[data-tutorial="phase-setup"]',
    title: 'Phase 01: 상품과 공급처 고르기',
    description: '여기서 이번 달에 팔 라인과 OEM 공급처를 고릅니다. 공장을 지은 뒤에는 업그레이드 전까지 라인이 고정됩니다.',
  },
  {
    id: 'phase2',
    selector: '[data-tutorial="phase-pricing"]',
    title: 'Phase 02: 가격과 발주 설정',
    description: '실원가, 개당 마진, 예상 수요를 보고 발주량과 판매가를 맞춥니다. 버튼에 마우스를 올리면 각 선택지의 장단점과 예시가 보입니다.',
  },
  {
    id: 'execute',
    selector: '[data-tutorial="execute-phase"]',
    title: '실행 전 마지막 확인',
    description: '입력을 마치면 여기서 턴을 실행합니다. 실행 직전에는 결재안 1장이 뜨고, 그 선택 결과까지 반영한 뒤 월간 정산이 진행됩니다.',
  },
  {
    id: 'intel',
    selector: '[data-tutorial="intel-panel"]',
    title: '시장 인텔과 라이벌 브리핑',
    description: '오른쪽 패널에서는 현재 점유율, 라이벌 성향, 최근 정책/뉴스를 확인합니다. 중반 이후에는 이 패널을 자주 보는 습관이 중요합니다.',
  },
];

function isVisibleElement(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export default function GameplayTutorial() {
  const tutorialOpen = useGameStore((state) => state.tutorialOpen);
  const tutorialStep = useGameStore((state) => state.tutorialStep);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const activeModal = useGameStore((state) => state.activeModal);
  const openTutorial = useGameStore((state) => state.openTutorial);
  const closeTutorial = useGameStore((state) => state.closeTutorial);
  const setTutorialStep = useGameStore((state) => state.setTutorialStep);
  const [steps, setSteps] = useState(BASE_TUTORIAL_STEPS);
  const [focusRect, setFocusRect] = useState(null);
  const [cardStyle, setCardStyle] = useState({ top: 24, left: 24, width: 340 });
  const cardRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (gamePhase !== 'playing' || activeModal || tutorialOpen) return;
    if (window.localStorage.getItem(FIRST_PLAY_KEY) === 'done') return;
    openTutorial();
  }, [activeModal, gamePhase, openTutorial, tutorialOpen]);

  useEffect(() => {
    if (!tutorialOpen || typeof window === 'undefined') return;

    const availableSteps = BASE_TUTORIAL_STEPS.filter((step) => {
      const target = document.querySelector(step.selector);
      return isVisibleElement(target);
    });
    const nextSteps = availableSteps.length > 0 ? availableSteps : BASE_TUTORIAL_STEPS;
    setSteps(nextSteps);
    if (tutorialStep >= nextSteps.length) {
      setTutorialStep(nextSteps.length - 1);
    }
  }, [tutorialOpen, tutorialStep, setTutorialStep]);

  const currentStepIndex = Math.min(tutorialStep, Math.max(steps.length - 1, 0));
  const currentStep = useMemo(() => steps[currentStepIndex] || null, [currentStepIndex, steps]);

  useEffect(() => {
    if (!tutorialOpen || !currentStep || typeof window === 'undefined') return;

    const target = document.querySelector(currentStep.selector);
    if (isVisibleElement(target)) {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
  }, [currentStep, tutorialOpen]);

  useEffect(() => {
    if (!tutorialOpen || !currentStep || typeof window === 'undefined') return;

    const updateLayout = () => {
      const cardWidth = Math.min(360, window.innerWidth - 32);
      const cardHeight = cardRef.current?.offsetHeight || 240;
      const target = document.querySelector(currentStep.selector);

      if (!isVisibleElement(target)) {
        setFocusRect(null);
        setCardStyle({
          width: cardWidth,
          left: Math.max(16, (window.innerWidth - cardWidth) / 2),
          top: Math.max(16, (window.innerHeight - cardHeight) / 2),
        });
        return;
      }

      const rect = target.getBoundingClientRect();
      const padded = {
        top: Math.max(8, rect.top - 10),
        left: Math.max(8, rect.left - 10),
        width: Math.min(window.innerWidth - 16, rect.width + 20),
        height: Math.min(window.innerHeight - 16, rect.height + 20),
      };
      padded.width = Math.max(120, padded.width);
      padded.height = Math.max(52, padded.height);
      padded.left = Math.min(padded.left, window.innerWidth - padded.width - 8);
      padded.top = Math.min(padded.top, window.innerHeight - padded.height - 8);

      const spaceBelow = window.innerHeight - (padded.top + padded.height);
      const proposedTop = spaceBelow > cardHeight + 24
        ? padded.top + padded.height + 16
        : padded.top - cardHeight - 16;
      const leftEdge = padded.left + (padded.width / 2) - (cardWidth / 2);

      setFocusRect(padded);
      setCardStyle({
        width: cardWidth,
        left: Math.max(16, Math.min(leftEdge, window.innerWidth - cardWidth - 16)),
        top: Math.max(16, Math.min(proposedTop, window.innerHeight - cardHeight - 16)),
      });
    };

    const rafId = window.requestAnimationFrame(updateLayout);
    const handleChange = () => window.requestAnimationFrame(updateLayout);

    window.addEventListener('resize', handleChange);
    window.addEventListener('scroll', handleChange, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('scroll', handleChange, true);
    };
  }, [currentStep, tutorialOpen]);

  useEffect(() => {
    if (!tutorialOpen) return undefined;

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        closeTutorial(true);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        if (currentStepIndex >= steps.length - 1) closeTutorial(true);
        else setTutorialStep(currentStepIndex + 1);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setTutorialStep(Math.max(0, currentStepIndex - 1));
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [closeTutorial, currentStepIndex, setTutorialStep, steps.length, tutorialOpen]);

  if (!tutorialOpen || activeModal || gamePhase !== 'playing' || !currentStep) return null;

  return (
    <div className="tutorial-overlay" aria-live="polite">
      {focusRect ? (
        <div
          className="tutorial-focus"
          style={{
            top: focusRect.top,
            left: focusRect.left,
            width: focusRect.width,
            height: focusRect.height,
          }}
        />
      ) : (
        <div className="tutorial-backdrop" />
      )}

      <section
        ref={cardRef}
        className="tutorial-card"
        style={cardStyle}
      >
        <div className="tutorial-card-head">
          <span className="tutorial-step-pill">
            튜토리얼 {currentStepIndex + 1} / {steps.length}
          </span>
          <button
            type="button"
            className="tutorial-close"
            onClick={() => closeTutorial(true)}
            aria-label="튜토리얼 닫기"
          >
            ×
          </button>
        </div>

        <h3>{currentStep.title}</h3>
        <p>{currentStep.description}</p>
        <div className="tutorial-tip">
          하이라이트된 영역을 읽어보면서 한 바퀴만 훑으면, 첫 플레이에서 어디를 먼저 봐야 하는지 감이 잡힙니다.
        </div>

        <div className="tutorial-actions">
          <button type="button" className="btn btn-ghost" onClick={() => closeTutorial(true)}>
            건너뛰기
          </button>
          <div className="tutorial-actions-right">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={currentStepIndex === 0}
              onClick={() => setTutorialStep(Math.max(0, currentStepIndex - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (currentStepIndex >= steps.length - 1) closeTutorial(true);
                else setTutorialStep(currentStepIndex + 1);
              }}
            >
              {currentStepIndex >= steps.length - 1 ? '시작하기' : '다음'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
