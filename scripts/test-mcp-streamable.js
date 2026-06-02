import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, 'mcp-streamable-output.txt');
fs.writeFileSync(logFile, '=== STARTING STREAMABLE HTTP CONNECTION ===\n');

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function run() {
  const url = "https://animalmind-n8n.fly.dev/mcp-server/http";
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYmNhOWRkZC0yYzhmLTQ2N2UtOTlkZi05M2QyNjY4NmJiNTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImI0MzdkMGE1LTY5OTEtNDcwOS05MmJjLWUyZTMwMzk3YzFmMiIsImlhdCI6MTc4MDM1MTc2MH0.-kqicO1cNkKTFgPR7Cnli81QCGduarUOFddU9mys45c";

  // Step 1: Send POST initialize
  log(`[Step 1] Sending POST initialize to ${url}...`);
  try {
    const initRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "animalmind-client",
            version: "1.0.0"
          }
        },
        id: 1
      })
    });

    log(`[Step 1] Status: ${initRes.status} ${initRes.statusText}`);
    const initText = await initRes.text();
    log(`[Step 1] Body: ${initText.slice(0, 500)}`);

    const workflowIds = [
      "EuMGsXA3nOMaS3b9", // AnimalMind - Alertas de Erros
      "alzt8Z9BNFZa7qFv", // AnimalMind - Onboarding Utilizadores
      "5PBmaYpDDOSs6s7m", // AnimalMind - Relatorio Semanal
      "0OoyE17cKT2GmgEf"  // emails
    ];

    for (const wId of workflowIds) {
      log(`\n[Step 2] Sending POST tools/call for get_workflow_details (ID: ${wId})...`);
      const callRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "get_workflow_details",
            arguments: {
              workflowId: wId
            }
          },
          id: 2
        })
      });

      log(`[Step 2 - ${wId}] Status: ${callRes.status} ${callRes.statusText}`);
      const callText = await callRes.text();
      log(`[Step 2 - ${wId}] Body: ${callText}`);
    }
  } catch (err) {
    log(`Error: ${err.stack || err}`);
  }
}

run();
