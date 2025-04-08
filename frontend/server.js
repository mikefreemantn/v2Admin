const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Get port from environment variable or default to 3000
const port = process.env.PORT || 3000;

// Determine if we're in development or production mode
const dev = process.env.NODE_ENV !== 'production';

// Initialize Next.js app
const app = next({ dev });
const handle = app.getRequestHandler();

// Special handling for AWS Amplify
const isAWS = process.env.AWS_REGION || process.env.AWS_EXECUTION_ENV;

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;
      
      // Special handling for AWS Amplify routing
      if (isAWS && pathname === '/') {
        // Redirect to login page for root path
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on port ${port}`);
  });
});
