const http = require('http');
const { URL } = require('url');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8'
  });

  if (error) {
    res.end(`OAuth error: ${error}`);
    return;
  }

  if (!code) {
    res.end('No authorization code received.');
    return;
  }

  console.log('Authorization code received.');
  console.log(code);

  res.end(
    'HubSpot OAuth authorization successful. You can close this page.'
  );
});

server.listen(3000, () => {
  console.log(
    'OAuth callback server listening on http://localhost:3000'
  );
});