export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { prompt } = body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  let response;
  let responseText;

  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  } catch (fetchErr) {
    return res.status(500).json({ error: 'Fetch failed: ' + fetchErr.message });
  }

  try {
    responseText = await response.text();
  } catch (textErr) {
    return res.status(500).json({ error: 'Could not read response: ' + textErr.message });
  }

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Anthropic error ' + response.status + ': ' + responseText.substring(0, 300) });
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    return res.status(500).json({ error: 'Bad JSON from Anthropic' });
  }

  const text = data.content?.find(b => b.type === 'text')?.text || '';
  if (!text) {
    return res.status(500).json({ error: 'Empty response from model' });
  }

  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result: clean })
  };
};
