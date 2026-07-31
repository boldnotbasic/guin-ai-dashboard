// Vercel dynamic API router: routes /api/:name to handlers in api-handlers/:name.js
const path = require('path');

module.exports = async function handler(req, res) {
  // Enable CORS for GET/POST by default
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Vercel provides dynamic segment as req.query.name
    const name = (req.query && req.query.name) || (req.params && req.params.name);
    if (!name) {
      return res.status(400).json({ error: 'Missing API route name' });
    }

    const handlerPath = path.join(process.cwd(), 'api-handlers', `${name}.js`);

    let handler;
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      handler = require(handlerPath);
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        return res.status(404).json({ error: `API route not found: ${name}` });
      }
      throw e;
    }

    // Delegate to the specific handler
    return handler(req, res);
  } catch (err) {
    console.error('[api/[name]] router error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
};
