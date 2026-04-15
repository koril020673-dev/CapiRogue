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

function VendorCard({ vendor, isSelected, onSelect, disabled, factoryMode }) {
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
        disabled={disabled}
        title={factoryMode ? '생산 라인 확정' : 'OEM 계약'}
        description={factoryMode
          ? '업그레이드 후 새로 운용할 생산 라인을 확정하는 버튼입니다.'
          : '이번 달 생산 기준이 될 공급처를 확정하는 버튼입니다. 이후 발주 수량과 판매가 계산이 이 업체 기준으로 바뀝니다.'}
        pros={factoryMode
          ? '공장 업그레이드 이후 다음 생산 라인을 정하고 다시 출고를 준비할 수 있습니다.'
          : '단가와 품질 기준이 확정돼 손익 계산과 발주 판단이 쉬워집니다.'}
        cons={factoryMode
          ? '라인을 바꾸면 판매가와 발주 계획을 새로 잡아야 합니다.'
          : '다른 업체로 바꾸면 발주 수량을 다시 정해야 합니다.'}
        state={
          disabled
            ? '현재 생산 라인이 잠겨 있습니다. 공장 업그레이드 후 다시 열 수 있습니다.'
            : isSelected
              ? '이미 현재 라인으로 확정된 상태입니다.'
              : factoryMode
                ? '지금 누르면 이 상품이 공장의 새 생산 라인으로 고정됩니다.'
                : '지금 누르면 이 업체를 이번 달 OEM 공급처로 확정합니다.'
        }
      >
        <button
          type="button"
          className={`vc-select-btn${isSelected ? ' selected' : ''}`}
          onClick={onSelect}
          disabled={disabled}
        >
          {isSelected ? '현재 라인 사용 중' : factoryMode ? '이 라인으로 생산' : 'OEM 계약 체결'}
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
    factory: state.factory,
    aiLoading: state.aiLoading,
    aiLoadingText: state.aiLoadingText,
    searchStatus: state.searchStatus,
    searchItem: state.searchItem,
    selectVendor: state.selectVendor,
  })));

  const currentTier = getTierMeta(s.industryTier);
  const marketTier = getTierMeta(s.itemTier || s.industryTier);
  const factoryActive = s.factory?.built && s.factory?.buildTurnsLeft <= 0;
  const searchLocked = factoryActive && !s.factory?.productSelectionOpen;
  const searchModeLabel = factoryActive ? '생산 라인 탐색' : '상품 탐색';

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = itemName.trim();
    if (!next || searchLocked) return;
    s.searchItem(next);
  };

  return (
    <div className="vendor-search">
      <div className="vendor-intel-row">
        <div className="vendor-intel-card">
          <span>{factoryActive ? '라인 변경 가능 티어' : '탐색 가능 티어'}</span>
          <strong>{currentTier?.code || 'T1'}</strong>
        </div>
        <div className="vendor-intel-card">
          <span>{factoryActive ? '현재 생산 라인 티어' : '현재 시장 티어'}</span>
          <strong>{marketTier?.code || 'T1'}</strong>
        </div>
      </div>

      {searchLocked && (
        <div className="vendor-lock-note">
          공장 가동 중에는 생산 라인이 고정됩니다. 공장 업그레이드를 실행하면 새 라인 탐색이 다시 열립니다.
        </div>
      )}

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          placeholder={factoryActive ? '업그레이드 후 새로 생산할 상품명을 입력하세요' : '탐색할 상품명을 입력하세요'}
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          disabled={s.aiLoading || searchLocked}
        />
        <button type="submit" className="search-btn" disabled={s.aiLoading || !itemName.trim() || searchLocked}>
          {s.aiLoading ? '분석 중' : searchModeLabel}
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
              disabled={searchLocked}
              factoryMode={factoryActive}
              onSelect={() => s.selectVendor(vendor)}
            />
          ))}
        </div>
      )}

      {s.selectedVendor && (
        <div className="contract-box">
          <div className="contract-name">{s.selectedVendor.name}</div>
          <div className="contract-sub">
            {factoryActive ? '현재 생산 라인' : (s.selectedVendor.type || '표준형')} · 단가 {fmtW(s.selectedVendor.unitCost)} · 품질 {s.selectedVendor.qualityScore}pt
          </div>
          {s.selectedVendor.description && (
            <div className="contract-desc">{s.selectedVendor.description}</div>
          )}
        </div>
      )}
    </div>
  );
}
