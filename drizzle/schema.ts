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
