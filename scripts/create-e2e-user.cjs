const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// Load local environment files if they exist
const envFiles = [".env.local", ".env.production.local"];
envFiles.forEach((file) => {
  const envPath = path.resolve(__dirname, "..", file);
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, override: true });
  }
});

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const e2eEmail = process.env.E2E_EMAIL || "e2e-test-user@animalmind.local";
  const e2ePassword = process.env.E2E_PASSWORD || "TestPassword123!";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`Ensuring E2E test user exists: ${e2eEmail}...`);

  // Check if user already exists in auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError.message);
    process.exit(1);
  }

  let user = users.find((u) => u.email === e2eEmail);

  if (!user) {
    console.log("E2E user does not exist in Auth. Creating...");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: e2eEmail,
      password: e2ePassword,
      email_confirm: true,
      user_metadata: { full_name: "E2E Test User" },
    });

    if (createError) {
      console.error("Error creating auth user:", createError.message);
      process.exit(1);
    }
    user = createData.user;
    console.log("Auth user created successfully:", user.id);
  } else {
    console.log("Auth user already exists:", user.id);
  }

  // Ensure user exists in public.users table as well
  const { data: dbUser, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("open_id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("Error checking public.users table:", selectError.message);
    process.exit(1);
  }

  if (!dbUser) {
    console.log("User missing from public.users table. Inserting...");
    const { error: insertError } = await supabase.from("users").insert({
      open_id: user.id,
      name: "E2E Test User",
      email: e2eEmail,
      login_method: "email",
      role: "owner",
    });

    if (insertError) {
      console.error("Error inserting into public.users:", insertError.message);
      process.exit(1);
    }
    console.log("Public user row inserted successfully.");
  } else {
    console.log("Public user row already exists.");
  }

  console.log("=== E2E USER PROVISIONED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
