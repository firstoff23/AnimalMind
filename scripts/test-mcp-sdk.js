import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, 'mcp-sdk-output.txt');
fs.writeFileSync(logFile, '=== STARTING SDK CONNECTION ===\n');

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function run() {
  const urlString = "https://animalmind-n8n.fly.dev/mcp-server/http";
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYmNhOWRkZC0yYzhmLTQ2N2UtOTlkZi05M2QyNjY4NmJiNTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImI0MzdkMGE1LTY5OTEtNDcwOS05MmJjLWUyZTMwMzk3YzFmMiIsImlhdCI6MTc4MDM1MTc2MH0.-kqicO1cNkKTFgPR7Cnli81QCGduarUOFddU9mys45c";

  log(`Initializing SSEClientTransport for URL: ${urlString}`);
  const transport = new SSEClientTransport(new URL(urlString), {
    eventSourceInit: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const client = new Client({
    name: "animalmind-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    log("Connecting client to transport...");
    await client.connect(transport);
    log("Connected successfully!");

    log("Requesting tools list...");
    const tools = await client.listTools();
    log(`Exposed Tools: ${JSON.stringify(tools, null, 2)}`);
    
    // Check workflows and variables if any are found
    log("Closing connection...");
    await client.close();
  } catch (error) {
    log(`Error during client run: ${error.stack || error}`);
  }
}

run();
