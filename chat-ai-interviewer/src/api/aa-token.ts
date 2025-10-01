import type { VercelRequest, VercelResponse } from 'vercel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' });

  const r = await fetch('https://api.assemblyai.com/v2/realtime/token', {
    method: 'POST',
    headers: { authorization: key, 'content-type': 'application/json' },
    body: JSON.stringify({ expires_in: 3600 }),
  });
  const data = await r.json();
  res.status(r.ok ? 200 : r.status).json(data);
}