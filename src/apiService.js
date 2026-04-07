import { DEEPSEEK_CONFIG } from './config.js';
import { guessCategoryFromName, generateFallbackVendors } from './utils.js';

export async function fetchWholesaleData(itemName) {
  const prompt = `유저가 '${itemName}'을(를) 검색했어. 이 아이템의 경제적 속성을 파악해 'essential', 'normal', 'luxury' 중 하나의 카테고리(itemCategory)를 정하고, 저가형, 표준형, 고급형 도매업체 3곳의 데이터를 JSON 배열 형태로만 대답해.

반드시 아래 JSON 형식만 출력해 (마크다운 코드블록 없이):
{
  "itemCategory": "normal",
  "vendors": [
    {"name":"상호명","type":"cheap",   "unitCost":15000,"qualityScore":70, "description":"한 줄 설명"},
    {"name":"상호명","type":"standard","unitCost":35000,"qualityScore":120,"description":"한 줄 설명"},
    {"name":"상호명","type":"premium", "unitCost":80000,"qualityScore":170,"description":"한 줄 설명"}
  ]
}`;

  if (!DEEPSEEK_CONFIG.apiKey) {
    throw new Error('VITE_DEEPSEEK_API_KEY is not set');
  }

  const res = await fetch(DEEPSEEK_CONFIG.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a data assistant. Return only valid JSON without markdown fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
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
