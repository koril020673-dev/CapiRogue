import React from 'react';
import { UI_SETTINGS_DEF } from '../../constants.js';
import { useGameStore } from '../../store/useGameStore.js';

export default function SettingsModal() {
  const closeModal = useGameStore((state) => state.closeModal);
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  return (
    <div className="modal-box settings-modal">
      <div className="modal-header">
        <h3>설정</h3>
        <button className="modal-close" onClick={closeModal}>×</button>
      </div>

      <p className="modal-sub">브금과 글자/UI 크기를 실시간으로 조절합니다.</p>

      <label className="settings-row">
        <span>브금 크기</span>
        <strong>{Math.round((settings?.bgmVolume ?? UI_SETTINGS_DEF.bgmVolume) * 100)}%</strong>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings?.bgmVolume ?? UI_SETTINGS_DEF.bgmVolume}
          onChange={(event) => updateSettings({ bgmVolume: Number(event.target.value) })}
        />
      </label>

      <label className="settings-row">
        <span>글자/UI 크기</span>
        <strong>{(settings?.textScale ?? UI_SETTINGS_DEF.textScale).toFixed(2)}x</strong>
        <input
          type="range"
          min="0.9"
          max="1.15"
          step="0.01"
          value={settings?.textScale ?? UI_SETTINGS_DEF.textScale}
          onChange={(event) => updateSettings({ textScale: Number(event.target.value) })}
        />
      </label>

      <div className="modal-footer-row">
        <button className="btn btn-ghost" onClick={() => updateSettings(UI_SETTINGS_DEF)}>기본값</button>
        <button className="btn btn-primary" onClick={closeModal}>닫기</button>
      </div>
    </div>
  );
}
