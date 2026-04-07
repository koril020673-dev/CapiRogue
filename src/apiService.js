import { DEEPSEEK_CONFIG } from './config.js';
import { guessCategoryFromName, generateFallbackVendors } from './utils.js';

export async function fetchWholesaleData(itemName) {
  const prompt = `유저가 '${itemName}'을(를) 검색했어. 이 아이템의 경제적 속성을 파악해 'essential', 'normal', 'luxury' 중 하나의 카테고리(itemCategory)를 정하고, 플레이어가 직접 판단할 수 있도록 성격이 다른 도매업체 후보 4곳을 제안해.

중요: 저가형/표준형/고급형으로 강제 분류하지 말고, 각 업체는 자신만의 전략 성격(type)을 자유롭게 작성해.

반드시 아래 JSON 형식만 출력해 (마크다운 코드블록 없이):
{
  "itemCategory": "normal",
  "vendors": [
    {"name":"상호명","type":"예: 대량공급형","unitCost":15000,"qualityScore":70, "description":"장점/위험 한 줄"},
    {"name":"상호명","type":"예: 균형형",    "unitCost":35000,"qualityScore":120,"description":"장점/위험 한 줄"},
    {"name":"상호명","type":"예: 프리미엄형", "unitCost":80000,"qualityScore":170,"description":"장점/위험 한 줄"},
    {"name":"상호명","type":"예: 변동형",    "unitCost":42000,"qualityScore":95, "description":"장점/위험 한 줄"}
  ]
}`;

  const res = await fetch(DEEPSEEK_CONFIG.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEEPSEEK_CONFIG.model,
      prompt,
    }),
  });

  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);

  const data = await res.json();
  let raw = data?.choices?.[0]?.message?.content || '';
  raw = raw.replace(/```json|```/g, '').trim();

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
