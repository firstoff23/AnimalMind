import { describe, expect, it, vi } from "vitest";
import { saveBreedFeedback, updateEventFeedback, saveFeedbackAnnotation, reviewFeedbackAnnotation } from "./db";

// Mock the getSupabase or direct supabase client calls
vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      update: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation(() => builder),
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

    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockImplementation(() => builder),
        update: vi.fn().mockImplementation((data) => {
          updateMock(data);
          return builder;
        }),
        upsert: vi.fn().mockImplementation((data) => {
          upsertMock(data);
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

    // Verify upsert was called for feedback_annotations
    expect(upsertMock).toHaveBeenCalledWith({
      classification_event_id: 123,
      user_id: 2,
      confirmed_state: null,
    });
  });

  it("can run save breed feedback without throwing (deprecated)", async () => {
    await expect(
      saveBreedFeedback({
        animalType: "dog",
        predictedBreed: "Labrador Retriever",
        confirmedBreed: "Labrador Retriever",
        confidence: 0.92,
      })
    ).resolves.not.toThrow();
  });

  it("can save detailed feedback annotation using saveFeedbackAnnotation helper", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient("https://example.com", "key");

    const upsertMock = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 777, classification_event_id: 123, user_id: 2, confirmed_state: "relaxed", comment: "Muito calmo" },
          error: null,
        }),
      })),
    }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      const builder: any = {
        upsert: upsertMock,
      };
      return builder;
    });

    const result = await saveFeedbackAnnotation("mock-token", 2, {
      classificationEventId: 123,
      confirmedState: "relaxed",
      comment: "Muito calmo",
    });

    expect(upsertMock).toHaveBeenCalledWith(
      {
        classification_event_id: 123,
        user_id: 2,
        confirmed_state: "relaxed",
        comment: "Muito calmo",
      },
      {
        onConflict: "classification_event_id, user_id",
      }
    );
    expect(result).toEqual({
      id: 777,
      classification_event_id: 123,
      user_id: 2,
      confirmed_state: "relaxed",
      comment: "Muito calmo",
    });
  });

  it("can review detailed feedback annotation using reviewFeedbackAnnotation helper", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient("https://example.com", "key");

    const updateMock = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 777, reviewed_by: 99 },
            error: null,
          }),
        })),
      })),
    }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      const builder: any = {
        update: updateMock,
      };
      return builder;
    });

    const result = await reviewFeedbackAnnotation("mock-token", 99, 777);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewed_by: 99,
      })
    );
    expect(result).toEqual({ id: 777, reviewed_by: 99 });
  });
});
