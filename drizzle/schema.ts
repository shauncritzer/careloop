import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, float, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * CareLoop tables
 */

export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  dateOfBirth: varchar("dateOfBirth", { length: 20 }),
  baselineWeightLbs: float("baselineWeightLbs"),
  baselineSysBp: int("baselineSysBp"),
  baselineDiaBp: int("baselineDiaBp"),
  baselinePulse: int("baselinePulse"),
  baselineSpo2: int("baselineSpo2"),
  fluidLimitOz: int("fluidLimitOz"),
  sodiumLimitMg: int("sodiumLimitMg"),
  caregiverName: varchar("caregiverName", { length: 255 }),
  familyContactName: varchar("familyContactName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

export const dailyLogs = mysqlTable("daily_logs", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  logDate: varchar("logDate", { length: 10 }).notNull(), // YYYY-MM-DD
  weightLbs: float("weightLbs"),
  systolicBp: int("systolicBp"),
  diastolicBp: int("diastolicBp"),
  pulseBpm: int("pulseBpm"),
  spo2: int("spo2"),
  fluidIntakeOz: float("fluidIntakeOz"),
  sodiumMg: int("sodiumMg"),
  breathingWorse: boolean("breathingWorse").default(false).notNull(),
  swelling: boolean("swelling").default(false).notNull(),
  confusion: boolean("confusion").default(false).notNull(),
  dizziness: boolean("dizziness").default(false).notNull(),
  chestPain: boolean("chestPain").default(false).notNull(),
  missedMeds: boolean("missedMeds").default(false).notNull(),
  fallOrNearFall: boolean("fallOrNearFall").default(false).notNull(),
  poorAppetite: boolean("poorAppetite").default(false).notNull(),
  poorSleep: boolean("poorSleep").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  severity: mysqlEnum("severity", ["green", "yellow", "red"]).notNull(),
  message: text("message").notNull(),
  recommendations: text("recommendations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export const familyAccess = mysqlTable("family_access", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
  accessCode: varchar("accessCode", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FamilyAccess = typeof familyAccess.$inferSelect;
export type InsertFamilyAccess = typeof familyAccess.$inferInsert;

export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  pinHash: varchar("pinHash", { length: 128 }).notNull(),
  caregiverName: varchar("caregiverName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppSettings = typeof appSettings.$inferSelect;
