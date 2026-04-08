const CACHE_TTL_MS = 10 * 60 * 1000;
const responseCache = globalThis.__deepseekCache || new Map();
globalThis.__deepseekCache = responseCache;

function buildPrompt(itemName) {
  return `유저 검색어: "${itemName}"\n아래 JSON만 출력:\n{\n  "itemCategory": "essential|normal|luxury",\n  "vendors": [\n    {"name":"상호명","type":"전략 성격","unitCost":15000,"qualityScore":70,"description":"장점/위험 한 줄"},\n    {"name":"상호명","type":"전략 성격","unitCost":35000,"qualityScore":120,"description":"장점/위험 한 줄"},\n    {"name":"상호명","type":"전략 성격","unitCost":80000,"qualityScore":170,"description":"장점/위험 한 줄"},\n    {"name":"상호명","type":"전략 성격","unitCost":42000,"qualityScore":95,"description":"장점/위험 한 줄"}\n  ]\n}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY is not set on server' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const model = body.model || 'deepseek-chat';
    const itemName = (body.itemName || '').trim();

    if (!itemName) {
      res.status(400).json({ error: 'itemName is required' });
      return;
    }

    const cacheKey = `${model}:${itemName.toLowerCase()}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      res.status(200).json(cached.data);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let dsRes;
    try {
      dsRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Return only valid JSON without markdown fences.',
            },
            {
              role: 'user',
              content: buildPrompt(itemName),
            },
          ],
          temperature: 0.3,
          max_tokens: 280,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await dsRes.json();
    if (!dsRes.ok) {
      res.status(dsRes.status).json({ error: data?.error?.message || 'DeepSeek request failed' });
      return;
    }

    responseCache.set(cacheKey, { ts: Date.now(), data });

    res.status(200).json(data);
  } catch (err) {
    if (err?.name === 'AbortError') {
      res.status(504).json({ error: 'DeepSeek timeout' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
