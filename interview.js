exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { prompt } = body;
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
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
    return { statusCode: 500, body: JSON.stringify({ error: 'Fetch failed: ' + fetchErr.message }) };
  }

  try {
    responseText = await response.text();
  } catch (textErr) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not read response: ' + textErr.message }) };
  }

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: 'Anthropic error ' + response.status + ': ' + responseText.substring(0, 300) })
    };
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: 'Bad JSON from Anthropic: ' + responseText.substring(0, 200) }) };
  }

  const text = data.content?.find(b => b.type === 'text')?.text || '';
  if (!text) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Empty response from model. Full response: ' + JSON.stringify(data).substring(0, 300) }) };
  }

  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result: clean })
  };
};
