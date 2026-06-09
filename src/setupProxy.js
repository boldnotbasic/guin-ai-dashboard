// Local development proxy - handles /api/* routes locally
// This allows API routes to work with `npm start` (same as Vercel deployment)
const path = require('path');
const express = require('express');

module.exports = function(app) {
  // Enable JSON body parsing for API routes (needed for POST requests)
  app.use('/api', express.json({ limit: '10mb' }));
  app.use('/api', express.urlencoded({ extended: true, limit: '10mb' }));

  // Dynamically load and serve API routes
  app.all('/api/:name', async (req, res) => {
    const handlerName = req.params.name;
    const handlerPath = path.resolve(__dirname, '..', 'api', `${handlerName}.js`);
    
    try {
      // Clear require cache for hot reloading
      delete require.cache[require.resolve(handlerPath)];
      const handler = require(handlerPath);
      await handler(req, res);
    } catch (error) {
      console.error(`API route error (${handlerName}):`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });
};
