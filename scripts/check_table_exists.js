import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production.local") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing env vars!");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // Query list of tables or try querying family_shares
  console.log("Querying family_shares table...");
  const { data, error } = await supabase.from("family_shares").select("*").limit(1);
  if (error) {
    console.error("Query to family_shares failed:", error);
  } else {
    console.log("Query to family_shares succeeded! Data:", data);
  }

  // Also query classification_events to see if notes, posture, belief_state columns exist
  console.log("Querying classification_events table...");
  const { data: events, error: eventsError } = await supabase.from("classification_events").select("notes, posture, belief_state").limit(1);
  if (eventsError) {
    console.error("Querying new columns in classification_events failed:", eventsError);
  } else {
    console.log("Querying new columns in classification_events succeeded! Data:", events);
  }
}

main();
