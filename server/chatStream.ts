import { createGoogle } from "@ai-sdk/google";
import { convertToModelMessages, pipeUIMessageStreamToResponse, stepCountIs, streamText, tool } from "ai";
import type { Request, Response } from "express";
import { z } from "zod";
import { authenticateExpressRequest } from "./_core/expressAuth";
import * as db from "./db";

function getStaticBreedInfo(breedName: string, species: string) {
  const query = breedName.toLowerCase().trim();

  const breedsInfo: Record<
    string,
    {
      name: string;
      origin: string;
      temperament: string;
      healthIssues: string[];
    }
  > = {
    "labrador retriever": {
      name: "Labrador Retriever",
      origin: "Canadá / Reino Unido",
      temperament:
        "Amigável, inteligente, ativo, dócil e excelente companheiro de família.",
      healthIssues: [
        "Displasia da anca e do cotovelo",
        "Obesidade",
        "Problemas oculares",
      ],
    },
    "golden retriever": {
      name: "Golden Retriever",
      origin: "Reino Unido (Escócia)",
      temperament: "Confiável, gentil, inteligente, devoto e muito brincalhão.",
      healthIssues: [
        "Displasia da anca",
        "Problemas cardíacos",
        "Alergias de pele",
      ],
    },
    "pastor alemão": {
      name: "Pastor Alemão",
      origin: "Alemanha",
      temperament: "Leal, corajoso, atento, protetor e altamente treinável.",
      healthIssues: [
        "Displasia da anca e do cotovelo",
        "Mielopatia degenerativa",
        "Torção gástrica",
      ],
    },
    "german shepherd": {
      name: "Pastor Alemão (German Shepherd)",
      origin: "Alemanha",
      temperament: "Leal, corajoso, atento, protetor e altamente treinável.",
      healthIssues: [
        "Displasia da anca e do cotovelo",
        "Mielopatia degenerativa",
        "Torção gástrica",
      ],
    },
    "bulldog francês": {
      name: "Bulldog Francês",
      origin: "França",
      temperament:
        "Afetuoso, sociável, brincalhão, calmo e excelente para apartamentos.",
      healthIssues: [
        "Síndrome respiratória braquicefálica",
        "Problemas de coluna",
        "Dermatites",
      ],
    },
    "french bulldog": {
      name: "Bulldog Francês (French Bulldog)",
      origin: "França",
      temperament:
        "Afetuoso, sociável, brincalhão, calmo e excelente para apartamentos.",
      healthIssues: [
        "Síndrome respiratória braquicefálica",
        "Problemas de coluna",
        "Dermatites",
      ],
    },
    "yorkshire terrier": {
      name: "Yorkshire Terrier",
      origin: "Reino Unido",
      temperament:
        "Destemido, energético, afetuoso, inteligente e independente.",
      healthIssues: [
        "Luxação da patela",
        "Problemas dentários",
        "Colapso da traqueia",
      ],
    },
    rafeiro: {
      name: "Rafeiro / Sem Raça Definida (SRD)",
      origin: "Mundial",
      temperament: "Muito adaptável, afetuoso, inteligente, leal e único.",
      healthIssues: [
        "Geralmente muito resistente, sem predisposição genética específica.",
      ],
    },
    srd: {
      name: "Sem Raça Definida (SRD)",
      origin: "Mundial",
      temperament: "Muito adaptável, afetuoso, inteligente, leal e único.",
      healthIssues: [
        "Geralmente muito resistente, sem predisposição genética específica.",
      ],
    },
    mongrel: {
      name: "Sem Raça Definida (SRD)",
      origin: "Mundial",
      temperament: "Muito adaptável, afetuoso, inteligente, leal e único.",
      healthIssues: [
        "Geralmente muito resistente, sem predisposição genética específica.",
      ],
    },
    persa: {
      name: "Persa",
      origin: "Irão (Pérsia)",
      temperament:
        "Calmo, silencioso, dócil, afetuoso e muito apegado à rotina.",
      healthIssues: [
        "Doença renal poliquística (PKD)",
        "Problemas respiratórios",
        "Problemas de lacrimejamento",
      ],
    },
    persian: {
      name: "Persa (Persian)",
      origin: "Irão (Pérsia)",
      temperament:
        "Calmo, silencioso, dócil, afetuoso e muito apegado à rotina.",
      healthIssues: [
        "Doença renal poliquística (PKD)",
        "Problemas respiratórios",
        "Problemas de lacrimejamento",
      ],
    },
    "maine coon": {
      name: "Maine Coon",
      origin: "EUA",
      temperament:
        "Gigante gentil, dócil, brincalhão, muito sociável e inteligente.",
      healthIssues: [
        "Cardiomiopatia hipertrófica (HCM)",
        "Displasia da anca",
        "Polidactilia",
      ],
    },
    siamês: {
      name: "Siamês",
      origin: "Tailândia (Sião)",
      temperament:
        "Extremamente vocal, comunicativo, inteligente, ativo e carente de atenção.",
      healthIssues: [
        "Problemas respiratórios",
        "Estrabismo",
        "Sensibilidade digestiva",
      ],
    },
    siamese: {
      name: "Siamês (Siamese)",
      origin: "Tailândia (Sião)",
      temperament:
        "Extremamente vocal, comunicativo, inteligente, ativo e carente de atenção.",
      healthIssues: [
        "Problemas respiratórios",
        "Estrabismo",
        "Sensibilidade digestiva",
      ],
    },
    bengal: {
      name: "Bengal (Bengala)",
      origin: "EUA",
      temperament:
        "Muito ativo, curioso, confiante, brincalhão e com forte instinto de caçador.",
      healthIssues: [
        "Atrofia progressiva da retina",
        "Cardiomiopatia",
        "Sensibilidade intestinal",
      ],
    },
    "europeu comum": {
      name: "Europeu Comum / Gato Doméstico de Pelo Curto",
      origin: "Europa",
      temperament:
        "Equilibrado, inteligente, independente, excelente caçador e muito afetuoso.",
      healthIssues: [
        "Geralmente muito saudável, predisposto a obesidade se esterilizado.",
      ],
    },
    "domestic shorthair": {
      name: "Gato Doméstico de Pelo Curto (Europeu Comum)",
      origin: "Mundial",
      temperament:
        "Equilibrado, inteligente, independente, excelente caçador e muito afetuoso.",
      healthIssues: [
        "Geralmente muito saudável, predisposto a obesidade se esterilizado.",
      ],
    },
  };

  for (const [key, value] of Object.entries(breedsInfo)) {
    if (query.includes(key) || key.includes(query)) {
      return value;
    }
  }

  return {
    name: breedName,
    origin: "Desconhecida",
    temperament: `Um excelente ${species === "dog" ? "cão" : "gato"} de companhia.`,
    healthIssues: ["Sem problemas de saúde específicos registados."],
  };
}

