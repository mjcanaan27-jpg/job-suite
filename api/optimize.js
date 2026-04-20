export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1600,
        messages: [
          {
            role: 'user',
            content: prompt
          },
          {
            role: 'assistant',
            content: '{'
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    const text = data.content?.find(b => b.type === 'text')?.text || '';

    // Reconstruct — we prefilled the opening brace
    const raw = '{' + text;

    // Strip any trailing backticks or extra content after the closing brace
    const lastBrace = raw.lastIndexOf('}');
    const clean = lastBrace > 0 ? raw.substring(0, lastBrace + 1) : raw;

    // Validate it parses
    try {
      JSON.parse(clean);
    } catch (parseErr) {
      return res.status(500).json({ error: 'JSON parse failed: ' + parseErr.message + ' | Raw: ' + clean.substring(0, 200) });
    }

    return res.status(200).json({ result: clean });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
