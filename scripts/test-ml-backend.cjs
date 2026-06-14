const fs = require("fs");
const path = require("path");

async function run() {
  const url = "https://firstoff-animalmind-backend.hf.space/classify";
  const filePath = path.resolve(__dirname, "../.agents/test_3s_silence.wav");

  console.log(`[test] Reading file from: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`[test] File does not exist at ${filePath}`);
    process.exit(1);
  }
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`[test] Sending POST request to ${url}...`);

  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: "audio/wav" });
  form.append("file", blob, "test_3s_silence.wav");

  try {
    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    console.log(`[test] Status: ${res.status} ${res.statusText}`);
    const json = await res.json();
    console.log("[test] Response JSON:", json);
  } catch (err) {
    console.error("[test] Request failed:", err);
  }
}

run();
