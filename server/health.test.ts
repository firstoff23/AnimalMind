import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getVaccines,
  addVaccine,
  deleteVaccine,
  getHealthRecords,
  addHealthRecord,
  deleteHealthRecord,
  verifyAnimalOwner,
  getVaccineById,
  getHealthRecordById,
} from "./db";

// Mock DB module
vi.mock("./db", () => ({
  getVaccines: vi.fn().mockResolvedValue([]),
  addVaccine: vi.fn().mockResolvedValue({ id: 10, animalId: 1, vaccineName: "Rabies" }),
  deleteVaccine: vi.fn().mockResolvedValue({ success: true }),
  getHealthRecords: vi.fn().mockResolvedValue([]),
  addHealthRecord: vi.fn().mockResolvedValue({ id: 20, animalId: 1 }),
  deleteHealthRecord: vi.fn().mockResolvedValue({ success: true }),
  getDemoUserId: vi.fn().mockResolvedValue(1),
  verifyAnimalOwner: vi.fn().mockImplementation((animalId, userId) => {
    if (animalId !== 1) {
      throw new Error("Não autorizado");
    }
    return Promise.resolve();
  }),
  getVaccineById: vi.fn().mockImplementation((id) => {
    if (id === 10) return Promise.resolve({ id: 10, animalId: 1, vaccineName: "Rabies" });
    if (id === 99) return Promise.resolve({ id: 99, animalId: 2, vaccineName: "Secret Rabies" });
    return Promise.resolve(null);
  }),
  getHealthRecordById: vi.fn().mockImplementation((id) => {
    if (id === 20) return Promise.resolve({ id: 20, animalId: 1, recordType: "deworming" });
    if (id === 99) return Promise.resolve({ id: 99, animalId: 2, recordType: "deworming" });
    return Promise.resolve(null);
  }),
}));

const dummyUser = {
  id: 1,
  openId: "demo-user-001",
  email: "demo@animalmind.local",
  name: "Demo User",
  loginMethod: "demo",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function makeCtx(user: TrpcContext["user"] = dummyUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("healthRouter security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVaccines", () => {
    it("allows access when animal owner check passes", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await caller.health.getVaccines({ animalId: 1 });
      expect(verifyAnimalOwner).toHaveBeenCalledWith(1, 1);
      expect(getVaccines).toHaveBeenCalledWith(1);
    });

    it("denies access when animal owner check fails", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.health.getVaccines({ animalId: 2 })).rejects.toThrow("Não autorizado");
    });
  });

  describe("addVaccine", () => {
    it("allows adding vaccine for owned animal", async () => {
      const caller = appRouter.createCaller(makeCtx());
      const payload = {
        animalId: 1,
        vaccineName: "Rabies Boost",
        vaccineType: "rabies" as const,
        dateAdministered: "2026-06-10",
      };
      await caller.health.addVaccine(payload);
      expect(verifyAnimalOwner).toHaveBeenCalledWith(1, 1, true);
      expect(addVaccine).toHaveBeenCalledWith(payload);
    });

    it("denies adding vaccine for non-owned animal", async () => {
      const caller = appRouter.createCaller(makeCtx());
      const payload = {
        animalId: 2,
        vaccineName: "Rabies Boost",
        vaccineType: "rabies" as const,
        dateAdministered: "2026-06-10",
      };
      await expect(caller.health.addVaccine(payload)).rejects.toThrow("Não autorizado");
    });
  });

  describe("deleteVaccine", () => {
    it("allows deleting owned vaccine record", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await caller.health.deleteVaccine({ id: 10 });
      expect(getVaccineById).toHaveBeenCalledWith(10);
      expect(verifyAnimalOwner).toHaveBeenCalledWith(1, 1, true);
      expect(deleteVaccine).toHaveBeenCalledWith(10);
    });

    it("denies deleting non-owned vaccine record", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.health.deleteVaccine({ id: 99 })).rejects.toThrow("Não autorizado");
    });

    it("returns NOT_FOUND if vaccine doesn't exist", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.health.deleteVaccine({ id: 404 })).rejects.toThrow("Vacina não encontrada");
    });
  });

  describe("getHealthRecords", () => {
    it("allows access when animal owner check passes", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await caller.health.getHealthRecords({ animalId: 1 });
      expect(verifyAnimalOwner).toHaveBeenCalledWith(1, 1);
      expect(getHealthRecords).toHaveBeenCalledWith(1);
    });

    it("denies access when animal owner check fails", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.health.getHealthRecords({ animalId: 2 })).rejects.toThrow("Não autorizado");
    });
  });

  describe("addHealthRecord", () => {
    it("allows adding health record for owned animal", async () => {
      const caller = appRouter.createCaller(makeCtx());
      const payload = {
        animalId: 1,
        recordType: "deworming" as const,
        date: "2026-06-10",
      };
      await caller.health.addHealthRecord(payload);
      expect(verifyAnimalOwner).toHaveBeenCalledWith(1, 1, true);
      expect(addHealthRecord).toHaveBeenCalledWith(payload);
    });

    it("allows adding a symptom health record as notes recordType and category symptom", async () => {
      const caller = appRouter.createCaller(makeCtx());
      const payload = {
        animalId: 1,
        recordType: "notes" as const,
        date: "2026-06-10",
        product: "vomiting",
        result: "medium",
        category: "symptom",
        notes: "Ocorrência pós refeição",
      };
      await caller.health.addHealthRecord(payload);
      expect(verifyAnimalOwner).toHaveBeenCalledWith(1, 1, true);
      expect(addHealthRecord).toHaveBeenCalledWith(payload);
    });

    it("denies adding health record for non-owned animal", async () => {
      const caller = appRouter.createCaller(makeCtx());
      const payload = {
        animalId: 2,
        recordType: "deworming" as const,
        date: "2026-06-10",
      };
      await expect(caller.health.addHealthRecord(payload)).rejects.toThrow("Não autorizado");
    });
  });

  describe("deleteHealthRecord", () => {
    it("allows deleting owned health record", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await caller.health.deleteHealthRecord({ id: 20 });
      expect(getHealthRecordById).toHaveBeenCalledWith(20);
      expect(verifyAnimalOwner).toHaveBeenCalledWith(1, 1, true);
      expect(deleteHealthRecord).toHaveBeenCalledWith(20);
    });

    it("denies deleting non-owned health record", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.health.deleteHealthRecord({ id: 99 })).rejects.toThrow("Não autorizado");
    });

    it("returns NOT_FOUND if health record doesn't exist", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.health.deleteHealthRecord({ id: 404 })).rejects.toThrow("Registo de saúde não encontrado");
    });
  });
});
