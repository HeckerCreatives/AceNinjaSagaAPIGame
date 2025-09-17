const fs = require('fs');
const path = require('path');

// Middleware to validate an x-api-key or Authorization: Bearer <key>
// Sources checked (in order): process.env.PATCHNOTES_API_KEY, keys/patchnotes_api_key.txt
module.exports = (req, res, next) => {
  const headerKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  let expectedKey = process.env.PATCHNOTES_API_KEY;
  if (!expectedKey) {
    try {
      const filePath = path.join(process.cwd(), 'keys', 'patchnotes_api_key.txt');
      if (fs.existsSync(filePath)) {
        expectedKey = fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (e) {
      // ignore file read errors
    }
  }

  if (!expectedKey) {
    // No key configured on server — fail safe and deny requests.
    console.warn('PATCHNOTES: no API key configured (PATCHNOTES_API_KEY env or keys/patchnotes_api_key.txt)');
    return res.status(500).json({ message: 'failed', data: 'Server API key not configured' });
  }

  if (!headerKey || headerKey !== expectedKey) {
    return res.status(401).json({ message: 'failed', data: 'Invalid API key' });
  }

  next();
};
