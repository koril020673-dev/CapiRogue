import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { fmtW } from '../utils.js';

function estimateOemMetrics(vendor) {
  const quality = vendor.qualityScore || 80;
  const type = (vendor.type || '').toLowerCase();
  const defectRate = Math.max(1.0, 14 - (quality / 10));
  const leadStability = type.includes('고품질')
    ? 92
    : type.includes('변동')
      ? 66
      : type.includes('실속')
        ? 74
        : 82;
  const utility = Math.round((quality * 0.6) + (leadStability * 0.4) - (vendor.unitCost / 3000));
  return { defectRate, leadStability, utility };
}

function getVendorTone(type = '') {
  const normalized = type.toLowerCase();
  if (normalized.includes('고품질')) return 'premium';
  if (normalized.includes('변동')) return 'volatile';
  if (normalized.includes('실속')) return 'value';
  return 'balanced';
}

function VendorCard({ vendor, isSelected, onSelect, factoryActive, upgradeLevel }) {
  const effectiveCost = factoryActive ? Math.round(vendor.unitCost * 0.6) : vendor.unitCost;
  const effectiveQuality = vendor.qualityScore + (factoryActive ? upgradeLevel * 20 : 0);
  const m = estimateOemMetrics(vendor);
  const tone = getVendorTone(vendor.type);

  return (
    <div className={`vc-card${isSelected ? ' selected' : ''}`}>
      <div className="vc-top">
        <div className="vc-name">{vendor.name}</div>
        <span className={`vc-type vc-type-${tone}`}>{vendor.type || '균형형'}</span>
      </div>
      <div className="vc-row">
        <span className="vc-lbl">도매 단가</span>
        <span className="vc-val">{fmtW(vendor.unitCost)}</span>
      </div>
      {factoryActive && (
        <div className="vc-row">
          <span className="vc-lbl">실입고가 (공장)</span>
          <span className="vc-val" style={{ color: 'var(--green)' }}>{fmtW(effectiveCost)}</span>
        </div>
      )}
      <div className="vc-row">
        <span className="vc-lbl">품질 점수</span>
        <span className="vc-val">{effectiveQuality}pt</span>
      </div>
      <div className="vc-metrics">
        <div className="vc-metric"><span>예상 불량률</span><strong>{m.defectRate.toFixed(1)}%</strong></div>
        <div className="vc-metric"><span>납기 안정성</span><strong>{m.leadStability}%</strong></div>
        <div className="vc-metric"><span>편익/비용 점수</span><strong>{m.utility}점</strong></div>
      </div>
      <div className="vc-row">
        <span className="vc-lbl" style={{ color: 'var(--dim)', fontSize: '10px' }}>{vendor.description}</span>
      </div>
      <button
        className={`vc-select-btn${isSelected ? ' selected' : ''}`}
        onClick={onSelect}
      >
        {isSelected ? '현재 계약 중' : '이 업체와 계약하기'}
      </button>
    </div>
  );
}

export default function VendorSearch() {
  const [itemName, setItemName] = useState('');

  const s = useGameStore(useShallow(state => ({
    wholesaleOptions: state.wholesaleOptions,
    selectedVendor: state.selectedVendor,
    aiLoading: state.aiLoading,
    aiLoadingText: state.aiLoadingText,
    searchStatus: state.searchStatus,
    factory: state.factory,
    searchItem: state.searchItem,
    selectVendor: state.selectVendor,
  })));

  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = itemName.trim();
    if (!name) return;
    s.searchItem(name);
  };

  return (
    <div className="vendor-search">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          placeholder="판매 아이템명 입력 (예: 무선 이어폰)"
          value={itemName}
          onChange={e => setItemName(e.target.value)}
          disabled={s.aiLoading}
        />
        <button type="submit" className="search-btn" disabled={s.aiLoading || !itemName.trim()}>
          {s.aiLoading ? '…' : '탐색'}
        </button>
      </form>

      {s.aiLoading && <div className="ai-loading-bar">{s.aiLoadingText}</div>}
      {s.searchStatus && !s.aiLoading && <div className="search-status">{s.searchStatus}</div>}

      {s.wholesaleOptions.length > 0 && (
          <div className="vendor-list">
            {s.wholesaleOptions.map((vendor, idx) => (
            <VendorCard
              key={`${vendor.name}-${idx}`}
              vendor={vendor}
              isSelected={s.selectedVendor?.name === vendor.name}
              onSelect={() => s.selectVendor(vendor)}
              factoryActive={factoryActive}
              upgradeLevel={s.factory.upgradeLevel || 0}
            />
            ))}
          </div>
      )}

      {s.selectedVendor && s.wholesaleOptions.length > 0 && (
        <div className="contract-box">
          <div className="contract-name">{s.selectedVendor.name}</div>
          <div className="contract-sub">
            {s.selectedVendor.type ? <span>{s.selectedVendor.type}</span> : <span>선택형</span>}
            &nbsp;·&nbsp;단가 {fmtW(s.selectedVendor.unitCost)}&nbsp;·&nbsp;품질 {s.selectedVendor.qualityScore}pt
          </div>
          {s.selectedVendor.description && (
            <div className="contract-desc">"{s.selectedVendor.description}"</div>
          )}
        </div>
      )}
    </div>
  );
}