export async function chatStreamHandler(req: Request, res: Response) {
  try {
    const user = await authenticateExpressRequest(req);
    if (!user) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { messages, animalId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Mensagens em falta ou inválidas" });
      return;
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error("[Mindi] GEMINI_API_KEY is not configured!");
      res.status(500).json({
        error:
          "Erro de configuração: A chave API da Gemini não está configurada.",
      });
      return;
    }

    const google = createGoogle({ apiKey });
    const model = google("gemini-2.0-flash") as any;

    // Fetch context pet
    const animal = animalId
      ? await db.getAnimalById(Number(animalId), user.id)
      : await db.getActiveAnimal(user.id);

    let systemPrompt = `És a "Mindi", uma assistente de IA empática, profissional e altamente qualificada, especializada em bem-estar, comportamento, nutrição e saúde de animais de estimação (cães e gatos).

INSTRUÇÕES DE RESPOSTA:
1. Responde sempre de forma clara, prestativa e amigável em português (Portugal).
2. Se o utilizador perguntar sobre o seu pet (como histórico de saúde, raça, vacinas ou comportamento recente), deves OBRIGATORIAMENTE chamar a ferramenta correspondente para obter dados reais.
3. Não inventes dados sobre o animal. Responde apenas com base nas informações obtidas através das ferramentas ou fornecidas no contexto. Se não existirem dados na base de dados, explica isso ao utilizador com honestidade.
4. Se o utilizador não tiver nenhum pet associado (a ferramenta getPetProfile ou o contexto indicar que não há pet ativo), pede gentilmente ao utilizador para adicionar ou selecionar o seu pet primeiro no ecrã de Perfil.
5. Sempre que fizeres recomendações de saúde ou sugerires problemas médicos graves, lembra o utilizador com empatia de que és uma assistente virtual e que a avaliação física por um médico veterinário é indispensável.

Identidade do Tutor Atual:
- Nome: ${user.name}
`;

    if (animal) {
      systemPrompt += `\nPet Ativo Atualmente:
- Nome: ${animal.name}
- Espécie: ${animal.species === "dog" ? "cão" : animal.species === "cat" ? "gato" : animal.species}
- Raça: ${animal.breed || "Sem raça definida"}
- Idade: ${animal.age !== null ? `${animal.age} anos` : "Desconhecida"}
- Peso: ${animal.weight !== null ? `${animal.weight} kg` : "Desconhecido"}
`;
    }

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        getPetProfile: tool({
          description:
            "Busca o perfil completo do pet ativo do utilizador no Supabase (raça, idade, peso, espécie, nome)",
          inputSchema: z.object({}),
          execute: async () => {
            const pet = animal || (await db.getActiveAnimal(user.id));
            if (!pet) {
              return {
                error:
                  "Nenhum pet ativo encontrado. Por favor, diz ao utilizador para adicionar ou selecionar um pet no ecrã de Perfil.",
              };
            }
            return {
              id: pet.id,
              name: pet.name,
              species:
                pet.species === "dog"
                  ? "cão"
                  : pet.species === "cat"
                    ? "gato"
                    : pet.species,
              breed: pet.breed || "Sem raça definida",
              age: pet.age !== null ? `${pet.age} anos` : "Idade desconhecida",
              weight:
                pet.weight !== null ? `${pet.weight} kg` : "Peso desconhecido",
            };
          },
        }),
        getRecentEvents: tool({
          description:
            "Busca os últimos 10 eventos de classificação comportamental/emocional do pet ativo (ex: feliz, stressado, vocalizando)",
          inputSchema: z.object({}),
          execute: async () => {
            const pet = animal || (await db.getActiveAnimal(user.id));
            if (!pet) return { error: "Nenhum pet ativo." };
            const eventsRes = await db.getEventsForAnimalPaginated(
              pet.id,
              user.id,
              1,
              10,
            );
            return {
              petName: pet.name,
              eventsCount: eventsRes.total,
              events: (eventsRes.events || [])
                .filter((e: any) => e !== null && e !== undefined)
                .map((e: any) => ({
                  id: e.id,
                  state: e.state,
                  confidence: `${(Number(e.confidence) * 100).toFixed(1)}%`,
                  emoji: e.emoji || "",
                  createdAt: e.created_at || e.createdAt || null,
                })),
            };
          },
        }),
        getHealthRecords: tool({
          description:
            "Busca o boletim de saúde completo do pet ativo, incluindo vacinas, desparasitações e tratamentos clínicos",
          inputSchema: z.object({}),
          execute: async () => {
            const pet = animal || (await db.getActiveAnimal(user.id));
            if (!pet) return { error: "Nenhum pet ativo." };
            const vaccinations = (await db.getVaccinations(pet.id)).filter(
              (v): v is NonNullable<typeof v> => v !== null && v !== undefined,
            );
            const dewormings = (await db.getDewormings(pet.id)).filter(
              (d): d is NonNullable<typeof d> => d !== null && d !== undefined,
            );
            const records = (await db.getHealthRecords(pet.id)).filter(
              (c): c is NonNullable<typeof c> => c !== null && c !== undefined,
            );
            return {
              vaccinations: vaccinations.map((v) => ({
                vaccineName: v.vaccineName,
                vaccineType: v.vaccineType,
                dateAdministered: v.dateAdministered,
                nextDueDate: v.nextDueDate,
              })),
              dewormings: dewormings.map((d) => ({
                type: d.type,
                dateAdministered: d.dateAdministered,
                nextDueDate: d.nextDueDate,
              })),
              clinicalRecords: records.map((c) => ({
                product: c.product,
                recordType: c.recordType,
                date: c.date,
                notes: c.notes,
                result: c.result,
                category: c.category,
              })),
            };
          },
        }),
        checkFoodSafety: tool({
          description:
            "Verifica se um ingrediente ou alimento é seguro para a espécie do pet ativo (usa a base de dados de segurança alimentar)",
          inputSchema: z.object({
            foodQuery: z
              .string()
              .describe(
                "O nome do alimento ou ingrediente a pesquisar (ex: uva, chocolate, alho)",
              ),
          }),
          execute: async ({ foodQuery }) => {
            const pet = animal || (await db.getActiveAnimal(user.id));
            const species = pet?.species || "dog";
            const results = await db.searchFoods(foodQuery, species);
            if (results.length === 0) {
              return {
                message: `Não foi encontrado nenhum registo de segurança alimentar específico para o ingrediente "${foodQuery}" em ${species === "dog" ? "cães" : "gatos"}.`,
              };
            }
            return {
              food: foodQuery,
              species: species === "dog" ? "Cão" : "Gato",
              results: results
                .filter((f: any) => f !== null && f !== undefined)
                .map((f: any) => ({
                  name: f.name,
                  safety: f.computedSeverity,
                  description: f.reason,
                  warnings: f.whatToDo,
                })),
            };
          },
        }),
        getBreedInfo: tool({
          description:
            "Busca informações detalhadas sobre as características de uma determinada raça de cão ou gato",
          inputSchema: z.object({
            breedName: z
              .string()
              .describe("O nome da raça a pesquisar (ex: Labrador, Persa)"),
          }),
          execute: async ({ breedName }) => {
            const pet = animal || (await db.getActiveAnimal(user.id));
            const species = pet?.species || "dog";
            const info = getStaticBreedInfo(breedName, species);
            return info;
          },
        }),
      },
    });

    pipeUIMessageStreamToResponse({
      stream: result.toUIMessageStream(),
      response: res,
    });
    return;
  } catch (error: any) {
    console.error("[Mindi] Chat stream handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro interno no servidor de chat." });
    }
  }
}
