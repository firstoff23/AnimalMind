import { describe, expect, it, vi } from "vitest";
import { updateEventFeedback, saveBreedFeedback } from "./db";

// Mock the getSupabase or direct supabase client calls
vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      update: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
        if (table === "classification_events") {
          return Promise.resolve({
            data: {
              id: 123,
              state: "distress",
              confidence: 0.95,
              animal_id: 456,
            },
            error: null,
          });
        }
        if (table === "animals") {
          return Promise.resolve({
            data: {
              id: 456,
              species: "dog",
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
    };
    return builder;
  });

  return {
    ...actual,
    createClient: vi.fn().mockReturnValue({
      from: mockFrom,
    }),
  };
});

describe("Feedback loop annotations (Supabase)", () => {
  it("can log audio classification feedback correctly", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient("https://example.com", "key");

    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockImplementation(() => builder),
        update: vi.fn().mockImplementation((data) => {
          updateMock(data);
          return builder;
        }),
        insert: vi.fn().mockImplementation((data) => {
          insertMock(data);
          return builder;
        }),
        eq: vi.fn().mockImplementation(() => builder),
        single: vi.fn().mockImplementation(() => {
          if (table === "classification_events") {
            return Promise.resolve({
              data: {
                id: 123,
                state: "distress",
                confidence: 0.95,
                animal_id: 456,
              },
              error: null,
            });
          }
          if (table === "animals") {
            return Promise.resolve({
              data: {
                id: 456,
                species: "dog",
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
      return builder;
    });

    await updateEventFeedback(123, 2, "incorrect");

    // Verify update was called for classification_events
    expect(updateMock).toHaveBeenCalledWith({ feedback: "incorrect" });

    // Verify insert was called for feedback_annotations
    expect(insertMock).toHaveBeenCalledWith([
      {
        animal_type: "dog",
        predicted_state: "distress",
        confirmed_state: null,
        confidence: 0.95,
      },
    ]);
  });

  it("can save breed feedback successfully", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient("https://example.com", "key");

    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      const builder: any = {
        insert: vi.fn().mockImplementation((data) => {
          insertMock(data);
          return builder;
        }),
      };
      return builder;
    });

    await saveBreedFeedback({
      animalType: "dog",
      predictedBreed: "Labrador Retriever",
      confirmedBreed: "Labrador Retriever",
      confidence: 0.92,
    });

    expect(insertMock).toHaveBeenCalledWith([
      {
        animal_type: "dog",
        predicted_breed: "Labrador Retriever",
        confirmed_breed: "Labrador Retriever",
        confidence: 0.92,
      },
    ]);
  });
});
