import {
  boolean,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "owner", "vet", "admin"]).default("owner").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Animals ────────────────────────────────────────────────────────────────

export const animals = mysqlTable("animals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  species: mysqlEnum("species", ["dog", "cat"]).notNull(),
  breed: varchar("breed", { length: 100 }),
  age: int("age"),
  isActive: boolean("isActive").default(false).notNull(),
  baselineData: text("baseline_data"),
  dateOfBirth: varchar("date_of_birth", { length: 10 }),
  sex: mysqlEnum("sex", ["male", "female", "unknown"]).default("unknown").notNull(),
  color: text("color"),
  coat: mysqlEnum("coat", ["short", "medium", "long"]),
  photoUrl: text("photo_url"),
  microchipNumber: varchar("microchip_number", { length: 15 }),
  height: varchar("height", { length: 50 }),
  tail: varchar("tail", { length: 50 }),
  specialMarkings: text("special_markings"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Animal = typeof animals.$inferSelect;
export type InsertAnimal = typeof animals.$inferInsert;

// ─── Classification Events ───────────────────────────────────────────────────

export const classificationEvents = mysqlTable("classification_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  animalId: int("animalId"),
  state: mysqlEnum("state", [
    "distress",
    "attention",
    "excitement",
    "hunger",
    "alert",
    "relaxed",
  ]).notNull(),
  confidence: float("confidence").notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  modelUsed: varchar("modelUsed", { length: 50 }).notNull(),
  cached: boolean("cached").default(false).notNull(),
  feedback: mysqlEnum("feedback", ["correct", "incorrect"]),
  audioUrl: text("audio_url"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClassificationEvent = typeof classificationEvents.$inferSelect;
export type InsertClassificationEvent =
  typeof classificationEvents.$inferInsert;

// ─── Settings ────────────────────────────────────────────────────────────────

export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  alertSensitivity: mysqlEnum("alertSensitivity", [
    "low",
    "medium",
    "high",
  ])
    .default("medium")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;

// ─── Feedback Annotations ───────────────────────────────────────────────────

export const feedbackAnnotations = mysqlTable("feedback_annotations", {
  id: int("id").autoincrement().primaryKey(),
  animalType: mysqlEnum("animalType", ["dog", "cat"]).notNull(),
  predictedBreed: varchar("predicted_breed", { length: 100 }),
  confirmedBreed: varchar("confirmed_breed", { length: 100 }),
  predictedState: varchar("predicted_state", { length: 50 }),
  confirmedState: varchar("confirmed_state", { length: 50 }),
  confidence: float("confidence").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FeedbackAnnotation = typeof feedbackAnnotations.$inferSelect;
export type InsertFeedbackAnnotation = typeof feedbackAnnotations.$inferInsert;

// ─── Vaccinations ───────────────────────────────────────────────────────────
export const vaccinations = mysqlTable("vaccinations", {
  id: int("id").autoincrement().primaryKey(),
  animalId: int("animal_id").notNull(),
  vaccineName: varchar("vaccine_name", { length: 100 }).notNull(),
  vaccineType: mysqlEnum("vaccine_type", ["rabies", "other"]).notNull(),
  dateAdministered: varchar("date_administered", { length: 10 }).notNull(),
  batchNumber: varchar("batch_number", { length: 50 }),
  veterinarian: varchar("veterinarian", { length: 100 }),
  nextDueDate: varchar("next_due_date", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Vaccination = typeof vaccinations.$inferSelect;
export type InsertVaccination = typeof vaccinations.$inferInsert;

// ─── Dewormings ──────────────────────────────────────────────────────────────
export const dewormings = mysqlTable("dewormings", {
  id: int("id").autoincrement().primaryKey(),
  animalId: int("animal_id").notNull(),
  type: mysqlEnum("type", ["internal", "external", "both"]).notNull(),
  product: varchar("product", { length: 100 }).notNull(),
  dosage: varchar("dosage", { length: 100 }),
  dateAdministered: varchar("date_administered", { length: 10 }).notNull(),
  nextDueDate: varchar("next_due_date", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Deworming = typeof dewormings.$inferSelect;
export type InsertDeworming = typeof dewormings.$inferInsert;

// ─── Diagnostic Tests ────────────────────────────────────────────────────────
export const diagnosticTests = mysqlTable("diagnostic_tests", {
  id: int("id").autoincrement().primaryKey(),
  animalId: int("animal_id").notNull(),
  testName: varchar("test_name", { length: 100 }).notNull(),
  datePerformed: varchar("date_performed", { length: 10 }).notNull(),
  result: varchar("result", { length: 200 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DiagnosticTest = typeof diagnosticTests.$inferSelect;
export type InsertDiagnosticTest = typeof diagnosticTests.$inferInsert;

// ─── Other Treatments ────────────────────────────────────────────────────────
export const otherTreatments = mysqlTable("other_treatments", {
  id: int("id").autoincrement().primaryKey(),
  animalId: int("animal_id").notNull(),
  treatmentName: varchar("treatment_name", { length: 200 }).notNull(),
  dateAdministered: varchar("date_administered", { length: 10 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtherTreatment = typeof otherTreatments.$inferSelect;
export type InsertOtherTreatment = typeof otherTreatments.$inferInsert;

// ─── Licensing ────────────────────────────────────────────────────────────────
export const licensing = mysqlTable("licensing", {
  id: int("id").autoincrement().primaryKey(),
  animalId: int("animal_id").notNull(),
  licenseNumber: varchar("license_number", { length: 100 }).notNull(),
  issueDate: varchar("issue_date", { length: 10 }).notNull(),
  expiryDate: varchar("expiry_date", { length: 10 }),
  issuingAuthority: varchar("issuing_authority", { length: 150 }).default("Junta de Freguesia").notNull(),
  category: mysqlEnum("category", ["companion", "dangerous", "potentially_dangerous", "hunting", "guard", "other"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Licensing = typeof licensing.$inferSelect;
export type InsertLicensing = typeof licensing.$inferInsert;
