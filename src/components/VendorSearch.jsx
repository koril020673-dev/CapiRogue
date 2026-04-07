import React, { useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { fmtW } from '../utils.js';

function VendorCard({ vendor, isSelected, onSelect, factoryActive, upgradeLevel }) {
  const effectiveCost = factoryActive ? Math.round(vendor.unitCost * 0.6) : vendor.unitCost;
  const effectiveQuality = vendor.qualityScore + (factoryActive ? upgradeLevel * 20 : 0);

  return (
    <div className="vc-card">
      <div className="vc-name">{vendor.name}</div>
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
      <div className="vc-row">
        <span className="vc-lbl" style={{ color: 'var(--dim)', fontSize: '10px' }}>{vendor.description}</span>
      </div>
      <button
        className={`vc-select-btn${isSelected ? ' selected' : ''}`}
        onClick={onSelect}
      >
        {isSelected ? '✓ 현재 계약 중' : '이 업체와 계약하기'}
      </button>
    </div>
  );
}

export default function VendorSearch() {
  const [itemName, setItemName] = useState('');
  const inputRef = useRef(null);

  const wholesaleOptions = useGameStore(s => s.wholesaleOptions);
  const selectedVendor   = useGameStore(s => s.selectedVendor);
  const aiLoading        = useGameStore(s => s.aiLoading);
  const aiLoadingText    = useGameStore(s => s.aiLoadingText);
  const searchStatus     = useGameStore(s => s.searchStatus);
  const factory          = useGameStore(s => s.factory);
  const searchItem       = useGameStore(s => s.searchItem);
  const selectVendor     = useGameStore(s => s.selectVendor);

  const factoryActive   = factory.built && factory.buildTurnsLeft <= 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = itemName.trim();
    if (!name) return;
    searchItem(name);
  };

  return (
    <div className="vendor-search">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="판매 아이템명 입력 (예: 무선 이어폰)"
          value={itemName}
          onChange={e => setItemName(e.target.value)}
          disabled={aiLoading}
        />
        <button type="submit" className="search-btn" disabled={aiLoading || !itemName.trim()}>
          {aiLoading ? '…' : '탐색'}
        </button>
      </form>

      {aiLoading && <div className="ai-loading-bar">{aiLoadingText}</div>}
      {searchStatus && !aiLoading && <div className="search-status">{searchStatus}</div>}

      {wholesaleOptions.length > 0 && (
          <div className="vendor-list">
            {wholesaleOptions.map((vendor, idx) => (
            <VendorCard
              key={`${vendor.name}-${idx}`}
              vendor={vendor}
              isSelected={selectedVendor?.name === vendor.name}
              onSelect={() => selectVendor(vendor)}
              factoryActive={factoryActive}
              upgradeLevel={factory.upgradeLevel || 0}
            />
            ))}
          </div>
      )}

      {selectedVendor && wholesaleOptions.length > 0 && (
        <div className="contract-box">
          <div className="contract-name">{selectedVendor.name}</div>
          <div className="contract-sub">
            {selectedVendor.type ? <span>{selectedVendor.type}</span> : <span>선택형</span>}
            &nbsp;·&nbsp;단가 {fmtW(selectedVendor.unitCost)}&nbsp;·&nbsp;품질 {selectedVendor.qualityScore}pt
          </div>
          {selectedVendor.description && (
            <div className="contract-desc">"{selectedVendor.description}"</div>
          )}
        </div>
      )}
    </div>
  );
}
