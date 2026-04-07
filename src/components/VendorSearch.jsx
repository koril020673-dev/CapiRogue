import React, { useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { fmtW } from '../utils.js';

const TYPE_LABEL = { cheap: '저가형', standard: '표준형', premium: '고급형' };
const TYPE_COLOR = { cheap: 'var(--green)', standard: 'var(--blue)', premium: 'var(--yellow)' };

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
  const currentTab       = useGameStore(s => s.currentVendorTab);
  const aiLoading        = useGameStore(s => s.aiLoading);
  const aiLoadingText    = useGameStore(s => s.aiLoadingText);
  const searchStatus     = useGameStore(s => s.searchStatus);
  const factory          = useGameStore(s => s.factory);
  const searchItem       = useGameStore(s => s.searchItem);
  const selectVendor     = useGameStore(s => s.selectVendor);
  const setVendorTab     = useGameStore(s => s.setVendorTab);

  const factoryActive   = factory.built && factory.buildTurnsLeft <= 0;
  const tabVendors      = { cheap: 0, standard: 1, premium: 2 };
  const currentVendor   = wholesaleOptions[tabVendors[currentTab]];

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
        <>
          <div className="vendor-tabs">
            {['cheap','standard','premium'].map(t => (
              <button
                key={t}
                className={`vendor-tab${currentTab === t ? ' active-' + t : ''}`}
                onClick={() => setVendorTab(t)}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {currentVendor && (
            <VendorCard
              vendor={currentVendor}
              isSelected={selectedVendor?.name === currentVendor.name}
              onSelect={() => selectVendor(currentVendor)}
              factoryActive={factoryActive}
              upgradeLevel={factory.upgradeLevel || 0}
            />
          )}
        </>
      )}

      {selectedVendor && wholesaleOptions.length > 0 && (
        <div className="contract-box">
          <div className="contract-name">{selectedVendor.name}</div>
          <div className="contract-sub">
            <span style={{ color: TYPE_COLOR[selectedVendor.type] || 'var(--dim)' }}>{TYPE_LABEL[selectedVendor.type]}</span>
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
