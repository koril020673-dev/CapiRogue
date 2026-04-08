import { DEEPSEEK_CONFIG } from './config.js';
import { guessCategoryFromName, generateFallbackVendors } from './utils.js';

function extractJson(text) {
  const cleaned = (text || '').replace(/```json|```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) return cleaned.slice(first, last + 1);
  return cleaned;
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
  const raw = extractJson(data?.choices?.[0]?.message?.content || '');

  const parsed = JSON.parse(raw);
  if (!parsed.vendors || parsed.vendors.length < 3) throw new Error('데이터 불완전');

  return {
    itemCategory: parsed.itemCategory || 'normal',
    vendors: parsed.vendors.map(v => ({
      name: v.name,
      type: v.type,
      unitCost: Math.round(v.unitCost),
      qualityScore: Math.round(v.qualityScore),
      description: v.description || '',
    })),
  };
}

export function getOfflineVendors(itemName) {
  return {
    itemCategory: guessCategoryFromName(itemName),
    vendors: generateFallbackVendors(itemName),
  };
}
