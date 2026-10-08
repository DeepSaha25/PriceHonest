// Vercel Serverless Function entry point for PriceHonest API
const app = require('../apps/server/dist/index.js').default || require('../apps/server/dist/index.js');

module.exports = (req, res) => {
  // Normalize req.url so Express routes (mounted at /api/...) always match correctly
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
