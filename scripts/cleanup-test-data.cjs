const path = require("path");
const fs = require("fs");

// Load local environment files if they exist
const envFiles = [".env.local", ".env.production.local"];
envFiles.forEach((file) => {
  const envPath = path.resolve(__dirname, "..", file);
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, override: true });
  }
});

const { createClient } = require("@supabase/supabase-js");
const Redis = require("ioredis");

async function runCleanup() {
  console.log("=== INICIANDO LIMPEZA DE DADOS DE TESTE ===");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta no ambiente.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Limpeza de Utilizadores de Teste no Supabase
  let deletedUsersCount = 0;
  try {
    console.log("A obter utilizadores do Supabase Auth...");
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) throw listError;

    const testUsers = (users || []).filter((user) => {
      const email = user.email || "";
      const name = user.user_metadata?.full_name || "";
      return (
        email.includes("@ameady.com") ||
        email.includes("test-") ||
        email.includes("test_") ||
        email.includes("AUTO_TEST_") ||
        name.includes("AUTO_TEST_")
      );
    });

    console.log(`Encontrados ${testUsers.length} utilizadores de teste.`);

    for (const user of testUsers) {
      console.log(`A apagar utilizador: ${user.email} (${user.id})...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Erro ao apagar utilizador ${user.email}:`, deleteError.message);
      } else {
        deletedUsersCount++;
      }
    }
  } catch (err) {
    console.error("Erro durante a limpeza de utilizadores:", err.message);
  }

  // 2. Limpeza de Animais Autónomos Remanescentes
  let deletedAnimalsCount = 0;
  let deletedVaccinationsCount = 0;
  let deletedDewormingsCount = 0;
  let deletedTestsCount = 0;
  let deletedTreatmentsCount = 0;
  let deletedLicensingCount = 0;

  try {
    console.log("A procurar animais de teste...");
    const { data: animals, error: fetchError } = await supabase
      .from("animals")
      .select("id, name");

    if (fetchError) throw fetchError;

    const testAnimals = (animals || []).filter((animal) => {
      const name = animal.name || "";
      return (
        name.startsWith("Teste") ||
        name.startsWith("Test") ||
        name.startsWith("RLS_Test") ||
        name.startsWith("test-") ||
        name.startsWith("AUTO_TEST_")
      );
    });

    console.log(`Encontrados ${testAnimals.length} animais de teste.`);

    const testAnimalIds = testAnimals.map((a) => a.id);
    if (testAnimalIds.length > 0) {
      try {
        const { count: vCount } = await supabase.from("vaccines").select("*", { count: "exact", head: true }).in("animal_id", testAnimalIds);
        deletedVaccinationsCount = vCount || 0;
      } catch (err) {
        console.error("Erro a contar vacinas:", err.message);
      }

      try {
        const { data: records, error: rError } = await supabase.from("health_records").select("record_type").in("animal_id", testAnimalIds);
        if (!rError && records) {
          deletedDewormingsCount = records.filter(r => r.record_type === "deworming").length;
          deletedTestsCount = records.filter(r => r.record_type === "diagnostic_test").length;
          deletedTreatmentsCount = records.filter(r => r.record_type === "other_treatment").length;
          deletedLicensingCount = records.filter(r => r.record_type === "licensing").length;
        } else if (rError) {
          throw rError;
        }
      } catch (err) {
        console.error("Erro a contar registos clinicos:", err.message);
      }
    }

    for (const animal of testAnimals) {
      console.log(`A apagar animal: ${animal.name} (ID: ${animal.id})...`);
      const { error: deleteError } = await supabase
        .from("animals")
        .delete()
        .eq("id", animal.id);

      if (deleteError) {
        console.error(`Erro ao apagar animal ${animal.name}:`, deleteError.message);
      } else {
        deletedAnimalsCount++;
      }
    }
  } catch (err) {
    console.error("Erro durante a limpeza de animais:", err.message);
  }

  // 3. Limpeza de feedback_annotations de Teste
  let deletedFeedbackCount = 0;
  try {
    console.log("A apagar feedback_annotations de teste...");
    
    // We filter annotations that match test patterns in predicted_breed, confirmed_breed, predicted_state or confirmed_state
    const { data: annotations, error: fetchError } = await supabase
      .from("feedback_annotations")
      .select("id, predicted_breed, confirmed_breed, predicted_state, confirmed_state");

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

    const testAnnotations = (annotations || []).filter((ann) => {
      const pBreed = ann.predicted_breed || "";
      const cBreed = ann.confirmed_breed || "";
      const pState = ann.predicted_state || "";
      const cState = ann.confirmed_state || "";
      return (
        pBreed.includes("AUTO_TEST_") ||
        cBreed.includes("AUTO_TEST_") ||
        pState.includes("AUTO_TEST_") ||
        cState.includes("AUTO_TEST_") ||
        pBreed.startsWith("Test") ||
        cBreed.startsWith("Test")
      );
    });

    console.log(`Encontradas ${testAnnotations.length} anotações de feedback de teste.`);

    for (const ann of testAnnotations) {
      const { error: deleteError } = await supabase
        .from("feedback_annotations")
        .delete()
        .eq("id", ann.id);

      if (deleteError) {
        console.error(`Erro ao apagar anotação ID ${ann.id}:`, deleteError.message);
      } else {
        deletedFeedbackCount++;
      }
    }
  } catch (err) {
    console.error("Erro durante a limpeza de feedback_annotations:", err.message);
  }

  // 4. Limpeza do Redis
  let deletedRedisCount = 0;
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      console.log("A conectar ao Redis para limpeza de chaves...");
      const redis = new Redis(redisUrl);
      
      const patterns = ["test:*", "AUTO_TEST:*", "rls_test:*"];
      let allKeys = [];

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys && keys.length > 0) {
          allKeys = allKeys.concat(keys);
        }
      }

      // Unique keys
      allKeys = [...new Set(allKeys)];

      if (allKeys.length > 0) {
        console.log(`A apagar ${allKeys.length} chaves no Redis:`, allKeys);
        const deleted = await redis.del(...allKeys);
        deletedRedisCount = deleted || 0;
      }
      
      await redis.quit();
    } catch (err) {
      console.warn("Aviso: Falha ao ligar ou limpar chaves no Redis:", err.message);
    }
  } else {
    console.log("REDIS_URL não está configurada. Limpeza de Redis ignorada.");
  }

  console.log("\n=== RELATÓRIO DE LIMPEZA ===");
  console.log(`Utilizadores Supabase apagados: ${deletedUsersCount}`);
  console.log(`Animais Supabase apagados:      ${deletedAnimalsCount}`);
  console.log(`Vacinas apagadas (cascade):     ${deletedVaccinationsCount}`);
  console.log(`Desparasitações (cascade):      ${deletedDewormingsCount}`);
  console.log(`Testes diagnóstico (cascade):   ${deletedTestsCount}`);
  console.log(`Tratamentos (cascade):          ${deletedTreatmentsCount}`);
  console.log(`Licenciamentos (cascade):       ${deletedLicensingCount}`);
  console.log(`Anotações Supabase apagadas:    ${deletedFeedbackCount}`);
  console.log(`Redis:                          ${deletedRedisCount} chaves apagadas`);
  console.log("============================================\n");
}

runCleanup().catch((err) => {
  console.error("Erro fatal na limpeza:", err);
  process.exit(1);
});
