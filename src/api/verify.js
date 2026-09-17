const { kv } = require('@vercel/kv');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON' });
    }
  }

  const key = typeof body.key === 'string' ? body.key.trim().toUpperCase() : '';
  const hwid = typeof body.hwid === 'string' ? body.hwid.trim() : '';
  const mapType = typeof body.mapType === 'string' ? body.mapType.trim() : '';

  if (!key || !hwid || !mapType) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  let keys;
  try {
    const keysPath = path.join(process.cwd(), 'data', 'cheat-keys.json');
    keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Keys not configured' });
  }

  if (!keys || !Array.isArray(keys[mapType])) {
    return res.status(500).json({ success: false, error: 'Keys not configured' });
  }

  if (!keys[mapType].includes(key)) {
    return res.status(403).json({ success: false, error: 'Invalid key' });
  }

  try {
    const existing = await kv.get(`binding:${key}`);

    if (existing) {
      if (existing.hwid === hwid) {
        return res.status(200).json({ success: true, bound: true });
      }
      return res.status(403).json({
        success: false,
        error: 'Key already bound to another device',
      });
    }

    await kv.set(`binding:${key}`, {
      hwid,
      mapType,
      boundAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, bound: false });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'KV Database Error: ' + e.message });
  }
};
