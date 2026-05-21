import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  try {
    console.log("🌱 Seeding Supabase...");

    // 1. Create demo user
    console.log("📝 Creating demo user...");
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          open_id: "demo-user-001",
          name: "Demo User",
          email: "demo@animalmind.local",
          login_method: "demo",
          role: "user",
        },
      ])
      .select()
      .single();

    if (userError) {
      console.warn("⚠️  User already exists or error:", userError.message);
    } else {
      console.log("✅ Demo user created:", userData.id);
    }

    // Get demo user ID
    const { data: demoUser } = await supabase
      .from("users")
      .select("id")
      .eq("open_id", "demo-user-001")
      .single();

    if (!demoUser) {
      console.error("❌ Failed to get demo user");
      process.exit(1);
    }

    const userId = demoUser.id;
    console.log("📌 Using user ID:", userId);

    // 2. Create demo animals
    console.log("🐾 Creating demo animals...");
    const { data: animalsData, error: animalsError } = await supabase
      .from("animals")
      .insert([
        {
          user_id: userId,
          name: "Bobi",
          species: "dog",
          breed: "Labrador",
          age: 3,
          is_active: true,
        },
        {
          user_id: userId,
          name: "Mimi",
          species: "cat",
          breed: "Persa",
          age: 5,
          is_active: false,
        },
      ])
      .select();

    if (animalsError) {
      console.warn("⚠️  Animals error:", animalsError.message);
    } else {
      console.log("✅ Demo animals created:", animalsData?.length);
    }

    // Get animal IDs
    const { data: animals } = await supabase
      .from("animals")
      .select("id, name")
      .eq("user_id", userId);

    if (!animals || animals.length < 2) {
      console.error("❌ Failed to get animals");
      process.exit(1);
    }

    const bobiId = animals.find((a) => a.name === "Bobi")?.id;
    const mimiId = animals.find((a) => a.name === "Mimi")?.id;

    console.log("📌 Bobi ID:", bobiId, "| Mimi ID:", mimiId);

    // 3. Create demo events
    console.log("📊 Creating demo classification events...");
    const states = ["relaxed", "attention", "excitement", "alert", "hunger", "distress"];
    const emojis = { relaxed: "⚪", attention: "🟡", excitement: "🟢", alert: "🔵", hunger: "🟠", distress: "🔴" };
    const models = ["yamnet", "wav2vec2", "gemini"];

    const events = [];
    const now = new Date();

    for (let i = 0; i < 15; i++) {
      const state = states[Math.floor(Math.random() * states.length)];
      const confidence = 0.6 + Math.random() * 0.4;
      const animalId = i % 2 === 0 ? bobiId : mimiId;
      const model = models[Math.floor(Math.random() * models.length)];

      const eventTime = new Date(now);
      eventTime.setHours(eventTime.getHours() - Math.floor(Math.random() * 24 * 7));

      events.push({
        user_id: userId,
        animal_id: animalId,
        state,
        confidence: Math.round(confidence * 100) / 100,
        emoji: emojis[state],
        model_used: model,
        cached: false,
        created_at: eventTime.toISOString(),
      });
    }

    const { data: eventsData, error: eventsError } = await supabase
      .from("classification_events")
      .insert(events)
      .select();

    if (eventsError) {
      console.warn("⚠️  Events error:", eventsError.message);
    } else {
      console.log("✅ Demo events created:", eventsData?.length);
    }

    // 4. Create demo settings
    console.log("⚙️  Creating demo settings...");
    const { error: settingsError } = await supabase
      .from("settings")
      .insert([
        {
          user_id: userId,
          notifications_enabled: true,
          alert_sensitivity: "medium",
        },
      ]);

    if (settingsError && !settingsError.message.includes("duplicate")) {
      console.warn("⚠️  Settings error:", settingsError.message);
    } else {
      console.log("✅ Demo settings created");
    }

    console.log("\n✨ Seeding complete!");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
