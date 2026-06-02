const https = require('https');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'mcp-output.txt');
fs.writeFileSync(logFile, '=== STARTING SSE CONNECTION ===\n');

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

const url = 'https://animalmind-n8n.fly.dev/mcp-server/http';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYmNhOWRkZC0yYzhmLTQ2N2UtOTlkZi05M2QyNjY4NmJiNTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImI0MzdkMGE1LTY5OTEtNDcwOS05MmJjLWUyZTMwMzk3YzFmMiIsImlhdCI6MTc4MDM1MTc2MH0.-kqicO1cNkKTFgPR7Cnli81QCGduarUOFddU9mys45c';

const options = {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'text/event-stream'
  }
};

log(`Connecting to SSE stream at ${url}...`);
const req = https.get(url, options, (res) => {
  log(`[SSE] Status: ${res.statusCode} ${res.statusMessage}`);
  log(`[SSE] Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  res.on('data', (chunk) => {
    log(`[SSE Chunk]:\n${chunk.toString()}`);
  });
  
  res.on('end', () => {
    log(`[SSE] Stream closed`);
  });
});

req.on('error', (err) => {
  log(`[SSE Connection Error]: ${err.message}`);
});
