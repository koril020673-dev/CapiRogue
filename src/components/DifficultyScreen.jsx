import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import {
  CUSTOM_DIFFICULTY_LIMITS,
  DIFF_CONFIG,
  DIFF_DEMAND_ELASTICITY,
} from '../constants.js';
import { fmtW, loadMeta } from '../utils.js';

const CARDS = [
  { diff: 'easy', icon: '🌱', name: '쉬움', desc: '넉넉한 시작 자금과 완만한 경쟁 구간입니다.', color: '#3FB950' },
  { diff: 'normal', icon: '🛰', name: '중간', desc: '표준 밸런스의 기본 캠페인입니다.', color: '#58A6FF' },
  { diff: 'hard', icon: '⚔', name: '어려움', desc: '시장 압박이 빠르게 강해지는 도전형입니다.', color: '#D29922' },
  { diff: 'insane', icon: '☢', name: '인세인', desc: '높은 금리와 빡빡한 자본으로 버텨야 합니다.', color: '#F85149' },
];

function createPresetSettings(diff, infiniteMode = false) {
  const cfg = DIFF_CONFIG[diff] || DIFF_CONFIG.normal;
  return {
    startCapital: cfg.capital,
    startDebt: cfg.debt,
    interestRate: cfg.interestRate,
    rivalCount: cfg.rivalCount,
    demandElasticity: DIFF_DEMAND_ELASTICITY[diff] ?? 1,
    eventIntensity: 1,
    infiniteMode,
  };
}

