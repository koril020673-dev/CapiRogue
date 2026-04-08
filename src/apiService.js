import { DEEPSEEK_CONFIG } from './config.js';
import { guessCategoryFromName, generateFallbackVendors } from './utils.js';

function normalizeItemCategory(value) {
  return ['essential', 'normal', 'luxury'].includes(value) ? value : 'normal';
}

function extractJson(text) {
  const cleaned = (text || '').replace(/```json|```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) return cleaned.slice(first, last + 1);
  return cleaned;
}

function sanitizeVendors(vendors = []) {
  return vendors
    .map((vendor, index) => {
      const name = String(vendor?.name || '').trim();
      const type = String(vendor?.type || '').trim() || '균형형';
      const unitCost = Math.max(1000, Math.round(Number(vendor?.unitCost) || 0));
      const qualityScore = Math.max(40, Math.min(220, Math.round(Number(vendor?.qualityScore) || 0)));
      const description = String(vendor?.description || '').trim();

      if (!name || !unitCost || !qualityScore) return null;

      return {
        name,
        type,
        unitCost,
        qualityScore,
        description: description || `${index + 1}순위 공급 후보`,
      };
    })
    .filter(Boolean)
    .filter((vendor, index, list) => (
      list.findIndex(item => item.name === vendor.name) === index
    ));
}

export async function fetchWholesaleData(itemName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_CONFIG.timeoutMs || 7000);

  let res;
  try {
    res = await fetch(DEEPSEEK_CONFIG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.model,
        itemName,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);

  const data = await res.json();
  const parsed = data?.vendors
    ? data
    : JSON.parse(extractJson(data?.choices?.[0]?.message?.content || ''));
  if (parsed?.rejected) {
    return {
      rejected: true,
      reason: String(parsed.reason || '').trim() || '상위 산업 티어가 필요합니다.',
      itemCategory: normalizeItemCategory(parsed?.itemCategory),
      itemTier: Math.max(1, Math.min(4, Number(parsed?.itemTier) || 1)),
      vendors: [],
    };
  }
  const vendors = sanitizeVendors(parsed?.vendors);
  if (vendors.length < 3) throw new Error('데이터 불완전');

  return {
    itemCategory: normalizeItemCategory(parsed?.itemCategory),
    itemTier: Math.max(1, Math.min(4, Number(parsed?.itemTier) || 1)),
    vendors,
  };
}

export function getOfflineVendors(itemName) {
  return {
    itemCategory: guessCategoryFromName(itemName),
    vendors: generateFallbackVendors(itemName),
  };
}
