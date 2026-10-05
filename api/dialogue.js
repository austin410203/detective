// Future LLM route (spec §33). Runs server-side on Vercel so API keys never reach the browser.
// Until LLM_API_KEY is configured it returns 501 and the game uses deterministic dialogue.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.LLM_API_KEY) return res.status(501).json({ error: 'LLM not configured' });
  // TODO: build NPC prompt from req.body (persona, secrets, lies, evidence, flags, suspicion, previous)
  // and return structured JSON: { lines: string[] }. Game state stays authoritative on the client.
  return res.status(501).json({ error: 'not implemented' });
}
