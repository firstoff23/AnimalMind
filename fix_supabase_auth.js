import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production.local" });

const supabaseUrl =
  process.env.SUPABASE_URL || "https://yuzqxrmtbqlnalpjehno.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.production.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  const email = "test@animalmind.com";
  const password = "Password123!";

  console.log(`Checking if user ${email} exists...`);
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }

  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    console.log(`User ${email} already exists. Confirming email state...`);
    const { data: updateUser, error: updateError } =
      await supabase.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
      });
    if (updateError) {
      console.error("Error updating user:", updateError);
    } else {
      console.log("User email confirmed successfully!", updateUser);
    }
  } else {
    console.log(`Creating user ${email}...`);
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError) {
      console.error("Error creating user:", createError);
    } else {
      console.log("User created and email confirmed successfully!", newUser);
    }
  }
}

run().catch(console.error);