function formatMoneyShort(value) {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(value % 100_000_000 === 0 ? 0 : 1)}억`;
  return `${Math.round(value / 10_000_000)}천만`;
}

export default function DifficultyScreen() {
  const startGame = useGameStore((state) => state.startGame);
  const meta = loadMeta();
  const [selectedDiff, setSelectedDiff] = useState('normal');
  const [settings, setSettings] = useState(() => createPresetSettings('normal'));

  const selectedCard = CARDS.find((card) => card.diff === selectedDiff) || CARDS[1];
  const presetSettings = createPresetSettings(selectedDiff, settings.infiniteMode);
  const hasCustomChanges = (
    settings.startCapital !== presetSettings.startCapital
    || settings.startDebt !== presetSettings.startDebt
    || settings.interestRate !== presetSettings.interestRate
    || settings.rivalCount !== presetSettings.rivalCount
    || settings.demandElasticity !== presetSettings.demandElasticity
    || settings.eventIntensity !== presetSettings.eventIntensity
    || settings.infiniteMode
  );

  const selectPreset = (diff) => {
    setSelectedDiff(diff);
    setSettings((prev) => createPresetSettings(diff, prev.infiniteMode));
  };

  const updateSetting = (key) => (event) => {
    const value = event.target.type === 'checkbox'
      ? event.target.checked
      : Number(event.target.value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetPreset = () => {
    setSettings((prev) => createPresetSettings(selectedDiff, prev.infiniteMode));
  };

  const handleStart = () => {
    startGame(selectedDiff, settings);
  };

  return (
    <div className="diff-screen">
      <div className="diff-header">
        <div className="diff-kicker">Corporate Survival Simulation</div>
        <div className="diff-wordmark">capi-rogue</div>
        <div className="diff-title">캐피로그 2.0</div>
        <div className="diff-sub">
          난이도 프리셋을 고른 뒤 시작 자금, 부채, 금리, 경쟁 강도까지 직접 조절해 원하는 러닝을 설계하세요.
        </div>
        {(meta.bankrupts > 0 || meta.clears > 0) && (
          <div className="diff-meta-hint">
            메타 보너스 적용 중 · 자본 +{((meta.capitalBonus || 0) * 100).toFixed(1)}% · 호황 보정 +{((meta.boomBonus || 0) * 100).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="diff-cards">
        {CARDS.map((card) => {
          const cfg = DIFF_CONFIG[card.diff];
          const isSelected = card.diff === selectedDiff;

          return (
            <button
              key={card.diff}
              type="button"
              className={`diff-card${isSelected ? ' selected' : ''}`}
              style={{ '--card-accent': card.color }}
              onClick={() => selectPreset(card.diff)}
            >
              <div className="diff-card-top">
                <div className="diff-icon">{card.icon}</div>
                <div className={`diff-select-badge${isSelected ? ' active' : ''}`}>
                  {isSelected ? '선택됨' : '프리셋'}
                </div>
              </div>
              <div className="diff-name" style={{ color: card.color }}>{card.name}</div>
              <div className="diff-desc">{card.desc}</div>
              <div className="diff-stats">
                <div className="diff-stat">
                  <span>시작 자금</span>
                  <strong style={{ color: card.color }}>{formatMoneyShort(cfg.capital)}</strong>
                </div>
                <div className="diff-stat">
                  <span>시작 부채</span>
                  <strong style={{ color: cfg.debt > 0 ? '#F85149' : 'var(--text)' }}>
                    {cfg.debt > 0 ? formatMoneyShort(cfg.debt) : '없음'}
                  </strong>
                </div>
                <div className="diff-stat">
                  <span>기준 금리</span>
                  <strong>{(cfg.interestRate * 100).toFixed(1)}%</strong>
                </div>
                <div className="diff-stat">
                  <span>경쟁사</span>
                  <strong>{cfg.rivalCount}명</strong>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="diff-custom-panel">
        <div className="diff-custom-head">
          <div>
            <div className="diff-kicker">Run Tuner</div>
            <div className="diff-custom-title">{selectedCard.name} 기반 세부 조정</div>
            <div className="diff-custom-sub">
              프리셋의 흐름은 유지하면서 원하는 압박감으로 세팅할 수 있습니다.
            </div>
          </div>
          <button type="button" className="diff-reset-btn" onClick={resetPreset}>
            프리셋 값으로 되돌리기
          </button>
        </div>

        <div className="diff-tuner-grid">
          <label className="diff-tuner">
            <span className="diff-tuner-label">시작 자금</span>
            <strong>{fmtW(settings.startCapital)}</strong>
            <input
              type="range"
              min={CUSTOM_DIFFICULTY_LIMITS.capital.min}
              max={CUSTOM_DIFFICULTY_LIMITS.capital.max}
              step={CUSTOM_DIFFICULTY_LIMITS.capital.step}
              value={settings.startCapital}
              onChange={updateSetting('startCapital')}
            />
          </label>

          <label className="diff-tuner">
            <span className="diff-tuner-label">시작 부채</span>
            <strong>{settings.startDebt > 0 ? fmtW(settings.startDebt) : '없음'}</strong>
            <input
              type="range"
              min={CUSTOM_DIFFICULTY_LIMITS.debt.min}
              max={CUSTOM_DIFFICULTY_LIMITS.debt.max}
              step={CUSTOM_DIFFICULTY_LIMITS.debt.step}
              value={settings.startDebt}
              onChange={updateSetting('startDebt')}
            />
          </label>

          <label className="diff-tuner">
            <span className="diff-tuner-label">기준 금리</span>
            <strong>{(settings.interestRate * 100).toFixed(1)}%</strong>
            <input
              type="range"
              min={CUSTOM_DIFFICULTY_LIMITS.interestRate.min}
              max={CUSTOM_DIFFICULTY_LIMITS.interestRate.max}
              step={CUSTOM_DIFFICULTY_LIMITS.interestRate.step}
              value={settings.interestRate}
              onChange={updateSetting('interestRate')}
            />
          </label>

          <label className="diff-tuner">
            <span className="diff-tuner-label">경쟁사 수</span>
            <strong>{settings.rivalCount}명</strong>
            <input
              type="range"
              min={CUSTOM_DIFFICULTY_LIMITS.rivalCount.min}
              max={CUSTOM_DIFFICULTY_LIMITS.rivalCount.max}
              step={CUSTOM_DIFFICULTY_LIMITS.rivalCount.step}
              value={settings.rivalCount}
              onChange={updateSetting('rivalCount')}
            />
          </label>

          <label className="diff-tuner">
            <span className="diff-tuner-label">가격 민감도</span>
            <strong>x{settings.demandElasticity.toFixed(2)}</strong>
            <input
              type="range"
              min={CUSTOM_DIFFICULTY_LIMITS.demandElasticity.min}
              max={CUSTOM_DIFFICULTY_LIMITS.demandElasticity.max}
              step={CUSTOM_DIFFICULTY_LIMITS.demandElasticity.step}
              value={settings.demandElasticity}
              onChange={updateSetting('demandElasticity')}
            />
          </label>

          <label className="diff-tuner">
            <span className="diff-tuner-label">이벤트 강도</span>
            <strong>x{settings.eventIntensity.toFixed(2)}</strong>
            <input
              type="range"
              min={CUSTOM_DIFFICULTY_LIMITS.eventIntensity.min}
              max={CUSTOM_DIFFICULTY_LIMITS.eventIntensity.max}
              step={CUSTOM_DIFFICULTY_LIMITS.eventIntensity.step}
              value={settings.eventIntensity}
              onChange={updateSetting('eventIntensity')}
            />
          </label>
        </div>

        <label className={`diff-infinite-toggle${settings.infiniteMode ? ' active' : ''}`}>
          <input
            type="checkbox"
            checked={settings.infiniteMode}
            onChange={updateSetting('infiniteMode')}
          />
          <div>
            <strong>무한모드 도전</strong>
            <p>
              120개월 이후에도 시즌이 반복됩니다. 경쟁사와 시장 압박이 강해지고, 우리 본사도 그에 맞는 성장 보너스를 받습니다.
            </p>
          </div>
        </label>

        <div className="diff-custom-summary">
          <span className="diff-summary-pill">{selectedCard.name} 프리셋 기반</span>
          <span className="diff-summary-pill">자금 {formatMoneyShort(settings.startCapital)}</span>
          <span className="diff-summary-pill">금리 {(settings.interestRate * 100).toFixed(1)}%</span>
          <span className="diff-summary-pill">경쟁사 {settings.rivalCount}명</span>
          <span className="diff-summary-pill">이벤트 x{settings.eventIntensity.toFixed(2)}</span>
          {settings.infiniteMode && <span className="diff-summary-pill hot">무한모드</span>}
          {hasCustomChanges && <span className="diff-summary-pill accent">커스텀 적용</span>}
        </div>

        <div className="diff-custom-actions">
          <div className="diff-custom-note">
            경쟁사 4명 설정 시 4번째 경쟁사는 고티어 시장 해금 이후 합류합니다.
          </div>
          <button type="button" className="btn btn-primary diff-start-btn" onClick={handleStart}>
            {hasCustomChanges ? '설정 적용 후 시작' : '기본 프리셋으로 시작'}
          </button>
        </div>
      </section>

      {meta.plays > 0 && (
        <div className="diff-footer">
          총 플레이 {meta.plays}회 · 파산 {meta.bankrupts}회 · 클리어 {meta.clears}회
        </div>
      )}
    </div>
  );
}
