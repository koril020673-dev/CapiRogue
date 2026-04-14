import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore.js';
import { getTierMeta } from '../designData.js';
import { fmtW } from '../utils.js';
import HoverHint from './HoverHint.jsx';

function estimateVendorMetrics(vendor) {
  const quality = vendor.qualityScore || 80;
  const type = String(vendor.type || '').toLowerCase();
  const defectRate = Math.max(1, 14 - (quality / 10));
  const leadStability = type.includes('고급')
    ? 92
    : type.includes('변동')
      ? 66
      : type.includes('저가')
        ? 74
        : 82;
  const utility = Math.round((quality * 0.6) + (leadStability * 0.4) - (vendor.unitCost / 3000));
  return { defectRate, leadStability, utility };
}

function getVendorTypeClass(type = '') {
  if (type.includes('고급')) return 'vc-type-premium';
  if (type.includes('변동')) return 'vc-type-volatile';
  if (type.includes('저가')) return 'vc-type-value';
  return 'vc-type-balanced';
}

function VendorCard({ vendor, isSelected, onSelect }) {
  const metrics = estimateVendorMetrics(vendor);

  return (
    <div className={`vc-card${isSelected ? ' selected' : ''}`}>
      <div className="vc-top">
        <div className="vc-name">{vendor.name}</div>
        <span className={`vc-type ${getVendorTypeClass(vendor.type || '')}`}>{vendor.type || '표준형'}</span>
      </div>
      <div className="vc-row">
        <span className="vc-lbl">단가</span>
        <span className="vc-val">{fmtW(vendor.unitCost)}</span>
      </div>
      <div className="vc-row">
        <span className="vc-lbl">기본 품질</span>
        <span className="vc-val">{vendor.qualityScore}pt</span>
      </div>
      <div className="vc-metrics">
        <div className="vc-metric">
          <span>예상 불량</span>
          <strong>{metrics.defectRate.toFixed(1)}%</strong>
        </div>
        <div className="vc-metric">
          <span>납기 안정성</span>
          <strong>{metrics.leadStability}%</strong>
        </div>
        <div className="vc-metric">
          <span>종합 점수</span>
          <strong>{metrics.utility}점</strong>
        </div>
      </div>
      <div className="vc-row">
        <span className="vc-lbl vc-desc">{vendor.description}</span>
      </div>
      <HoverHint
        fill
        title="OEM 계약"
        description="이번 달 생산 기준이 될 공급처를 확정하는 버튼입니다. 이후 발주 수량과 판매가 계산이 이 업체 기준으로 바뀝니다."
        pros="단가와 품질 기준이 확정돼 손익 계산과 발주 판단이 쉬워집니다."
        cons="다른 업체로 바꾸면 발주 수량을 다시 정해야 합니다."
        state={isSelected ? '이미 이번 달 기준 계약으로 선택된 업체입니다.' : '지금 누르면 이 업체를 이번 달 OEM 공급처로 확정합니다.'}
      >
        <button type="button" className={`vc-select-btn${isSelected ? ' selected' : ''}`} onClick={onSelect}>
          {isSelected ? '현재 OEM 계약 중' : 'OEM 계약 체결'}
        </button>
      </HoverHint>
    </div>
  );
}

export default function VendorSearch() {
  const [itemName, setItemName] = useState('');
  const s = useGameStore(useShallow((state) => ({
    industryTier: state.industryTier,
    itemTier: state.itemTier,
    wholesaleOptions: state.wholesaleOptions,
    selectedVendor: state.selectedVendor,
    aiLoading: state.aiLoading,
    aiLoadingText: state.aiLoadingText,
    searchStatus: state.searchStatus,
    searchItem: state.searchItem,
    selectVendor: state.selectVendor,
  })));

  const currentTier = getTierMeta(s.industryTier);
  const marketTier = getTierMeta(s.itemTier || s.industryTier);

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = itemName.trim();
    if (!next) return;
    s.searchItem(next);
  };

  return (
    <div className="vendor-search">
      <div className="vendor-intel-row">
        <div className="vendor-intel-card">
          <span>탐색 가능 티어</span>
          <strong>{currentTier?.code || 'T1'}</strong>
        </div>
        <div className="vendor-intel-card">
          <span>현재 시장 티어</span>
          <strong>{marketTier?.code || 'T1'}</strong>
        </div>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          placeholder="탐색할 상품명을 입력하세요"
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          disabled={s.aiLoading}
        />
        <button type="submit" className="search-btn" disabled={s.aiLoading || !itemName.trim()}>
          {s.aiLoading ? '분석 중' : '탐색'}
        </button>
      </form>

      {s.aiLoading && <div className="ai-loading-bar">{s.aiLoadingText}</div>}
      {s.searchStatus && !s.aiLoading && <div className="search-status">{s.searchStatus}</div>}

      {s.wholesaleOptions.length > 0 && (
        <div className="vendor-list">
          {s.wholesaleOptions.map((vendor, index) => (
            <VendorCard
              key={`${vendor.name}-${index}`}
              vendor={vendor}
              isSelected={s.selectedVendor?.name === vendor.name}
              onSelect={() => s.selectVendor(vendor)}
            />
          ))}
        </div>
      )}

      {s.selectedVendor && (
        <div className="contract-box">
          <div className="contract-name">{s.selectedVendor.name}</div>
          <div className="contract-sub">
            {s.selectedVendor.type || '표준형'} · 단가 {fmtW(s.selectedVendor.unitCost)} · 품질 {s.selectedVendor.qualityScore}pt
          </div>
          {s.selectedVendor.description && (
            <div className="contract-desc">{s.selectedVendor.description}</div>
          )}
        </div>
      )}
    </div>
  );
}
