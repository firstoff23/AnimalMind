import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, "mcp-publish-output.txt");
fs.writeFileSync(logFile, "=== STARTING WORKFLOW PUBLISH ===\n");

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, `${msg}\n`);
}

async function run() {
  const url = "https://animalmind-n8n.fly.dev/mcp-server/http";
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYmNhOWRkZC0yYzhmLTQ2N2UtOTlkZi05M2QyNjY4NmJiNTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImI0MzdkMGE1LTY5OTEtNDcwOS05MmJjLWUyZTMwMzk3YzFmMiIsImlhdCI6MTc4MDM1MTc2MH0.-kqicO1cNkKTFgPR7Cnli81QCGduarUOFddU9mys45c";

  // Step 1: Send POST initialize
  log(`[Step 1] Sending POST initialize...`);
  try {
    const initRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "animalmind-client",
            version: "1.0.0",
          },
        },
        id: 1,
      }),
    });

    const _initText = await initRes.text();
    log(`[Step 1] Status: ${initRes.status}`);

    // Step 2: Send POST tools/call for publish_workflow
    log(`\n[Step 2] Sending POST tools/call for publish_workflow...`);
    const callRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "publish_workflow",
          arguments: {
            workflowId: "0OoyE17cKT2GmgEf",
          },
        },
        id: 2,
      }),
    });

    log(`[Step 2] Status: ${callRes.status}`);
    const callText = await callRes.text();
    log(`[Step 2] Body: ${callText}`);
  } catch (err) {
    log(`Error: ${err.stack || err}`);
  }
}

run();
