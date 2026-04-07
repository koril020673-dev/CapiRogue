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
    const prompt = body.prompt || '';

    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }

    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
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

    const data = await dsRes.json();
    if (!dsRes.ok) {
      res.status(dsRes.status).json({ error: data?.error?.message || 'DeepSeek request failed' });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
